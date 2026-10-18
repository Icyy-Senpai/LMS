import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Menu, Button, Card, Typography, Row, Col, Table, Tag, Statistic, Space, Popconfirm, message, Input, Segmented, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined, TeamOutlined, BookOutlined, SafetyOutlined, LogoutOutlined, DeleteOutlined, EditOutlined,
  PlusOutlined, UserAddOutlined, SettingOutlined, NotificationOutlined, FileTextOutlined, UserOutlined,
  KeyOutlined, StopOutlined, CheckCircleOutlined, MoreOutlined, ReadOutlined, ApartmentOutlined
} from '@ant-design/icons';
import api from '../../api';
import { showError, fullName, getUserCoursesCount } from './adminUtils';
import UserFormModal from './UserFormModal';
import ResetPasswordModal from './ResetPasswordModal';
import UserCoursesModal from './UserCoursesModal';
import CourseFormModal from './CourseFormModal';
import CourseDetailsModal from './CourseDetailsModal';
import AssignmentsPanel from './AssignmentsPanel';
import ForumsPanel from './ForumsPanel';
import DepartmentsPanel from './DepartmentsPanel';
import BroadcastModal from './BroadcastModal';
import AdminProfileModal from './AdminProfileModal';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const ROLE_COLORS = { Student: 'green', Teacher: 'blue', Admin: 'purple' };

