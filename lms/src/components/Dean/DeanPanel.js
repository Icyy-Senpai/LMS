import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Tabs, Table, Tag, Button, Input, Segmented, Space, Typography, Popconfirm, message } from 'antd';
import { SwapOutlined, ReadOutlined, CrownOutlined, PlusOutlined, UserAddOutlined, RollbackOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError, fullName, getUserCoursesCount } from '../Admin/adminUtils';
import ReassignBlockModal from '../Teacher/ReassignBlockModal';
import DeanUserCoursesModal from './DeanUserCoursesModal';
import BlockFormModal from './BlockFormModal';

const { Text } = Typography;

/** The Dean-only tools: reassign teachers to blocks, and reassign users with courses. */
export default function DeanPanel({ dean, onMyCoursesChanged }) {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [movingTeacher, setMovingTeacher] = useState(null);
  const [coursesUser, setCoursesUser] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [blockFormOpen, setBlockFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c, b] = await Promise.all([api.get('/dean/users'), api.get('/dean/courses'), api.get('/staff/blocks')]);
      if (u.data.success) setUsers(u.data.users);
      if (c.data.success) setCourses(c.data.courses);
      if (b.data.success) setBlocks(b.data.blocks);
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

  // Assign a course to myself (taking it over from another instructor if needed) / hand it back.
  const claim = async (code) => {
    try {
      const res = await api.post(`/dean/courses/${code}/claim`);
      if (res.data.success) { message.success(res.data.message); load(); onMyCoursesChanged && onMyCoursesChanged(); }
    } catch (err) { showError(err, 'Failed to assign the course to you.'); }
  };
  const release = async (code) => {
    try {
      const res = await api.post(`/dean/courses/${code}/release`);
      if (res.data.success) { message.success(res.data.message); load(); onMyCoursesChanged && onMyCoursesChanged(); }
    } catch (err) { showError(err, 'Failed to release the course.'); }
  };

  const blockColumns = [
    { title: 'Code', dataIndex: 'code', render: c => <Text strong>{c}</Text> },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Students', key: 'students', render: (_, b) => (b.maxAmountOfStudents ? `${b.studentCount} / ${b.maxAmountOfStudents}` : b.studentCount) },
    { title: 'Teachers', dataIndex: 'teacherCount' },
    { title: 'Status', key: 'full', render: (_, b) => (b.maxAmountOfStudents && b.studentCount >= b.maxAmountOfStudents ? <Tag color="red">Full</Tag> : <Tag color="green">Open</Tag>) }
  ];

  const myCourseColumns = [
    { title: 'Course', key: 'course', render: (_, c) => <Space><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: c.color }} /><Text strong>{c.code}</Text><Text>{c.name}</Text></Space> },
    { title: 'Target', key: 'target', render: (_, c) => `${c.targetProgram} - ${c.targetYear}` },
    { title: 'Instructor', key: 'instructor', render: (_, c) => (
      c.instructorID === dean.schoolId ? <Tag color="gold">You</Tag>
        : c.instructor && c.instructor !== 'TBA' ? c.instructor : <Text type="secondary">TBA</Text>
    ) },
    { title: 'Action', key: 'action', render: (_, c) => {
      if (c.instructorID === dean.schoolId) {
        return (
          <Popconfirm title={`Release ${c.code}?`} description="It will show as TBA until someone is assigned." okText="Release" cancelText="Cancel" onConfirm={() => release(c.code)}>
            <Button size="small" danger icon={<RollbackOutlined />}>Release</Button>
          </Popconfirm>
        );
      }
      const taken = c.instructorID && c.instructor && c.instructor !== 'TBA';
      return taken ? (
        <Popconfirm title={`Take over ${c.code}?`} description={`${c.instructor} will no longer be its instructor.`} okText="Take over" cancelText="Cancel" onConfirm={() => claim(c.code)}>
          <Button size="small" type="primary" icon={<UserAddOutlined />}>Assign to me</Button>
        </Popconfirm>
      ) : <Button size="small" type="primary" icon={<UserAddOutlined />} onClick={() => claim(c.code)}>Assign to me</Button>;
    } }
  ];

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
        { key: 'blocks', label: 'Blocks', children: (
          <>
            <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">Blocks are stored in the database. Teachers and students are assigned to them.</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setBlockFormOpen(true)}>Create Block</Button>
            </Space>
            <Table size="small" rowKey="code" loading={loading} dataSource={blocks} columns={blockColumns} pagination={{ pageSize: 10, hideOnSinglePage: true }} locale={{ emptyText: 'No blocks yet.' }} />
          </>
        ) },
        { key: 'mine', label: 'My Courses', children: (
          <>
            <Text type="secondary">Assign any course to yourself, take one over from another instructor, or release one you handle. Courses you handle appear on your Teaching Dashboard.</Text>
            <Table style={{ marginTop: 12 }} size="small" rowKey="code" loading={loading} dataSource={courses} columns={myCourseColumns} pagination={{ pageSize: 10, hideOnSinglePage: true }} locale={{ emptyText: 'No courses exist yet.' }} />
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
        currentBlock={movingTeacher?.block} studentMove={false} onClose={() => setMovingTeacher(null)} onSubmit={reassignTeacher} />
      <DeanUserCoursesModal open={Boolean(coursesUser)} user={coursesUser} courses={courses} onClose={() => setCoursesUser(null)} onChanged={() => { load(); onMyCoursesChanged && onMyCoursesChanged(); }} />
      <BlockFormModal open={blockFormOpen} onClose={() => setBlockFormOpen(false)} onCreated={load} />
    </Card>
  );
}
