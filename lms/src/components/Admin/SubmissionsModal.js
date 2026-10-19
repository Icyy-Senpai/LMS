import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Table, Tag, Button, Popconfirm, Typography, message } from 'antd';
import { DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError } from './adminUtils';

const { Text } = Typography;

/**
 * View / delete the submissions of one assignment.
 * Admins cannot grade: setting a grade, feedback or cheating flag is a Teacher / Dean feature.
 */
export default function SubmissionsModal({ open, assignment, onClose, onChanged }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(false);

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
      <Popconfirm title="Delete this submission? The student can resubmit." onConfirm={() => remove(r._id)} okText="Delete" cancelText="Cancel">
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    ) }
  ];

  return (
    <Modal title={`Submissions: ${assignment?.title || ''}`} open={open} onCancel={onClose} footer={<Button type="primary" onClick={onClose}>Close</Button>} width={850} destroyOnHidden>
      <Text type="secondary">Grades are set by the course instructor (a teacher or dean). Admins can view and remove submissions only.</Text>
      <Table style={{ marginTop: 12 }} size="small" rowKey="_id" loading={loading} dataSource={subs} columns={columns} locale={{ emptyText: 'No submissions yet.' }} pagination={{ pageSize: 8 }} />
    </Modal>
  );
}
