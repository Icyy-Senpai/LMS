import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Upload, Typography, Space, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import api from '../../api';
import { BADGE_SHAPES, loadImage, loadImageUrl, renderBadgePng } from './badgeShapes';

const { Text } = Typography;
const MAX_UPLOAD_MB = 5;

// One selectable shape tile. With an image loaded it previews the exact crop (centred, filled to the shape).
function ShapeTile({ shape, imageUrl, selected, onClick }) {
  const id = `badge-clip-${shape.key}`;
  return (
    <div onClick={onClick} title={shape.label} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      style={{ cursor: 'pointer', textAlign: 'center', padding: 6, borderRadius: 8, width: 84,
        border: selected ? '2px solid #c62828' : '2px solid #f0f0f0', background: selected ? '#fff5f5' : '#fff' }}>
      <svg viewBox="0 0 100 100" width="64" height="64" style={{ display: 'block', margin: '0 auto' }}>
        <defs><clipPath id={id}><path d={shape.path} /></clipPath></defs>
        {imageUrl
          ? <image href={imageUrl} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
          : <path d={shape.path} fill="#d9d9d9" />}
        <path d={shape.path} fill="none" stroke={selected ? '#c62828' : '#bfbfbf'} strokeWidth="2" />
      </svg>
      <Text style={{ fontSize: 11 }}>{shape.label}</Text>
    </div>
  );
}

/**
 * Create a badge for one course. The teacher uploads an image (optional) and picks a shape. With no upload, an image
 * is AI-generated from the badge name. Either way it is cropped to fill the shape and stored (as a PNG data URL)
 * together with the name, course, block and department.
 */
export default function BadgeFormModal({ open, course, onClose, onCreated }) {
  const [form] = Form.useForm();
  const [blocks, setBlocks] = useState([]);
  const [img, setImg] = useState(null);          // HTMLImageElement of the upload
  const [imgUrl, setImgUrl] = useState('');      // object/data URL used by the live previews
  const [shape, setShape] = useState('circle');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields(); setImg(null); setImgUrl(''); setShape('circle');
    api.get('/staff/blocks')
      .then(res => { if (res.data.success) setBlocks(res.data.blocks); })
      .catch(err => message.error(err?.response?.data?.message || 'Failed to load blocks.'));
  }, [open, form]);

  const onPick = async (file) => {
    if (!file.type.startsWith('image/')) { message.error('Please choose an image file.'); return Upload.LIST_IGNORE; }
    if (file.size / 1024 / 1024 > MAX_UPLOAD_MB) { message.error(`Image must be smaller than ${MAX_UPLOAD_MB}MB.`); return Upload.LIST_IGNORE; }
    try {
      const loaded = await loadImage(file);
      const reader = new FileReader();
      reader.onload = () => { setImg(loaded); setImgUrl(reader.result); };
      reader.readAsDataURL(file);
    } catch (e) { message.error(e.message); }
    return false; // never auto-upload; the image is sent with the form
  };

  const submit = async (values) => {
    setSaving(true);
    try {
      let source = img;
      if (!source) {
        // No upload: have Gemini draw one from the badge name, then crop it like an uploaded photo.
        setGenerating(true);
        const gen = await api.post('/badges/generate-image', { name: values.name, courseCode: course.code });
        source = await loadImageUrl(gen.data.photoUrl);
        setImg(source); setImgUrl(gen.data.photoUrl); // keep it, so a failed save doesn't regenerate
        setGenerating(false);
      }
      const photoUrl = renderBadgePng(source, shape);
      const res = await api.post('/badges', {
        name: values.name, block: values.block, shape, photoUrl, courseCode: course.code
      });
      if (res.data.success) { message.success(res.data.message); onCreated && onCreated(res.data.badge); onClose(); }
    } catch (err) { message.error(err?.response?.data?.message || err.message || 'Failed to create the badge.'); }
    setGenerating(false);
    setSaving(false);
  };

  return (
    <Modal title={`Create Badge: ${course?.code || ''}`} open={open} onCancel={onClose} onOk={() => form.submit()}
      okText={generating ? 'Generating image...' : 'Create Badge'} confirmLoading={saving} width={640} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item label="Badge image (optional)"
          extra="The image is cropped automatically so it fills the chosen shape. Leave it empty to have AI generate one from the badge name.">
          <Upload.Dragger accept="image/*" maxCount={1} showUploadList={false} beforeUpload={onPick} style={{ padding: 4 }}>
            {imgUrl
              ? <img src={imgUrl} alt="Selected" style={{ maxHeight: 110, maxWidth: '100%', borderRadius: 6 }} />
              : <><p className="ant-upload-drag-icon"><InboxOutlined /></p><p className="ant-upload-text">Click or drag an image here</p><p className="ant-upload-hint">or leave empty to AI-generate it</p></>}
          </Upload.Dragger>
        </Form.Item>

        <Form.Item label="Badge shape" required>
          <Space wrap size={8}>
            {BADGE_SHAPES.map(s => <ShapeTile key={s.key} shape={s} imageUrl={imgUrl} selected={shape === s.key} onClick={() => setShape(s.key)} />)}
          </Space>
        </Form.Item>

        <Form.Item name="name" label="Badge name" rules={[{ required: true, whitespace: true, message: 'Enter a badge name' }]}>
          <Input maxLength={60} placeholder="e.g. Perfect Attendance" />
        </Form.Item>
        <Space style={{ width: '100%' }} align="start" size={16}>
          <Form.Item name="block" label="Block" rules={[{ required: true, message: 'Choose a block' }]} style={{ minWidth: 220 }}>
            <Select showSearch placeholder="Select a block" optionFilterProp="label"
              options={blocks.map(b => ({ value: b.code, label: b.code }))} notFoundContent="No blocks exist yet." />
          </Form.Item>
          <div>
            <div style={{ marginBottom: 8 }}>Course / Department</div>
            <Text strong>{course?.code}</Text><br /><Text type="secondary">{course?.targetProgram || '-'}</Text>
          </div>
        </Space>
      </Form>
    </Modal>
  );
}
