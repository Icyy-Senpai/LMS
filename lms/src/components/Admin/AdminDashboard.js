import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Card, Typography, Row, Col, Table, Tag, Statistic, Space, Popconfirm, message, Spin } from 'antd';
import { DashboardOutlined, TeamOutlined, BookOutlined, SafetyOutlined, LogoutOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [collapsed, setCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({ users: 0, courses: 0, forums: 0 });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [forums, setForums] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) setStats(res.data.stats);
    } catch (e) {}
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setUsers(res.data.users);
    } catch (error) { message.error('Failed to load users.'); }
    setLoading(false);
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/courses');
      if (res.data.success) setCourses(res.data.courses);
    } catch (error) { message.error('Failed to load courses.'); }
    setLoading(false);
  };

  const fetchForums = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/forums');
      if (res.data.success) setForums(res.data.forums);
    } catch (error) { message.error('Failed to load forums.'); }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'courses') fetchCourses();
    if (activeTab === 'moderation') fetchForums();
  }, [activeTab]);

  const handleDeleteUser = async (id, type) => {
    try {
      await api.delete(`/admin/users/${type}/${id}`);
      message.success(`${type} deleted permanently.`);
      fetchUsers();
    } catch (err) { message.error('Failed to delete user.'); }
  };

  const handleDeleteCourse = async (code) => {
    try {
      await api.delete(`/admin/courses/${code}`);
      message.success(`Course ${code} and all associated data scrubbed from database.`);
      fetchCourses();
    } catch (err) { message.error('Failed to delete course.'); }
  };

  const handleDeleteForum = async (id) => {
    try {
      await api.delete(`/admin/forums/${id}`);
      message.success(`Forum thread deleted.`);
      fetchForums();
    } catch (err) { message.error('Failed to delete forum thread.'); }
  };

  const userColumns = [
    { title: 'System ID', dataIndex: 'schoolId', key: 'schoolId' },
    { title: 'Full Name', key: 'name', render: (_, r) => `${r.firstName} ${r.lastName}` },
    { title: 'Role', dataIndex: 'accountType', key: 'accountType', render: role => <Tag color={role === 'Teacher' ? 'blue' : 'green'}>{role}</Tag> },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Popconfirm title="Permanently delete this user?" onConfirm={() => handleDeleteUser(r._id, r.accountType)} okText="Delete" cancelText="Cancel">
        <Button size="small" danger icon={<DeleteOutlined />}>Delete User</Button>
      </Popconfirm>
    )}
  ];

  const courseColumns = [
    { title: 'Course Code', dataIndex: 'code', key: 'code', render: code => <Text strong>{code}</Text> },
    { title: 'Course Name', dataIndex: 'name', key: 'name' },
    { title: 'Instructor', dataIndex: 'instructor', key: 'instructor' },
    { title: 'Target', key: 'target', render: (_, r) => `${r.targetProgram} - ${r.targetYear}` },
    { title: 'Danger Zone', key: 'action', render: (_, r) => (
        <Popconfirm title={`Wipe course ${r.code} and ALL assignments/quizzes?`} onConfirm={() => handleDeleteCourse(r.code)} okText="Nuke Course" cancelText="Cancel">
            <Button size="small" danger type="primary" icon={<DeleteOutlined />}>Wipe Data</Button>
        </Popconfirm>
    )}
  ];

  const forumColumns = [
    { title: 'Course', dataIndex: 'courseCode', key: 'courseCode', render: c => <Tag color="purple">{c}</Tag> },
    { title: 'Thread Title', dataIndex: 'title', key: 'title' },
    { title: 'Author', dataIndex: 'author', key: 'author' },
    { title: 'Metrics', key: 'metrics', render: (_, r) => <Space><Tag>{r.upvotes} Upvotes</Tag><Tag>{r.replies?.length || 0} Replies</Tag></Space> },
    { title: 'Moderation', key: 'action', render: (_, r) => (
        <Popconfirm title="Delete this thread entirely?" onConfirm={() => handleDeleteForum(r._id)} okText="Delete" cancelText="Cancel">
            <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
        </Popconfirm>
    )}
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
            { key: 'moderation', icon: <SafetyOutlined />, label: 'Global Moderation' },
        ]} />
        <div style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center' }}>
          <Button type="text" danger icon={<LogoutOutlined />} onClick={onLogout} style={{ color: '#ff4d4f' }}>
            {!collapsed && 'Logout Admin'}
          </Button>
        </div>
      </Sider>
      
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <Title level={4} style={{ margin: 0 }}>System Administration - God Mode</Title>
        </Header>
        <Content style={{ margin: '24px', overflow: 'initial' }}>
          
          {activeTab === 'analytics' && (
            <div>
              <Title level={4}>Platform Health & Statistics</Title>
              <Row gutter={[16, 16]}>
                <Col span={8}><Card><Statistic title="Total Registered Users" value={stats.users} prefix={<TeamOutlined style={{color: '#1890ff'}}/>} /></Card></Col>
                <Col span={8}><Card><Statistic title="Total Active Courses" value={stats.courses} prefix={<BookOutlined style={{color: '#52c41a'}}/>} /></Card></Col>
                <Col span={8}><Card><Statistic title="Total Forum Threads" value={stats.forums} prefix={<SafetyOutlined style={{color: '#722ed1'}}/>} /></Card></Col>
              </Row>
            </div>
          )}

          {activeTab === 'users' && (
            <Card title="User Database Management" bordered={false}>
              <Table dataSource={users} columns={userColumns} rowKey="_id" loading={loading} />
            </Card>
          )}

          {activeTab === 'courses' && (
            <Card title="Course Database Management" bordered={false}>
              <Table dataSource={courses} columns={courseColumns} rowKey="_id" loading={loading} locale={{ emptyText: 'No courses in database.' }} />
            </Card>
          )}

          {activeTab === 'moderation' && (
            <Card title="Global Forum Moderation" bordered={false}>
              <Table dataSource={forums} columns={forumColumns} rowKey="_id" loading={loading} locale={{ emptyText: 'No forum threads exist.' }} />
            </Card>
          )}

        </Content>
      </Layout>
    </Layout>
  );
}