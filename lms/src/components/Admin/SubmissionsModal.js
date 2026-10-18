import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Table, Tag, Button, Popconfirm, Space, Form, Input, InputNumber, Switch, Typography, message } from 'antd';
import { EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError } from './adminUtils';

const { Text } = Typography;

/** View / override grade / delete the submissions of one assignment. */
export default function SubmissionsModal({ open, assignment, onClose, onChanged }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!assignment) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/assignments/${assignment._id}/submissions`);
      if (res.data.success) setSubs(res.data.submissions);
    } catch (err) { showError(err, 'Failed to load submissions.'); }
    setLoading(false);
  }, [assignment]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const openEdit = (s) => { setEditing(s); form.setFieldsValue({ grade: s.grade, feedback: s.feedback, cheatingFlag: !!s.cheatingFlag }); };

  const save = async (values) => {
    try {
      const res = await api.put(`/admin/submissions/${editing._id}`, values);
      if (res.data.success) { message.success(res.data.message); setEditing(null); load(); onChanged && onChanged(); }
    } catch (err) { showError(err, 'Failed to save.'); }
  };

  const remove = async (id) => {
    try {
      const res = await api.delete(`/admin/submissions/${id}`);
      if (res.data.success) { message.success(res.data.message); load(); onChanged && onChanged(); }
    } catch (err) { showError(err, 'Failed to delete.'); }
  };

  const columns = [
    { title: 'Student', dataIndex: 'studentName', render: (n, r) => <><Text strong>{n}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.studentUsername}</Text></> },
    { title: 'Submitted', dataIndex: 'submittedAt', render: d => new Date(d).toLocaleString() },
    { title: 'Grade', dataIndex: 'grade', render: g => (g === null || g === undefined ? <Tag color="orange">Ungraded</Tag> : <Text strong>{g}{assignment?.maxGrade ? ` / ${assignment.maxGrade}` : ''}</Text>) },
    { title: 'Flags', dataIndex: 'cheatingFlag', render: f => (f ? <Tag color="red" icon={<WarningOutlined />}>Cheating flag</Tag> : '-') },
    { title: 'Actions', key: 'a', render: (_, r) => (
      <Space>
        <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit Grade</Button>
        <Popconfirm title="Delete this submission? The student can resubmit." onConfirm={() => remove(r._id)} okText="Delete" cancelText="Cancel">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ) }
  ];

  return (
    <Modal title={`Submissions: ${assignment?.title || ''}`} open={open} onCancel={onClose} footer={<Button type="primary" onClick={onClose}>Close</Button>} width={850} destroyOnHidden>
      <Table size="small" rowKey="_id" loading={loading} dataSource={subs} columns={columns} locale={{ emptyText: 'No submissions yet.' }} pagination={{ pageSize: 8 }} />
      <Modal title={`Grade: ${editing?.studentName || ''}`} open={Boolean(editing)} onCancel={() => setEditing(null)} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="grade" label={`Grade${assignment?.maxGrade ? ` (max ${assignment.maxGrade})` : ''}`}><InputNumber min={0} max={assignment?.maxGrade || undefined} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="feedback" label="Feedback"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="cheatingFlag" label="Cheating flag" valuePropName="checked"><Switch /></Form.Item>
          <Button type="primary" htmlType="submit" block>Save</Button>
        </Form>
      </Modal>
    </Modal>
  );
}