export default function AdminDashboard({ user, onLogout, onUpdateProfile }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [collapsed, setCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Users tab filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modal state
  const [userForm, setUserForm] = useState({ open: false, mode: 'create', user: null });
  const [resetUser, setResetUser] = useState(null);
  const [coursesUser, setCoursesUser] = useState(null);
  const [courseForm, setCourseForm] = useState({ open: false, course: null });
  const [detailsCourse, setDetailsCourse] = useState(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try { const res = await api.get('/admin/stats'); if (res.data.success) setStats(res.data.stats); } catch (e) { /* non-critical */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/users'); if (res.data.success) setUsers(res.data.users); }
    catch (err) { showError(err, 'Failed to load users.'); }
    setLoading(false);
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/courses'); if (res.data.success) setCourses(res.data.courses); }
    catch (err) { showError(err, 'Failed to load courses.'); }
    setLoading(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    try { const res = await api.get('/admin/departments'); if (res.data.success) setDepartments(res.data.departments); }
    catch (err) { showError(err, 'Failed to load departments.'); }
  }, []);

  // Users, courses and departments are needed together in several modals, so load them up front and keep them fresh
  const refreshAll = useCallback(() => { fetchStats(); fetchUsers(); fetchCourses(); fetchDepartments(); }, [fetchStats, fetchUsers, fetchCourses, fetchDepartments]);
  useEffect(() => { refreshAll(); }, [refreshAll]);
  useEffect(() => { if (activeTab === 'analytics') fetchStats(); }, [activeTab, fetchStats]);

  const teachers = useMemo(() => users.filter(u => u.accountType === 'Teacher'), [users]);
  // Department names the admin has created (legacy free-text values are auto-registered by the server)
  const programs = useMemo(() => departments.map(d => d.name), [departments]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'All' && u.accountType !== roleFilter) return false;
      if (!q) return true;
      return [fullName(u), u.schoolId, u.username, u.schoolEmail, u.email, u.department].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [users, search, roleFilter]);

  /* ---------------- handlers ---------------- */
  const handleDeleteUser = async (u) => {
    try {
      await api.delete(`/admin/users/${u.accountType}/${u._id}`);
      message.success(`${u.accountType} deleted permanently.`);
      refreshAll();
    } catch (err) { showError(err, 'Failed to delete user.'); }
  };

  const handleToggleStatus = async (u) => {
    const status = u.status === 'Suspended' ? 'Active' : 'Suspended';
    try {
      const res = await api.put('/admin/users/status', { id: u._id, accountType: u.accountType, status });
      if (res.data.success) { message.success(res.data.message); fetchUsers(); fetchStats(); }
    } catch (err) { showError(err, 'Failed to change status.'); }
  };

  const handleDeleteCourse = async (code) => {
    try {
      await api.delete(`/admin/courses/${code}`);
      message.success(`Course ${code} and all associated data deleted.`);
      refreshAll();
    } catch (err) { showError(err, 'Failed to delete course.'); }
  };

  /* ---------------- table columns ---------------- */
  const userColumns = [
    { title: 'System ID', key: 'id', render: (_, r) => r.schoolId || r.username },
    { title: 'Full Name', key: 'name', render: (_, r) => <Text strong>{fullName(r)}</Text> },
    { title: 'Role', dataIndex: 'accountType', render: role => <Tag color={ROLE_COLORS[role]}>{role}</Tag> },
    { title: 'Department', dataIndex: 'department', render: d => d || '-' },
    { title: 'Status', dataIndex: 'status', render: s => <Tag color={s === 'Suspended' ? 'red' : 'green'}>{s}</Tag> },
    { title: 'Courses', key: 'courses', render: (_, r) => r.accountType !== 'Admin' && (
      <Button size="small" icon={<ReadOutlined />} onClick={() => setCoursesUser(r)}>Manage ({getUserCoursesCount(r)})</Button>
    ) },
    { title: 'Actions', key: 'actions', render: (_, r) => {
      const isSelf = r._id === user._id;
      return (
        <Space>
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setUserForm({ open: true, mode: 'edit', user: r })}>Edit</Button>
          <Dropdown menu={{ items: [
            { key: 'pw', icon: <KeyOutlined />, label: 'Reset password', onClick: () => setResetUser(r) },
            { key: 'st', icon: r.status === 'Suspended' ? <CheckCircleOutlined /> : <StopOutlined />, label: r.status === 'Suspended' ? 'Reactivate account' : 'Suspend account', disabled: isSelf, onClick: () => handleToggleStatus(r) }
          ] }}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
          <Popconfirm title={`Permanently delete ${fullName(r)}?`} description={r.accountType === 'Student' ? 'Their submissions and notifications are deleted too.' : undefined} onConfirm={() => handleDeleteUser(r)} okText="Delete" cancelText="Cancel" disabled={isSelf}>
            <Button size="small" danger icon={<DeleteOutlined />} disabled={isSelf} />
          </Popconfirm>
        </Space>
      );
    } }
  ];

  const courseColumns = [
    { title: 'Course Code', dataIndex: 'code', render: (code, r) => <Space><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: r.color }} /><Text strong>{code}</Text></Space> },
    { title: 'Course Name', dataIndex: 'name' },
    { title: 'Instructor', dataIndex: 'instructor', render: i => (i && i !== 'TBA' ? i : <Text type="secondary">TBA</Text>) },
    { title: 'Target', key: 'target', render: (_, r) => `${r.targetProgram} - ${r.targetYear}` },
    { title: 'Enrolled', dataIndex: 'studentCount', render: n => <Tag>{n || 0} students</Tag> },
    { title: 'Actions', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" icon={<FileTextOutlined />} onClick={() => setDetailsCourse(r)}>Manage</Button>
        <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setCourseForm({ open: true, course: r })}>Edit</Button>
        <Popconfirm title={`Delete ${r.code}?`} description="Removes the course, its content, assignments, submissions, forum threads and all enrolments." onConfirm={() => handleDeleteCourse(r.code)} okText="Delete Course" cancelText="Cancel">
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ) }
  ];

  const statCards = [
    { title: 'Total Users', value: stats.users, icon: <TeamOutlined style={{ color: '#1890ff' }} />, hint: `${stats.students || 0} students · ${stats.teachers || 0} faculty · ${stats.admins || 0} admins` },
    { title: 'Courses', value: stats.courses, icon: <BookOutlined style={{ color: '#52c41a' }} /> },
    { title: 'Forum Threads', value: stats.forums, icon: <SafetyOutlined style={{ color: '#722ed1' }} /> },
    { title: 'Assignments & Quizzes', value: stats.assignments, icon: <DashboardOutlined style={{ color: '#faad14' }} />, hint: `${stats.ungraded || 0} submissions awaiting grade` }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={250} collapsible collapsed={collapsed} onMouseEnter={() => setCollapsed(false)} onMouseLeave={() => setCollapsed(true)} trigger={null}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#cf1322' }}>
          <Title level={4} style={{ margin: 0, color: '#fff' }}>{collapsed ? 'ADM' : 'Admin Override'}</Title>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[activeTab]} onClick={(e) => setActiveTab(e.key)} items={[
          { key: 'analytics', icon: <DashboardOutlined />, label: 'System Overview' },
          { key: 'users', icon: <TeamOutlined />, label: 'User Database' },
          { key: 'courses', icon: <BookOutlined />, label: 'Course Management' },
          { key: 'departments', icon: <ApartmentOutlined />, label: 'Departments' },
          { key: 'assignments', icon: <FileTextOutlined />, label: 'Assignments & Grades' },
          { key: 'moderation', icon: <SafetyOutlined />, label: 'Global Moderation' }
        ]} />
        <div style={{ position: 'absolute', bottom: 16, width: '100%', padding: collapsed ? '0 8px' : '0 16px' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#fff' }}>
              <Avatar src={user.photoUrl} icon={!user.photoUrl && <UserOutlined />} style={{ backgroundColor: '#cf1322' }} />
              <div style={{ overflow: 'hidden' }}><div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{fullName(user) || user.username}</div><div style={{ fontSize: 12, opacity: 0.7 }}>Administrator</div></div>
            </div>
          )}
          <Button type="text" icon={<SettingOutlined />} onClick={() => setProfileOpen(true)} style={{ color: '#fff', width: '100%', textAlign: collapsed ? 'center' : 'left' }}>{!collapsed && 'Settings'}</Button>
          <Button type="text" danger icon={<LogoutOutlined />} onClick={onLogout} style={{ color: '#ff4d4f', width: '100%', textAlign: collapsed ? 'center' : 'left' }}>{!collapsed && 'Logout Admin'}</Button>
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <Title level={4} style={{ margin: 0 }}>System Administration</Title>
          <Button icon={<NotificationOutlined />} onClick={() => setBroadcastOpen(true)}>Send Announcement</Button>
        </Header>

        <Content style={{ margin: 24, overflow: 'initial' }}>
          {activeTab === 'analytics' && (
            <div>
              <Title level={4}>Platform Health & Statistics</Title>
              <Row gutter={[16, 16]}>
                {statCards.map(s => (
                  <Col xs={24} sm={12} xl={6} key={s.title}>
                    <Card><Statistic title={s.title} value={s.value || 0} prefix={s.icon} />{s.hint && <Text type="secondary" style={{ fontSize: 12 }}>{s.hint}</Text>}</Card>
                  </Col>
                ))}
              </Row>
              <Title level={5} style={{ marginTop: 24 }}>Quick Actions</Title>
              <Space wrap>
                <Button type="primary" icon={<UserAddOutlined />} onClick={() => setUserForm({ open: true, mode: 'create', user: null })}>Add User</Button>
                <Button icon={<PlusOutlined />} onClick={() => setCourseForm({ open: true, course: null })}>Create Course</Button>
                <Button icon={<ApartmentOutlined />} onClick={() => setActiveTab('departments')}>Manage Departments</Button>
                <Button icon={<NotificationOutlined />} onClick={() => setBroadcastOpen(true)}>Send Announcement</Button>
                {stats.suspended > 0 && <Tag color="red">{stats.suspended} suspended account(s)</Tag>}
              </Space>
            </div>
          )}

          {activeTab === 'users' && (
            <Card title="User Database Management" extra={<Button type="primary" icon={<UserAddOutlined />} onClick={() => setUserForm({ open: true, mode: 'create', user: null })}>Add User</Button>}>
              <Space wrap style={{ marginBottom: 16 }}>
                <Input.Search allowClear placeholder="Search name, ID, email, department" style={{ width: 320 }} value={search} onChange={e => setSearch(e.target.value)} />
                <Segmented options={['All', 'Student', 'Teacher', 'Admin']} value={roleFilter} onChange={setRoleFilter} />
              </Space>
              <Table dataSource={filteredUsers} columns={userColumns} rowKey={r => `${r.accountType}-${r._id}`} loading={loading} pagination={{ pageSize: 10 }} locale={{ emptyText: 'No users match.' }} />
            </Card>
          )}

          {activeTab === 'courses' && (
            <Card title="Course Database Management" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCourseForm({ open: true, course: null })}>Create Course</Button>}>
              <Table dataSource={courses} columns={courseColumns} rowKey="_id" loading={loading} locale={{ emptyText: 'No courses in database.' }} />
            </Card>
          )}

          {activeTab === 'departments' && <DepartmentsPanel departments={departments} loading={loading} onChanged={refreshAll} />}

          {activeTab === 'assignments' && (
            <Card title="Assignments, Quizzes & Submissions"><AssignmentsPanel onChanged={fetchStats} /></Card>
          )}

          {activeTab === 'moderation' && <ForumsPanel courses={courses} onChanged={fetchStats} />}
        </Content>
      </Layout>

      <UserFormModal open={userForm.open} mode={userForm.mode} user={userForm.user} programs={programs} onClose={() => setUserForm(s => ({ ...s, open: false }))} onSaved={refreshAll} />
      <ResetPasswordModal open={Boolean(resetUser)} user={resetUser} onClose={() => setResetUser(null)} />
      <UserCoursesModal open={Boolean(coursesUser)} user={coursesUser} courses={courses} onClose={() => setCoursesUser(null)} onChanged={refreshAll} />
      <CourseFormModal open={courseForm.open} course={courseForm.course} teachers={teachers} programs={programs} onClose={() => setCourseForm(s => ({ ...s, open: false }))} onSaved={refreshAll} />
      <CourseDetailsModal open={Boolean(detailsCourse)} course={detailsCourse} allUsers={users} onClose={() => setDetailsCourse(null)} onChanged={refreshAll} />
      <BroadcastModal open={broadcastOpen} courses={courses} onClose={() => setBroadcastOpen(false)} />
      <AdminProfileModal open={profileOpen} user={user} onClose={() => setProfileOpen(false)} onUpdated={onUpdateProfile} />
    </Layout>
  );
}
