import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Popconfirm, Tag, Typography, Space, Empty, message } from 'antd';
import { CheckCircleOutlined, TrophyOutlined, SwapOutlined, StarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api';
import ReassignBlockModal from './ReassignBlockModal';
import AssignBadgeModal from './AssignBadgeModal';

const { Text } = Typography;

export default function ClassRoster({ course, block, teacher, onRosterChange }) {
  const [roster, setRoster] = useState({ enrolled: [], completed: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(null);
  const [badgeFor, setBadgeFor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/instructor/course/${encodeURIComponent(course.code)}/roster`, { params: { teacherId: teacher.schoolId, block } });
      if (res.data.success) {
        setRoster({ enrolled: res.data.enrolled, completed: res.data.completed });
        onRosterChange && onRosterChange([...res.data.enrolled, ...res.data.completed]);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to load the class roster.');
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.code, block, teacher.schoolId]);

  useEffect(() => { setSelected([]); load(); }, [load]);

  const complete = async (studentIds) => {
    setBusy(true);
    const results = await Promise.allSettled(studentIds.map(studentId =>
      api.post('/instructor/course/complete', { teacherId: teacher.schoolId, studentId, courseCode: course.code })
    ));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const firstFailure = results.find(r => r.status === 'rejected');
    if (ok) message.success(`${ok} student${ok > 1 ? 's' : ''} marked as completed.`);
    if (firstFailure) message.error(firstFailure.reason?.response?.data?.message || 'Some students could not be updated.');
    setSelected([]);
    setBusy(false);
    load();
  };

  const reassignBlock = async (newBlock, autoEnroll) => {
    const res = await api.put('/staff/students/block', { studentId: moving.schoolId, block: newBlock, autoEnroll });
    message.success(res.data.message);
    load();
  };

  const nameOf = (s) => `${s.lastName}, ${s.firstName}`;

  const enrolledColumns = [
    { title: 'Student', key: 'name', render: (_, s) => <Text strong>{nameOf(s)}</Text> },
    { title: 'School ID', dataIndex: 'schoolId' },
    { title: 'Year', key: 'yb', render: (_, s) => `Year ${s.yearLevel ?? '-'}` },
    { title: 'Action', key: 'action', render: (_, s) => (
      <Space>
        <Popconfirm title="Mark this course as completed?" description={`${nameOf(s)} will move ${course.code} to Completed Courses.`}
          okText="Mark Completed" cancelText="Cancel" onConfirm={() => complete([s.schoolId])}>
          <Button size="small" type="primary" icon={<CheckCircleOutlined />} disabled={busy}>Mark Completed</Button>
        </Popconfirm>
        <Button size="small" icon={<StarOutlined />} onClick={() => setBadgeFor(s)}>Assign Badge</Button>
        <Button size="small" icon={<SwapOutlined />} onClick={() => setMoving(s)}>Change Block</Button>
      </Space>
    ) }
  ];

  const completedColumns = [
    { title: 'Student', key: 'name', render: (_, s) => nameOf(s) },
    { title: 'School ID', dataIndex: 'schoolId' },
    { title: 'Completed', key: 'on', render: (_, s) => (s.completion?.completedAt ? dayjs(s.completion.completedAt).format('MMM D, YYYY') : '-') },
    { title: 'Marked by', key: 'by', render: (_, s) => s.completion?.completedBy || '-' },
    { title: 'Block', key: 'block', render: (_, s) => (
      <Space>{s.block || '-'}<Button size="small" icon={<SwapOutlined />} onClick={() => setMoving(s)}>Change</Button></Space>
    ) },
    { title: 'Action', key: 'badge', render: (_, s) => <Button size="small" icon={<StarOutlined />} onClick={() => setBadgeFor(s)}>Assign Badge</Button> }
  ];

  return (
    <Card size="small" style={{ border: '1px solid #d9d9d9' }}
      title={<span><TrophyOutlined /> Class Roster &amp; Course Completion <Tag color="blue" style={{ marginLeft: 8 }}>Block {block}</Tag></span>}
      extra={
        <Popconfirm title={`Mark ${selected.length} selected student(s) as completed?`} okText="Mark Completed" cancelText="Cancel" disabled={selected.length === 0} onConfirm={() => complete(selected)}>
          <Button type="primary" icon={<CheckCircleOutlined />} disabled={selected.length === 0} loading={busy}>Mark selected as completed ({selected.length})</Button>
        </Popconfirm>
      }>
      <Space style={{ marginBottom: 8 }}><Text strong>Registered students</Text><Tag>{roster.enrolled.length}</Tag></Space>
      <Table size="small" rowKey="schoolId" loading={loading} dataSource={roster.enrolled} columns={enrolledColumns}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        pagination={{ pageSize: 8, size: 'small', hideOnSinglePage: true }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No students of block ${block} are currently registered in this course.`} /> }} />

      <Space style={{ margin: '16px 0 8px' }}><Text strong>Completed</Text><Tag color="green">{roster.completed.length}</Tag></Space>
      <Table size="small" rowKey="schoolId" loading={loading} dataSource={roster.completed} columns={completedColumns}
        pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No students of block ${block} have completed this course yet.`} /> }} />

      <ReassignBlockModal open={Boolean(moving)} personLabel={moving ? nameOf(moving) : ''} currentBlock={moving?.block}
        onClose={() => setMoving(null)} onSubmit={reassignBlock} />
      <AssignBadgeModal open={Boolean(badgeFor)} course={course} student={badgeFor} onClose={() => setBadgeFor(null)} />
    </Card>
  );
}
