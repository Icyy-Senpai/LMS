import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Upload, Typography, Space, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import api from '../../api';
import { BADGE_SHAPES, loadImage, loadImageUrl, renderBadgePng } from './badgeShapes';
import logoImage from '../../logo.png';

const { Text } = Typography;
const MAX_UPLOAD_MB = 5;

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

export default function BadgeFormModal({ open, course, block, onClose, onCreated }) {
  const [form] = Form.useForm();
  const [img, setImg] = useState(null);
  const [imgUrl, setImgUrl] = useState('');
  const [shape, setShape] = useState('circle');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields(); setImg(null); setImgUrl(''); setShape('circle');
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
    return false;
  };

  const submit = async (values) => {
    setSaving(true);
    try {
      const source = img || await loadImageUrl(logoImage);
      const photoUrl = renderBadgePng(source, shape);
      const res = await api.post('/badges', {
        name: values.name, block, shape, photoUrl, courseCode: course.code
      });
      if (res.data.success) { message.success(res.data.message); onCreated && onCreated(res.data.badge); onClose(); }
    } catch (err) { message.error(err?.response?.data?.message || err.message || 'Failed to create the badge.'); }
    setSaving(false);
  };

  return (
    <Modal title={`Create Badge: ${course?.code || ''}`} open={open} onCancel={onClose} onOk={() => form.submit()}
      okText="Create Badge" confirmLoading={saving} width={640} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item label="Badge image (optional)"
          extra="The image is cropped automatically so it fills the chosen shape. Leave it empty to use the default logo.">
          <Upload.Dragger accept="image/*" maxCount={1} showUploadList={false} beforeUpload={onPick} style={{ padding: 4 }}>
            {imgUrl
              ? <img src={imgUrl} alt="Selected" style={{ maxHeight: 110, maxWidth: '100%', borderRadius: 6 }} />
              : <><p className="ant-upload-drag-icon"><InboxOutlined /></p><p className="ant-upload-text">Click or drag an image here</p><p className="ant-upload-hint">or leave empty to use the default logo</p></>}
          </Upload.Dragger>
        </Form.Item>

        <Form.Item label="Badge shape" required>
          <Space wrap size={8}>
            {BADGE_SHAPES.map(s => <ShapeTile key={s.key} shape={s} imageUrl={imgUrl || logoImage} selected={shape === s.key} onClick={() => setShape(s.key)} />)}
          </Space>
        </Form.Item>

        <Form.Item name="name" label="Badge name" rules={[{ required: true, whitespace: true, message: 'Enter a badge name' }]}>
          <Input maxLength={60} placeholder="e.g. Perfect Attendance" />
        </Form.Item>
        <Space style={{ width: '100%' }} align="start" size={16}>
          <div style={{ minWidth: 160 }}>
            <div style={{ marginBottom: 8 }}>Block</div>
            <Text strong>{block}</Text>
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>Course / Department</div>
            <Text strong>{course?.code}</Text><br /><Text type="secondary">{course?.targetProgram || '-'}</Text>
          </div>
        </Space>
      </Form>
    </Modal>
  );
}
