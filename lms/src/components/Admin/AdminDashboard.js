import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Card, Typography, Row, Col, Table, Tag, Statistic, Space, Popconfirm, message, Modal, Form, Input, List, Select } from 'antd';
import { DashboardOutlined, TeamOutlined, BookOutlined, SafetyOutlined, LogoutOutlined, DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../api';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [collapsed, setCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({ users: 0, courses: 0, forums: 0, assignments: 0 });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [forums, setForums] = useState([]);

  // Edit User Modal State
  const [isUserModalVisible, setIsUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm] = Form.useForm();

  // Create/Edit Course Modal State
  const [isCourseModalVisible, setIsCourseModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm] = Form.useForm();

  // Assign Course Modal State
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [targetCourseCode, setTargetCourseCode] = useState('');

  // View User Courses Modal State
  const [isViewCoursesModalVisible, setIsViewCoursesModalVisible] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);

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
    if (activeTab === 'users') { fetchUsers(); fetchCourses(); }
    if (activeTab === 'courses') fetchCourses();
    if (activeTab === 'moderation') fetchForums();
  }, [activeTab]);

  // --- USER HANDLERS ---
  const handleOpenEditUser = (record) => {
    setEditingUser(record);
    userForm.setFieldsValue({
      firstName: record.firstName,
      lastName: record.lastName,
      department: record.department,
      schoolEmail: record.schoolEmail || record.email
    });
    setIsUserModalVisible(true);
  };

  const handleSaveUser = async (values) => {
    try {
      const res = await api.put('/admin/users', {
        id: editingUser._id,
        accountType: editingUser.accountType,
        ...values
      });
      if (res.data.success) {
        message.success('User updated successfully!');
        setIsUserModalVisible(false);
        fetchUsers();
      }
    } catch (err) { message.error('Failed to update user.'); }
  };

  const handleDeleteUser = async (id, type) => {
    try {
      await api.delete(`/admin/users/${type}/${id}`);
      message.success(`${type} deleted permanently.`);
      fetchUsers();
    } catch (err) { message.error('Failed to delete user.'); }
  };

  // --- COURSE HANDLERS ---
  const handleOpenCreateCourse = () => {
    setEditingCourse(null);
    courseForm.resetFields();
    setIsCourseModalVisible(true);
  };

  const handleOpenEditCourse = (record) => {
    setEditingCourse(record);
    courseForm.setFieldsValue(record);
    setIsCourseModalVisible(true);
  };

  const handleSaveCourse = async (values) => {
    try {
      let res;
      if (editingCourse) {
        res = await api.put('/admin/courses', { code: editingCourse.code, ...values });
      } else {
        res = await api.post('/admin/courses', values);
      }
      if (res.data.success) {
        message.success(editingCourse ? 'Course updated successfully!' : 'Course created successfully!');
        setIsCourseModalVisible(false);
        fetchCourses();
      }
    } catch (err) { message.error('Failed to save course.'); }
  };

  const handleDeleteCourse = async (code) => {
    try {
      await api.delete(`/admin/courses/${code}`);
      message.success(`Course ${code} and all associated data scrubbed from database.`);
      fetchCourses();
    } catch (err) { message.error('Failed to delete course.'); }
  };

  // --- FORUM HANDLERS ---
  const handleDeleteForum = async (id) => {
    try {
      await api.delete(`/admin/forums/${id}`);
      message.success(`Forum thread deleted.`);
      fetchForums();
    } catch (err) { message.error('Failed to delete forum thread.'); }
  };

  // --- ASSIGN & REMOVE COURSE HANDLERS ---
  const handleOpenAssignModal = (record) => {
    setSelectedUserForAssign(record);
    setTargetCourseCode('');
    setIsAssignModalVisible(true);
  };

  const handleConfirmAssignment = async () => {
    if (!targetCourseCode) return message.warning('Please select a course.');
    try {
      const res = await api.post('/admin/assign-course', {
        schoolId: selectedUserForAssign.schoolId,
        accountType: selectedUserForAssign.accountType,
        courseCode: targetCourseCode
      });
      if (res.data.success) {
        message.success(`Successfully assigned course ${targetCourseCode}!`);
        setIsAssignModalVisible(false);
        fetchUsers();
      }
    } catch (err) { 
      message.error(err.response?.data?.message || 'Failed to assign course (duplicate or error).'); 
    }
  };

  const handleOpenViewCourses = (record) => {
    setViewingUser(record);
    setIsViewCoursesModalVisible(true);
  };

  const handleRemoveUserCourse = async (courseCode) => {
    try {
      const res = await api.post('/admin/remove-course', {
        schoolId: viewingUser.schoolId,
        accountType: viewingUser.accountType,
        courseCode
      });
      if (res.data.success) {
        message.success(`Course ${courseCode} removed from user.`);
        // Update local viewing user state
        const updatedUser = { ...viewingUser };
        if (updatedUser.accountType === 'Student') {
            updatedUser.enrolledCourseSubjects = updatedUser.enrolledCourseSubjects?.filter(c => c.code !== courseCode);
            updatedUser.enrolledCourses = updatedUser.enrolledCourses?.filter(c => c.code !== courseCode);
        } else if (updatedUser.accountType === 'Teacher') {
            updatedUser.courseSubjectHeld = updatedUser.courseSubjectHeld?.filter(c => c.code !== courseCode);
        }
        setViewingUser(updatedUser);
        fetchUsers();
      }
    } catch (err) { message.error('Failed to remove course.'); }
  };

  // Extract user courses for viewing
  const getUserCoursesList = (userObj) => {
    if (!userObj) return [];
    if (userObj.accountType === 'Student') {
      const subjects = userObj.enrolledCourseSubjects || userObj.enrolledCourses || [];
      return subjects.map(s => s.code);
    }
    if (userObj.accountType === 'Teacher') {
      const held = userObj.courseSubjectHeld || [];
      return held.map(h => h.code);
    }
    return [];
  };

  const userColumns = [
    { title: 'System ID', dataIndex: 'schoolId', key: 'schoolId', render: (val, r) => val || r.username },
    { title: 'Full Name', key: 'name', render: (_, r) => `${r.firstName} ${r.lastName}` },
    { title: 'Role', dataIndex: 'accountType', key: 'accountType', render: role => <Tag color={role === 'Teacher' ? 'blue' : role === 'Admin' ? 'purple' : 'green'}>{role}</Tag> },
    { title: 'Department', dataIndex: 'department', key: 'department', render: d => d || '-' },
    { title: 'Courses', key: 'viewCourses', render: (_, r) => (
        r.accountType !== 'Admin' && <Button size="small" icon={<EyeOutlined />} onClick={() => handleOpenViewCourses(r)}>View Courses ({getUserCoursesList(r).length})</Button>
    )},
    { title: 'Course Actions', key: 'assign', render: (_, r) => (
        r.accountType !== 'Admin' && <Button size="small" type="dashed" icon={<LinkOutlined />} onClick={() => handleOpenAssignModal(r)}>Assign</Button>
    )},
    { title: 'Actions', key: 'actions', render: (_, r) => (
      <Space>
        <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleOpenEditUser(r)}>Edit</Button>
        <Popconfirm title="Permanently delete user?" onConfirm={() => handleDeleteUser(r._id, r.accountType)} okText="Delete" cancelText="Cancel">
          <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      </Space>
    )}
  ];

  const courseColumns = [
    { title: 'Course Code', dataIndex: 'code', key: 'code', render: code => <Text strong>{code}</Text> },
    { title: 'Course Name', dataIndex: 'name', key: 'name' },
    { title: 'Instructor', dataIndex: 'instructor', key: 'instructor' },
    { title: 'Target', key: 'target', render: (_, r) => `${r.targetProgram} - ${r.targetYear}` },
    { title: 'Actions', key: 'action', render: (_, r) => (
        <Space>
            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleOpenEditCourse(r)}>Edit</Button>
            <Popconfirm title={`Wipe course ${r.code} and ALL assignments/quizzes?`} onConfirm={() => handleDeleteCourse(r.code)} okText="Nuke Course" cancelText="Cancel">
                <Button size="small" danger icon={<DeleteOutlined />}>Wipe Data</Button>
            </Popconfirm>
        </Space>
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
                <Col span={6}><Card><Statistic title="Total Registered Users" value={stats.users} prefix={<TeamOutlined style={{color: '#1890ff'}}/>} /></Card></Col>
                <Col span={6}><Card><Statistic title="Total Active Courses" value={stats.courses} prefix={<BookOutlined style={{color: '#52c41a'}}/>} /></Card></Col>
                <Col span={6}><Card><Statistic title="Total Forum Threads" value={stats.forums} prefix={<SafetyOutlined style={{color: '#722ed1'}}/>} /></Card></Col>
                <Col span={6}><Card><Statistic title="Total Assignments" value={stats.assignments} prefix={<DashboardOutlined style={{color: '#faad14'}}/>} /></Card></Col>
              </Row>
            </div>
          )}

          {activeTab === 'users' && (
            <Card title="User Database Management" bordered={false}>
              <Table dataSource={users} columns={userColumns} rowKey="_id" loading={loading} />
            </Card>
          )}

          {activeTab === 'courses' && (
            <Card title="Course Database Management" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateCourse}>Create Course</Button>} bordered={false}>
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

      {/* Edit User Modal */}
      <Modal title="Edit User Details" open={isUserModalVisible} onCancel={() => setIsUserModalVisible(false)} footer={null} destroyOnClose>
        <Form form={userForm} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="department" label="Department / Program"><Input /></Form.Item>
          <Form.Item name="schoolEmail" label="Email / Username" rules={[{ required: true }]}><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Save Changes</Button>
        </Form>
      </Modal>

      {/* Create / Edit Course Modal */}
      <Modal title={editingCourse ? `Edit Course: ${editingCourse.code}` : "Create New Course"} open={isCourseModalVisible} onCancel={() => setIsCourseModalVisible(false)} footer={null} destroyOnClose>
        <Form form={courseForm} layout="vertical" onFinish={handleSaveCourse}>
          {!editingCourse && <Form.Item name="code" label="Course Code (Unique)" rules={[{ required: true }]}><Input placeholder="e.g. CC101" /></Form.Item>}
          <Form.Item name="name" label="Course Name" rules={[{ required: true }]}><Input placeholder="e.g. Introduction to Computing" /></Form.Item>
          <Form.Item name="instructor" label="Instructor Display Name" rules={[{ required: true }]}><Input placeholder="e.g. Prof. John Doe" /></Form.Item>
          <Form.Item name="targetProgram" label="Target Program" rules={[{ required: true }]}><Input placeholder="e.g. BS Information Technology" /></Form.Item>
          <Form.Item name="targetYear" label="Target Year" rules={[{ required: true }]}><Input placeholder="e.g. 1st Year" /></Form.Item>
          <Button type="primary" htmlType="submit" block>{editingCourse ? 'Update Course' : 'Create Course'}</Button>
        </Form>
      </Modal>

      {/* Assign Course Modal */}
      <Modal title={`Assign Course to ${selectedUserForAssign?.firstName} ${selectedUserForAssign?.lastName} (${selectedUserForAssign?.accountType})`} open={isAssignModalVisible} onOk={handleConfirmAssignment} onCancel={() => setIsAssignModalVisible(false)} okText="Assign Course">
        <p>Select the course you want to assign to this user:</p>
        <Select placeholder="Select a course code" style={{ width: '100%' }} value={targetCourseCode || undefined} onChange={val => setTargetCourseCode(val)} options={courses.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} />
      </Modal>

      {/* View & Remove User Courses Modal */}
      <Modal title={`Courses assigned to ${viewingUser?.firstName} ${viewingUser?.lastName}`} open={isViewCoursesModalVisible} onCancel={() => setIsViewCoursesModalVisible(false)} footer={null}>
        <List dataSource={getUserCoursesList(viewingUser)} locale={{ emptyText: 'No courses assigned to this user.' }} renderItem={courseCode => (
          <List.Item actions={[
            <Popconfirm title={`Remove ${courseCode} from this user?`} onConfirm={() => handleRemoveUserCourse(courseCode)} okText="Remove" cancelText="Cancel">
              <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
            </Popconfirm>
          ]}>
            <Text strong>{courseCode}</Text>
          </List.Item>
        )} />
      </Modal>

    </Layout>
  );
}