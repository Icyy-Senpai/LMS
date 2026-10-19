import React, { useCallback, useEffect, useState } from 'react';
import { List, Button, Popconfirm, Modal, Form, Input, Tag, Space, Typography, Empty, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError } from './adminUtils';

const { Text, Paragraph } = Typography;

const KINDS = {
  announcements: { label: 'Announcement', fields: [{ name: 'title', label: 'Title', required: true }, { name: 'content', label: 'Content', area: true }] },
  videos: { label: 'Video', fields: [{ name: 'title', label: 'Title', required: true }, { name: 'url', label: 'Video URL', required: true }] },
  materials: { label: 'Material', fields: [{ name: 'title', label: 'Title', required: true }, { name: 'fileUrl', label: 'Link (optional)' }] }
};

/**
 * Add / edit / delete announcements, videos or material links of one course in one block (content is per block).
 * block '' = the course-wide content from before content was per block (new blocks start with a copy of it).
 */
export default function CourseContentManager({ courseCode, kind, block = '' }) {
  const cfg = KINDS[kind];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null | {} (new) | item
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/courses/${encodeURIComponent(courseCode)}/content`, { params: { block } });
      if (res.data.success) setItems(res.data.content[kind] || []);
    } catch (err) { showError(err, 'Failed to load content.'); }
    setLoading(false);
  }, [courseCode, kind, block]);

  useEffect(() => { load(); }, [load]);

  const openModal = (item) => { setEditing(item); form.resetFields(); form.setFieldsValue(item || {}); };

  const save = async (values) => {
    try {
      const base = `/admin/courses/${encodeURIComponent(courseCode)}/content/${kind}`;
      const res = editing && editing._id ? await api.put(`${base}/${editing._id}`, values, { params: { block } }) : await api.post(base, values, { params: { block } });
      if (res.data.success) { message.success(res.data.message); setEditing(null); load(); }
    } catch (err) { showError(err, 'Failed to save.'); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/courses/${encodeURIComponent(courseCode)}/content/${kind}/${id}`, { params: { block } });
      message.success('Removed.');
      load();
    } catch (err) { showError(err, 'Failed to remove.'); }
  };

  return (
    <>
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openModal({})}>Add {cfg.label}</Button>
      </div>
      <List loading={loading} dataSource={items} locale={{ emptyText: <Empty description={`No ${kind} yet`} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        renderItem={item => (
          <List.Item actions={[
            <Button key="e" size="small" icon={<EditOutlined />} onClick={() => openModal(item)}>Edit</Button>,
            <Popconfirm key="d" title={`Delete this ${cfg.label.toLowerCase()}?`} onConfirm={() => remove(item._id)} okText="Delete" cancelText="Cancel">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ]}>
            <List.Item.Meta
              title={<Space><Text strong>{item.title}</Text>{item.hasFile && <Tag color="volcano">Uploaded file: {item.fileName}</Tag>}</Space>}
              description={kind === 'announcements' ? <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>{item.content}</Paragraph> : (item.url || item.fileUrl || '')}
            />
          </List.Item>
        )} />
      <Modal title={`${editing && editing._id ? 'Edit' : 'Add'} ${cfg.label}`} open={Boolean(editing)} onCancel={() => setEditing(null)} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          {cfg.fields.map(f => (
            <Form.Item key={f.name} name={f.name} label={f.label} rules={[{ required: f.required }]}>
              {f.area ? <Input.TextArea rows={4} /> : <Input />}
            </Form.Item>
          ))}
          <Button type="primary" htmlType="submit" block>Save</Button>
        </Form>
      </Modal>
    </>
  );
}
