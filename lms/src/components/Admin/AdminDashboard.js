import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Card, Typography, Row, Col, Table, Tag, Statistic, Space, Select, message } from 'antd';
import { 
  DashboardOutlined, TeamOutlined, BookOutlined, SafetyOutlined, 
  SettingOutlined, LogoutOutlined, DownloadOutlined, CloudUploadOutlined, WarningOutlined 
} from '@ant-design/icons';
import api from '../../api';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [collapsed, setCollapsed] = useState(true);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users');
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      message.error('Failed to load users.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async (username, role, status) => {
    try {
      const response = await api.post('/admin/users/update', { username, role, status });
      if (response.data.success) {
        message.success(`User ${username} updated successfully.`);
        fetchUsers();
      }
    } catch (error) {
      message.error('Update failed.');
    }
  };

  const handleExportCSV = () => {
    message.success("Report generation started. Downloading CSV...");
    const csvContent = "data:text/csv;charset=utf-8,Username,Role,Status\n" 
      + users.map(u => `${u.username},${u.role},${u.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "platform_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  const userColumns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Name', key: 'name', render: (_, record) => `${record.firstName} ${record.lastName}` },
    { title: 'Role', dataIndex: 'role', key: 'role', render: role => (
        <Tag color={role === 'Admin' ? 'purple' : role === 'Teacher' ? 'blue' : 'green'}>{role}</Tag>
    )},
    { title: 'Status', dataIndex: 'status', key: 'status', render: status => (
        <Tag color={status === 'Suspended' ? 'red' : 'success'}>{status || 'Active'}</Tag>
    )},
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Select defaultValue={record.role} size="small" style={{ width: 100 }} onChange={(val) => handleUpdateUser(record.username, val, record.status || 'Active')}>
          <Select.Option value="Student">Student</Select.Option>
          <Select.Option value="Teacher">Teacher</Select.Option>
          <Select.Option value="Admin">Admin</Select.Option>
        </Select>
        <Button size="small" danger={record.status === 'Active' || !record.status} type={record.status === 'Suspended' ? 'primary' : 'default'} onClick={() => handleUpdateUser(record.username, record.role, (record.status || 'Active') === 'Active' ? 'Suspended' : 'Active')}>
          {(record.status || 'Active') === 'Active' ? 'Suspend' : 'Activate'}
        </Button>
      </Space>
    )}
  ];

  const menuItems = [
    { key: 'analytics', icon: <DashboardOutlined />, label: 'Analytics' },
    { key: 'users', icon: <TeamOutlined />, label: 'User Management' },
    { key: 'courses', icon: <BookOutlined />, label: 'Course Approvals' },
    { key: 'moderation', icon: <SafetyOutlined />, label: 'Forum Moderation' },
    { key: 'system', icon: <SettingOutlined />, label: 'System Settings' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={250} collapsible collapsed={collapsed} onMouseEnter={() => setCollapsed(false)} onMouseLeave={() => setCollapsed(true)} trigger={null}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
          <Title level={4} style={{ margin: 0, color: '#fff' }}>{collapsed ? 'A' : 'Admin Panel'}</Title>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[activeTab]} onClick={(e) => setActiveTab(e.key)} items={menuItems} />
        <div style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center' }}>
          <Button type="text" danger icon={<LogoutOutlined />} onClick={onLogout} style={{ color: '#ff4d4f' }}>
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <Title level={4} style={{ margin: 0 }}>System Administration</Title>
        </Header>
        <Content style={{ margin: '24px', overflow: 'initial' }}>
          {activeTab === 'analytics' && (
            <div>
              <Title level={4}>Platform Analytics</Title>
              <Row gutter={[16, 16]}>
                <Col span={8}><Card><Statistic title="Total Registered Users" value={users.length} prefix={<TeamOutlined />} /></Card></Col>
                <Col span={8}><Card><Statistic title="Active Courses" value={6} prefix={<BookOutlined />} /></Card></Col>
                <Col span={8}><Card><Statistic title="Total Certificates Issued" value={0} prefix={<SafetyOutlined />} /></Card></Col>
              </Row>
            </div>
          )}
          {activeTab === 'users' && (
            <Card title="User Management" extra={<Button type="primary" icon={<TeamOutlined />}>Add User</Button>}>
              <Table dataSource={users} columns={userColumns} rowKey="username" loading={loading} />
            </Card>
          )}
          {activeTab === 'courses' && (
            <Card title="Course Approval Workflow">
              <Table dataSource={[]} locale={{ emptyText: 'No courses currently pending approval.' }} columns={[{ title: 'Course Name', dataIndex: 'name', key: 'name' }, { title: 'Instructor', dataIndex: 'instructor', key: 'instructor' }, { title: 'Submitted Date', dataIndex: 'date', key: 'date' }, { title: 'Action', key: 'action' }]} />
            </Card>
          )}
          {activeTab === 'moderation' && (
            <Card title="Forum Moderation Queue">
              <Table dataSource={[]} locale={{ emptyText: 'No flagged posts require moderation.' }} columns={[{ title: 'Reported Post', dataIndex: 'post', key: 'post' }, { title: 'Author', dataIndex: 'author', key: 'author' }, { title: 'Flags', dataIndex: 'flags', key: 'flags' }, { title: 'Action', key: 'action' }]} />
            </Card>
          )}
          {activeTab === 'system' && (
            <div>
              <Title level={4}>System Settings & Data</Title>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Card title="Export Reports">
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>Download CSV reports containing all user and completion data.</Text>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportCSV} block>Export Global CSV</Button>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="Database Backup">
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>Generate a manual backup of the entire MongoDB database.</Text>
                    <Button icon={<CloudUploadOutlined />} block>Run Manual Backup</Button>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card title="System Restore">
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>Restore the system from a previous state. (Admin restricted).</Text>
                    <Button danger icon={<WarningOutlined />} block>Restore from Backup</Button>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}