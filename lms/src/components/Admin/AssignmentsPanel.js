import React, { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Button, Popconfirm, Space, Modal, Form, Input, InputNumber, Switch, DatePicker, Typography, message } from 'antd';
import { EditOutlined, DeleteOutlined, FileSearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api';
import { showError } from './adminUtils';
import SubmissionsModal from './SubmissionsModal';

const { Text } = Typography;

/** Assignments & quizzes of a course (or of every course when courseCode is omitted). */
export default function AssignmentsPanel({ courseCode, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/assignments', { params: courseCode ? { courseCode } : {} });
      if (res.data.success) setRows(res.data.assignments);
    } catch (err) { showError(err, 'Failed to load assignments.'); }
    setLoading(false);
  }, [courseCode]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (a) => {
    setEditing(a);
    form.setFieldsValue({ title: a.title, instructions: a.instructions, maxGrade: a.maxGrade, autoClose: !!a.autoClose, deadline: a.deadline ? dayjs(a.deadline) : null });
  };

  const save = async (values) => {
    try {
      const res = await api.put(`/admin/assignments/${editing._id}`, { ...values, deadline: values.deadline ? values.deadline.toISOString() : null });
      if (res.data.success) { message.success(res.data.message); setEditing(null); load(); onChanged && onChanged(); }
    } catch (err) { showError(err, 'Failed to update.'); }
  };

  const remove = async (id) => {
    try {
      const res = await api.delete(`/admin/assignments/${id}`);
      if (res.data.success) { message.success(res.data.message); load(); onChanged && onChanged(); }
    } catch (err) { showError(err, 'Failed to delete.'); }
  };

  const columns = [
    ...(courseCode ? [] : [{ title: 'Course', dataIndex: 'courseCode', render: c => <Tag color="default">{c}</Tag> }]),
    { title: 'Title', dataIndex: 'title', render: (t, r) => <Space><Text strong>{t}</Text><Tag color={r.type === 'Quiz' ? 'purple' : 'geekblue'}>{r.type || 'Assignment'}</Tag></Space> },
    { title: 'Deadline', dataIndex: 'deadline', render: d => (d ? new Date(d).toLocaleString() : '-') },
    { title: 'Submissions', key: 'subs', render: (_, r) => <Space><Tag>{r.submissionCount} total</Tag>{r.ungradedCount > 0 && <Tag color="orange">{r.ungradedCount} ungraded</Tag>}</Space> },
    { title: 'Actions', key: 'a', render: (_, r) => (
      <Space>
        <Button size="small" icon={<FileSearchOutlined />} onClick={() => setViewing(r)}>Submissions</Button>
        <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
        <Popconfirm title="Delete this item and ALL its submissions?" onConfirm={() => remove(r._id)} okText="Delete" cancelText="Cancel">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ) }
  ];

  return (
    <>
      <Table size="small" rowKey="_id" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 8 }} locale={{ emptyText: 'No assignments or quizzes.' }} />
      <Modal title={`Edit: ${editing?.title || ''}`} open={Boolean(editing)} onCancel={() => setEditing(null)} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="instructions" label="Instructions"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="deadline" label="Deadline"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="maxGrade" label="Max Grade"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="autoClose" label="Auto-close submissions at deadline" valuePropName="checked"><Switch /></Form.Item>
          <Button type="primary" htmlType="submit" block>Save Changes</Button>
        </Form>
      </Modal>
      <SubmissionsModal open={Boolean(viewing)} assignment={viewing} onClose={() => setViewing(null)} onChanged={() => { load(); onChanged && onChanged(); }} />
    </>
  );
}

