import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Tabs, Table, Tag, Button, Input, Segmented, Space, Typography, message } from 'antd';
import { SwapOutlined, ReadOutlined, CrownOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError, fullName, getUserCoursesCount } from '../Admin/adminUtils';
import ReassignBlockModal from '../Teacher/ReassignBlockModal';
import DeanUserCoursesModal from './DeanUserCoursesModal';

const { Text } = Typography;

/** The Dean-only tools: reassign teachers to blocks, and reassign users with courses. */
export default function DeanPanel({ dean }) {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [movingTeacher, setMovingTeacher] = useState(null);
  const [coursesUser, setCoursesUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([api.get('/dean/users'), api.get('/dean/courses')]);
      if (u.data.success) setUsers(u.data.users);
      if (c.data.success) setCourses(c.data.courses);
    } catch (err) { showError(err, 'Failed to load Dean data.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const teachers = useMemo(() => users.filter(u => u.accountType === 'Teacher'), [users]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'All' && u.accountType !== roleFilter) return false;
      return !q || [fullName(u), u.schoolId, u.department, u.block].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [users, search, roleFilter]);

  const reassignTeacher = async (block) => {
    const res = await api.put('/dean/teachers/block', { teacherId: movingTeacher.schoolId, block });
    message.success(res.data.message);
    load();
  };

  const teacherColumns = [
    { title: 'Faculty ID', dataIndex: 'schoolId' },
    { title: 'Name', key: 'name', render: (_, t) => (
      <Space><Text strong>{t.lastName}, {t.firstName}</Text>{t.isDean && <Tag color="gold" icon={<CrownOutlined />}>Dean</Tag>}{t.schoolId === dean.schoolId && <Tag>You</Tag>}</Space>
    ) },
    { title: 'Department', dataIndex: 'department', render: d => d || '-' },
    { title: 'Courses', key: 'courses', render: (_, t) => getUserCoursesCount(t) },
    { title: 'Block', dataIndex: 'block', render: b => (b ? <Tag color="blue">{b}</Tag> : <Text type="secondary">Unassigned</Text>) },
    { title: 'Action', key: 'action', render: (_, t) => (
      <Button size="small" type="primary" icon={<SwapOutlined />} onClick={() => setMovingTeacher(t)}>Reassign Block</Button>
    ) }
  ];

  const userColumns = [
    { title: 'ID', dataIndex: 'schoolId' },
    { title: 'Name', key: 'name', render: (_, u) => <Text strong>{u.lastName}, {u.firstName}</Text> },
    { title: 'Role', dataIndex: 'accountType', render: r => <Tag color={r === 'Teacher' ? 'blue' : 'green'}>{r}</Tag> },
    { title: 'Department', dataIndex: 'department', render: d => d || '-' },
    { title: 'Block', dataIndex: 'block', render: b => b || '-' },
    { title: 'Courses', key: 'courses', render: (_, u) => (
      <Button size="small" icon={<ReadOutlined />} onClick={() => setCoursesUser(u)}>Manage ({getUserCoursesCount(u)})</Button>
    ) }
  ];

  return (
    <Card title="Dean's Office">
      <Tabs items={[
        { key: 'blocks', label: 'Teacher Blocks', children: (
          <>
            <Text type="secondary">Move a teacher to a different block.</Text>
            <Table style={{ marginTop: 12 }} size="small" rowKey="schoolId" loading={loading} dataSource={teachers} columns={teacherColumns} pagination={{ pageSize: 10, hideOnSinglePage: true }} />
          </>
        ) },
        { key: 'courses', label: 'Course Assignments', children: (
          <>
            <Space wrap style={{ marginBottom: 12 }}>
              <Input.Search allowClear placeholder="Search name, ID, department, block" style={{ width: 300 }} value={search} onChange={e => setSearch(e.target.value)} />
              <Segmented options={['All', 'Student', 'Teacher']} value={roleFilter} onChange={setRoleFilter} />
            </Space>
            <Table size="small" rowKey={u => `${u.accountType}-${u.schoolId}`} loading={loading} dataSource={filtered} columns={userColumns} pagination={{ pageSize: 10 }} />
          </>
        ) }
      ]} />

      <ReassignBlockModal open={Boolean(movingTeacher)} personLabel={movingTeacher ? `${movingTeacher.lastName}, ${movingTeacher.firstName}` : ''}
        currentBlock={movingTeacher?.block} onClose={() => setMovingTeacher(null)} onSubmit={reassignTeacher} />
      <DeanUserCoursesModal open={Boolean(coursesUser)} user={coursesUser} courses={courses} onClose={() => setCoursesUser(null)} onChanged={load} />
    </Card>
  );
}
