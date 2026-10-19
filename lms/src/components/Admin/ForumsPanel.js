import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Popconfirm, Space, Modal, Form, Input, Select, List, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError } from './adminUtils';

const { Text, Paragraph } = Typography;

export default function ForumsPanel({ courses, onChanged }) {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [newReply, setNewReply] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/forums');
      if (res.data.success) setForums(res.data.forums);
    } catch (err) { showError(err, 'Failed to load forums.'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const viewing = forums.find(f => f._id === viewingId);
  const replaceThread = (t) => setForums(prev => prev.map(f => (f._id === t._id ? t : f)));

  const openThreadModal = (t) => { setEditing(t); form.resetFields(); form.setFieldsValue(t); };

  const saveThread = async (values) => {
    try {
      const res = editing && editing._id ? await api.put(`/admin/forums/${editing._id}`, values) : await api.post('/admin/forums', values);
      if (res.data.success) { message.success(res.data.message); setEditing(null); load(); onChanged && onChanged(); }
    } catch (err) { showError(err, 'Failed to save thread.'); }
  };

  const deleteThread = async (id) => {
    try {
      await api.delete(`/admin/forums/${id}`);
      message.success('Forum thread deleted.');
      if (viewingId === id) setViewingId(null);
      load(); onChanged && onChanged();
    } catch (err) { showError(err, 'Failed to delete thread.'); }
  };

  const addReply = async () => {
    if (!newReply.trim()) return;
    try {
      const res = await api.post(`/admin/forums/${viewingId}/replies`, { content: newReply });
      if (res.data.success) { replaceThread(res.data.thread); setNewReply(''); }
    } catch (err) { showError(err, 'Failed to add reply.'); }
  };

  const saveReply = async (values) => {
    try {
      const res = await api.put(`/admin/forums/${viewingId}/replies/${editingReply._id}`, values);
      if (res.data.success) { replaceThread(res.data.thread); setEditingReply(null); message.success('Reply updated.'); }
    } catch (err) { showError(err, 'Failed to update reply.'); }
  };

  const deleteReply = async (replyId) => {
    try {
      const res = await api.delete(`/admin/forums/${viewingId}/replies/${replyId}`);
      if (res.data.success) { replaceThread(res.data.thread); message.success('Reply deleted.'); }
    } catch (err) { showError(err, 'Failed to delete reply.'); }
  };

  const columns = [
    { title: 'Course', dataIndex: 'courseCode', render: c => <Tag color="default">{c}</Tag> },
    { title: 'Thread Title', dataIndex: 'title' },
    { title: 'Author', dataIndex: 'author' },
    { title: 'Metrics', key: 'm', render: (_, r) => <Space><Tag>{r.upvotes} Upvotes</Tag><Tag>{r.replies?.length || 0} Replies</Tag>{r.flags > 0 && <Tag color="red">{r.flags} Flags</Tag>}</Space> },
    { title: 'Posted', dataIndex: 'createdAt', render: d => new Date(d).toLocaleDateString() },
    { title: 'Moderation', key: 'a', render: (_, r) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => setViewingId(r._id)}>View</Button>
        <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openThreadModal(r)}>Edit</Button>
        <Popconfirm title="Delete this thread entirely?" onConfirm={() => deleteThread(r._id)} okText="Delete" cancelText="Cancel"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>
    ) }
  ];

  return (
    <Card title="Global Forum Moderation" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openThreadModal({})}>New Thread</Button>}>
      <Table dataSource={forums} columns={columns} rowKey="_id" loading={loading} locale={{ emptyText: 'No forum threads exist.' }} />

      <Modal title={editing && editing._id ? 'Edit Thread' : 'Create a new post'} open={Boolean(editing)} onCancel={() => setEditing(null)} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={saveThread}>
          <Form.Item name="courseCode" label="Course" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={courses.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="Body" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Button type="primary" htmlType="submit" block>{editing && editing._id ? 'Save Changes' : 'Post to Forum'}</Button>
        </Form>
      </Modal>

      <Modal title={viewing ? `r/${viewing.courseCode}: ${viewing.title}` : 'Thread'} open={Boolean(viewing)} onCancel={() => setViewingId(null)} footer={<Button type="primary" onClick={() => setViewingId(null)}>Close</Button>} width={750} destroyOnHidden>
        {viewing && (
          <>
            <Text type="secondary">Posted by u/{viewing.author} • {new Date(viewing.createdAt).toLocaleString()}</Text>
            <Paragraph style={{ marginTop: 8 }}>{viewing.content}</Paragraph>
            <List header={<Text strong>{viewing.replies?.length || 0} Replies</Text>} dataSource={viewing.replies || []} locale={{ emptyText: 'No replies.' }} renderItem={r => (
              <List.Item actions={[
                <Button key="e" size="small" icon={<EditOutlined />} onClick={() => { setEditingReply(r); replyForm.setFieldsValue({ content: r.content }); }} />,
                <Popconfirm key="d" title="Delete this reply?" onConfirm={() => deleteReply(r._id)} okText="Delete" cancelText="Cancel"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
              ]}>
                <List.Item.Meta title={<Text type="secondary" style={{ fontSize: 12 }}>u/{r.author} • {new Date(r.createdAt).toLocaleString()}</Text>} description={r.content} />
              </List.Item>
            )} />
            <Space.Compact style={{ width: '100%', marginTop: 12 }}>
              <Input placeholder="Reply as Admin..." value={newReply} onChange={e => setNewReply(e.target.value)} onPressEnter={addReply} />
              <Button type="primary" onClick={addReply}>Reply</Button>
            </Space.Compact>
          </>
        )}
        <Modal title="Edit Reply" open={Boolean(editingReply)} onCancel={() => setEditingReply(null)} footer={null} destroyOnHidden>
          <Form form={replyForm} layout="vertical" onFinish={saveReply}>
            <Form.Item name="content" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
            <Button type="primary" htmlType="submit" block>Save</Button>
          </Form>
        </Modal>
      </Modal>
    </Card>
  );
}
