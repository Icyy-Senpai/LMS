import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Tabs, Table, Tag, Button, Input, Segmented, Space, Typography, Popconfirm, Tooltip, message } from 'antd';
import { SwapOutlined, ReadOutlined, CrownOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError, fullName, getUserCoursesCount } from '../Admin/adminUtils';
import ReassignBlockModal from '../Teacher/ReassignBlockModal';
import DeanUserCoursesModal from './DeanUserCoursesModal';
import BlockFormModal from './BlockFormModal';
import BlockManageModal from './BlockManageModal';
import AssignTeacherBlockModal from './AssignTeacherBlockModal';

const { Text } = Typography;

/**
 * The Dean-only tools: create blocks and register their subjects + professors, see each teacher's teaching load,
 * move students between blocks, and reassign users with courses.
 */
export default function DeanPanel({ dean, onMyCoursesChanged }) {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [movingStudent, setMovingStudent] = useState(null);
  const [managingBlock, setManagingBlock] = useState(null); // block code
  const [assigningTeacher, setAssigningTeacher] = useState(null);
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
  // Deans may only place teachers of their own department in blocks (the server enforces the same rule).
  const norm = (d) => String(d || '').trim().toLowerCase();
  const inMyDepartment = useCallback((t) => Boolean(norm(dean.department)) && norm(t.department) === norm(dean.department), [dean.department]);
  const myDeptTeachers = useMemo(() => teachers.filter(inMyDepartment), [teachers, inMyDepartment]);

  const unassign = async (blockCode, courseCode) => {
    try {
      const res = await api.put(`/dean/blocks/${encodeURIComponent(blockCode)}/professor`, { courseCode, teacherId: '' });
      if (res.data.success) { message.success(res.data.message); load(); onMyCoursesChanged && onMyCoursesChanged(); }
    } catch (err) { showError(err, 'Failed to unassign.'); }
  };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'All' && u.accountType !== roleFilter) return false;
      return !q || [fullName(u), u.schoolId, u.department, u.block].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [users, search, roleFilter]);

  const reassignStudent = async (block, autoEnroll) => {
    const res = await api.put('/dean/students/block', { studentId: movingStudent.schoolId, block, autoEnroll });
    message.success(res.data.message);
    load();
  };

  const blockColumns = [
    { title: 'Code', dataIndex: 'code', render: c => <Text strong>{c}</Text> },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Students', key: 'students', render: (_, b) => (b.maxAmountOfStudents ? `${b.studentCount} / ${b.maxAmountOfStudents}` : b.studentCount) },
    { title: 'Subjects & Professors', key: 'subjects', render: (_, b) => (
      b.subjects?.length ? (
        <Space size={[4, 4]} wrap>
          {b.subjects.map(s => <Tag key={s.code} color={s.professor ? 'blue' : 'default'}>{s.code}: {s.professor ? s.professor.name : 'No professor'}</Tag>)}
        </Space>
      ) : <Text type="secondary">No subjects</Text>
    ) },
    { title: 'Status', key: 'full', render: (_, b) => (b.maxAmountOfStudents && b.studentCount >= b.maxAmountOfStudents ? <Tag color="red">Full</Tag> : <Tag color="green">Open</Tag>) },
    { title: 'Action', key: 'action', render: (_, b) => <Button size="small" type="primary" icon={<SettingOutlined />} onClick={() => setManagingBlock(b.code)}>Manage</Button> }
  ];

  const teacherColumns = [
    { title: 'Faculty ID', dataIndex: 'schoolId' },
    { title: 'Name', key: 'name', render: (_, t) => (
      <Space><Text strong>{t.lastName}, {t.firstName}</Text>{t.isDean && <Tag color="gold" icon={<CrownOutlined />}>Dean</Tag>}{t.schoolId === dean.schoolId && <Tag>You</Tag>}</Space>
    ) },
    { title: 'Department', dataIndex: 'department', render: d => d || '-' },
    { title: 'Courses', key: 'courses', render: (_, t) => getUserCoursesCount(t) },
    { title: 'Teaching (block · subject)', key: 'teaching', render: (_, t) => (
      t.teaching?.length ? (
        <Space size={[4, 4]} wrap>{t.teaching.map(x => (
          <Popconfirm key={`${x.block}-${x.course}`} title={`Unassign ${t.lastName} from ${x.course} in ${x.block}?`} okText="Unassign" cancelText="Cancel"
            disabled={!inMyDepartment(t)} onConfirm={() => unassign(x.block, x.course)}>
            <Tag color="blue" style={{ cursor: inMyDepartment(t) ? 'pointer' : 'default' }}>{x.block} · {x.course}{inMyDepartment(t) ? ' ×' : ''}</Tag>
          </Popconfirm>
        ))}</Space>
      ) : <Text type="secondary">No blocks</Text>
    ) },
    { title: 'Action', key: 'action', render: (_, t) => (
      inMyDepartment(t)
        ? <Button size="small" type="primary" icon={<PlusOutlined />} disabled={t.status === 'Suspended'} onClick={() => setAssigningTeacher(t)}>Assign Block</Button>
        : <Tooltip title={`Only teachers of your department (${dean.department || 'none set'}) can be assigned by you.`}><Button size="small" icon={<PlusOutlined />} disabled>Assign Block</Button></Tooltip>
    ) }
  ];

  const userColumns = [
    { title: 'ID', dataIndex: 'schoolId' },
    { title: 'Name', key: 'name', render: (_, u) => <Text strong>{u.lastName}, {u.firstName}</Text> },
    { title: 'Role', dataIndex: 'accountType', render: r => <Tag color={r === 'Teacher' ? 'blue' : 'green'}>{r}</Tag> },
    { title: 'Department', dataIndex: 'department', render: d => d || '-' },
    { title: 'Block', key: 'block', render: (_, u) => (
      u.accountType === 'Student'
        ? <Space>{u.block ? <Tag color="blue">{u.block}</Tag> : <Text type="secondary">None</Text>}<Button size="small" icon={<SwapOutlined />} onClick={() => setMovingStudent(u)}>Change</Button></Space>
        : (u.teaching?.length ? [...new Set(u.teaching.map(x => x.block))].join(', ') : '-')
    ) },
    { title: 'Courses', key: 'courses', render: (_, u) => (
      <Button size="small" icon={<ReadOutlined />} onClick={() => setCoursesUser(u)}>Manage ({getUserCoursesCount(u)})</Button>
    ) }
  ];

  return (
    <Card title="Dean's Office">
      <Tabs items={[
        { key: 'blocks', label: 'Blocks', children: (
          <>
            <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
              <Text type="secondary">Register subjects to each block and choose who teaches each one there. A student belongs to one block; a teacher can hold many.</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setBlockFormOpen(true)}>Create Block</Button>
            </Space>
            <Table size="small" rowKey="code" loading={loading} dataSource={blocks} columns={blockColumns} pagination={{ pageSize: 10, hideOnSinglePage: true }} locale={{ emptyText: 'No blocks yet.' }} />
          </>
        ) },
        { key: 'loads', label: 'Teaching Loads', children: (
          <>
            <Text type="secondary">The blocks and subjects each teacher handles. You can assign blocks to teachers of your department ({dean.department || 'none set'}); click a tag to unassign.</Text>
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

      <ReassignBlockModal open={Boolean(movingStudent)} personLabel={movingStudent ? `${movingStudent.lastName}, ${movingStudent.firstName}` : ''}
        currentBlock={movingStudent?.block} onClose={() => setMovingStudent(null)} onSubmit={reassignStudent} />
      <BlockManageModal open={Boolean(managingBlock)} block={blocks.find(b => b.code === managingBlock)} courses={courses} teachers={myDeptTeachers} department={dean.department}
        onClose={() => setManagingBlock(null)} onChanged={() => { load(); onMyCoursesChanged && onMyCoursesChanged(); }} />
      <DeanUserCoursesModal open={Boolean(coursesUser)} user={coursesUser} courses={courses} onClose={() => setCoursesUser(null)} onChanged={() => { load(); onMyCoursesChanged && onMyCoursesChanged(); }} />
      <AssignTeacherBlockModal open={Boolean(assigningTeacher)} teacher={assigningTeacher} blocks={blocks} onClose={() => setAssigningTeacher(null)}
        onAssigned={() => { load(); onMyCoursesChanged && onMyCoursesChanged(); }} />
      <BlockFormModal open={blockFormOpen} onClose={() => setBlockFormOpen(false)} onCreated={load} />
    </Card>
  );
}
