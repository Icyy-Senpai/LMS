import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Input, Card, Form, Typography, List, Row, Col, Modal, message, Tag, Avatar, Badge, Calendar, Popover, Upload, Spin, Empty, Tabs, Space, Divider, Select } from 'antd';
import { UserOutlined, DashboardOutlined, LogoutOutlined, SettingOutlined, AppstoreOutlined, PlusOutlined, BellOutlined, CommentOutlined, EditOutlined, FolderOpenOutlined, MailOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import CourseWorkspace from './CourseWorkspace';
import Network from '../Shared/Network';
import Forum from '../Shared/Forum';
import Mailbox from '../Shared/Mailbox';
import api from '../../api';
import logoImage from '../../logo.png';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function TeacherDashboard({ user, onLogout, onUpdateProfile }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [forumCourseCode, setForumCourseCode] = useState(null); 

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.photoUrl);
  const [collapsed, setCollapsed] = useState(true);
  
  const [myCourses, setMyCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  
  const [taskCategory, setTaskCategory] = useState('upcoming');
  const [calendarDate, setCalendarDate] = useState(() => dayjs());
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  
  const [notifications, setNotifications] = useState([]); 
  const [mailboxItems, setMailboxItems] = useState([]);

  const [form] = Form.useForm();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user.bio || '');

  useEffect(() => {
    if (selectedCourse) {
      window.history.pushState(null, '', `/course/${selectedCourse.code}`);
      document.title = `eLMS | ${selectedCourse.code}`;
    } else {
      window.history.pushState(null, '', `/${activeTab}`);
      document.title = `eLMS | ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;
    }
  }, [activeTab, selectedCourse]);

  // Fetch Courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses');
        if (response.data.success) {
          const assigned = response.data.courses.filter(c => c.instructorID === user.schoolId);
          setMyCourses(assigned);
        }
      } catch (error) { message.error('Failed to load courses'); } 
      finally { setLoadingCourses(false); }
    };
    fetchCourses();
  }, [user.schoolId]);

  // Fetch Global Notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get(`/notifications/${user.schoolId}`);
        if (res.data.success) setNotifications(res.data.notifications);
      } catch(e) { console.error(e); }
    };
    fetchNotifications();
  }, [user.schoolId, activeTab]);

  // Fetch Assignments & Mailbox Alerts
  useEffect(() => {
    if (myCourses.length === 0) return;
    const fetchAssignmentsAndMailbox = async () => {
      let allAssignments = [];
      let alerts = [];
      const now = new Date();

      for (let course of myCourses) {
        try {
          const [contentRes, assRes] = await Promise.all([
            api.get(`/instructor/course/${course.code}`),
            api.get(`/assignments/${course.code}`)
          ]);

          if (contentRes.data.success && contentRes.data.content?.announcements) {
            contentRes.data.content.announcements.forEach(ann => {
              const annDate = new Date(ann.date);
              if ((now - annDate) / (1000 * 60 * 60 * 24) <= 3) {
                alerts.push({ id: `ann-${Math.random()}`, type: 'Announcement', tab: 'announcements', courseCode: course.code, title: `Announcement: ${ann.title}`, description: ann.content, date: annDate, isUrgent: false });
              }
            });
          }

          if (assRes.data.success) {
            assRes.data.assignments.forEach(a => {
              const dl = new Date(a.deadline);
              allAssignments.push({
                ...a, courseCode: course.code, courseName: course.name,
                dateStr: dayjs(dl).format('MMM D, h:mm A'), calendarFilter: dayjs(dl).format('YYYY-MM-DD'),
                isOverdue: new Date() > dl, rawDate: dl
              });

              const createdAt = new Date(parseInt(a._id.substring(0, 8), 16) * 1000);
              if ((now - createdAt) / (1000 * 60 * 60 * 24) <= 3) {
                alerts.push({ id: `new-${a._id}`, type: `New ${a.type || 'Assignment'}`, courseCode: course.code, title: `New ${a.type || 'Assignment'} Posted`, description: a.title, date: createdAt, isUrgent: false });
              }

              const hoursLeft = (dl - now) / (1000 * 60 * 60);
              if (hoursLeft > 0 && hoursLeft <= 24) {
                alerts.push({ id: `due-${a._id}`, type: 'Deadline', courseCode: course.code, title: `Upcoming Deadline: ${a.title}`, description: `Class submissions due in ${Math.ceil(hoursLeft)} hours!`, date: dl, isUrgent: true });
              }
            });
          }
        } catch (e) { console.error('Data fetch error'); }
      }
      allAssignments.sort((a, b) => a.rawDate - b.rawDate);
      alerts.sort((a, b) => b.date - a.date);
      setTeacherAssignments(allAssignments);
      setMailboxItems(alerts);
    };
    fetchAssignmentsAndMailbox();
  }, [myCourses]);

  const handleProfileUpdate = async (values) => {
    try {
      const response = await api.post('/update-profile', { schoolId: user.schoolId, ...values, photoUrl: avatarUrl });
      if (response.data.success) {
        message.success("Profile Updated");
        if (typeof onUpdateProfile === 'function') onUpdateProfile(response.data.user);
        setIsProfileModalVisible(false);
      }
    } catch (err) { message.error('Error updating profile'); }
  };

  const handleBioSave = async () => {
    try {
      const response = await api.post('/update-profile', { schoolId: user.schoolId, bio: bioText, photoUrl: avatarUrl });
      if (response.data.success) {
        message.success("Bio updated successfully!");
        if (typeof onUpdateProfile === 'function') onUpdateProfile(response.data.user);
        setIsEditingBio(false);
      } else { message.error("Failed to update bio"); }
    } catch (err) { message.error("Server error updating bio"); }
  };

  const handleImageUpload = (info) => {
    if (info.file.status === 'done' || info.file.originFileObj) {
      const reader = new FileReader();
      reader.onload = () => setAvatarUrl(reader.result);
      reader.readAsDataURL(info.file.originFileObj);
    }
  };

  const calendarCellRender = (value) => {
    const cellDateStr = value.format('YYYY-MM-DD');
    const isSelected = selectedDateFilter === cellDateStr;
    const isToday = cellDateStr === dayjs().format('YYYY-MM-DD');
    const dayTasks = teacherAssignments.filter(task => task.calendarFilter === cellDateStr);
    return (
      <div style={{ textAlign: 'center', fontSize: '11px', padding: '2px 0' }}>
        <div style={{ display: 'inline-block', width: '22px', height: '22px', lineHeight: '22px', borderRadius: '50%', backgroundColor: isSelected ? '#1890ff' : 'transparent', color: isSelected ? '#fff' : 'inherit', border: isToday && !isSelected ? '1px solid #1890ff' : '1px solid transparent', fontWeight: isSelected || isToday ? 'bold' : 'normal', transition: 'all 0.2s' }}>
          {value.date()}
        </div>
        {dayTasks.length > 0 && <div style={{ marginTop: -4 }}><Badge dot color={isSelected ? 'white' : 'blue'} /></div>}
      </div>
    );
  };

  const handleDateSelect = (date, info) => {
    setCalendarDate(date);
    if (info && info.source === 'date') setSelectedDateFilter(date.format('YYYY-MM-DD'));
  };

  const clearDateFilter = () => {
    setCalendarDate(dayjs());
    setSelectedDateFilter('');
  };

  const filteredTasks = selectedDateFilter ? teacherAssignments.filter(t => t.calendarFilter === selectedDateFilter) : teacherAssignments;
  const upcomingOnlyTasks = filteredTasks.filter(t => !t.isOverdue);
  const overdueOnlyTasks = filteredTasks.filter(t => t.isOverdue);
  const overdueCoursesMap = overdueOnlyTasks.reduce((acc, task) => {
    if (!acc[task.courseCode]) { acc[task.courseCode] = { code: task.courseCode, name: task.courseName, tasks: [] }; }
    acc[task.courseCode].tasks.push(task);
    return acc;
  }, {});
  const overdueCoursesList = Object.values(overdueCoursesMap);

  const handleCourseClick = (courseCode, courseName) => {
    const targetCourse = myCourses.find(c => c.code === courseCode) || { code: courseCode, name: courseName };
    setSelectedCourse(targetCourse);
  };

  const markNotificationsAsRead = async () => {
    await api.post('/notifications/read', { userId: user.schoolId });
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const catalogPopoverContent = (
    <List size="small" dataSource={myCourses} style={{ width: 280 }} locale={{ emptyText: 'No assigned courses.' }} renderItem={c => (
      <List.Item style={{ cursor: 'pointer' }} onClick={() => setSelectedCourse(c)}>
        <Text strong>{c.code}</Text> <br/> <Text type="secondary" style={{ fontSize: '12px' }}>{c.name}</Text>
      </List.Item>
    )} />
  );

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'catalog', icon: <AppstoreOutlined />, label: (
        <Popover placement="rightTop" content={catalogPopoverContent} trigger="hover">
            <div style={{ width: '100%' }}>My Subjects</div>
        </Popover>
    )},
    { key: 'network', icon: <UserOutlined />, label: 'Friends & Chat' },
    { key: 'forum', icon: <CommentOutlined />, label: 'Forums' },
    { key: 'mailbox', icon: <MailOutlined />, label: <span>Mailbox <Badge count={notifications.filter(n => !n.isRead).length} size="small" /></span> },
    { type: 'divider' },
    { key: 'profile', icon: <SettingOutlined />, label: 'Profile' },
  ];

  if (loadingCourses) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

  const getHeaderTitle = () => {
    if (selectedCourse) return `${selectedCourse.code} Workspace`;
    if (activeTab === 'profile') return `Prof. ${user.lastName} | Profile`;
    return activeTab.replace('-', ' ');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Modal title="Faculty Settings" open={isProfileModalVisible} onCancel={() => setIsProfileModalVisible(false)} footer={null} destroyOnClose width={800}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Upload name="avatar" listType="picture-circle" showUploadList={false} customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 0)} onChange={handleImageUpload}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>}
          </Upload>
        </div>
        <Form form={form} layout="vertical" onFinish={handleProfileUpdate} initialValues={user}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="personalEmail" label="Personal Email" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="mobileNum" label="Mobile Number" rules={[{ required: true }]}><Input type="number" /></Form.Item></Col>
          </Row>
          <Form.Item name="presentAddress" label="Present Address" rules={[{ required: true }]}><Input /></Form.Item>
          <Button type="primary" htmlType="submit" block>Save Changes</Button>
        </Form>
      </Modal>

      <Sider theme="light" width={250} collapsible collapsed={collapsed} onMouseEnter={() => setCollapsed(false)} onMouseLeave={() => setCollapsed(true)} trigger={null} style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div onClick={() => { setActiveTab('dashboard'); setSelectedCourse(null); }} style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background-color 0.3s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fafafa'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            {collapsed ? <img src={logoImage} alt="Logo" style={{ height: '40px', width: '40px', objectFit: 'contain' }} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src={logoImage} alt="Logo" style={{ height: '40px', width: '40px', objectFit: 'contain' }} /><Title level={4} style={{ margin: '0 0 0 5px', color: '#1890ff' }}>eLMS Faculty</Title></div>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}><Menu mode="inline" selectedKeys={selectedCourse ? [] : [activeTab]} onClick={(e) => { if(e.key !== 'catalog') { setActiveTab(e.key); setSelectedCourse(null); } }} items={menuItems} style={{ borderRight: 0, marginTop: 16 }} /></div>
          <div style={{ padding: collapsed ? '16px 8px' : '16px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
            {collapsed ? <Avatar src={user.photoUrl} style={{ backgroundColor: '#1890ff' }} icon={!user.photoUrl && <UserOutlined />} /> : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}><Avatar src={user.photoUrl} style={{ backgroundColor: '#1890ff' }} icon={!user.photoUrl && <UserOutlined />} /><div style={{ overflow: 'hidden' }}><div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Prof. {user.lastName}</div><div style={{ fontSize: '12px', color: '#52c41a', fontWeight: 'bold' }}>Faculty</div></div></div>
                <div style={{ display: 'flex', gap: 8 }}><Button icon={<SettingOutlined />} onClick={() => { form.setFieldsValue(user); setAvatarUrl(user.photoUrl); setIsProfileModalVisible(true); }} style={{ flex: 1, fontSize: '12px' }}>Settings</Button><Button danger icon={<LogoutOutlined />} onClick={onLogout} style={{ flex: 1, fontSize: '12px' }}>Logout</Button></div>
              </>
            )}
          </div>
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)', zIndex: 1 }}>
          <Title level={4} style={{ margin: 0, textTransform: 'capitalize' }}>{getHeaderTitle()}</Title>
          <Space size="middle" align="center">
            
            {/* Mailbox Course Alerts Popover */}
            <Popover 
              placement="bottomRight" 
              title="Mailbox: Course Alerts" 
              trigger="click"
              content={
                <div style={{ width: 350, maxHeight: '400px', overflowY: 'auto' }}>
                  {mailboxItems.length > 0 ? (
                    <List
                      itemLayout="horizontal"
                      dataSource={mailboxItems}
                      renderItem={item => (
                        <List.Item style={{ padding: '10px', background: item.isUrgent ? '#fff1f0' : '#f0f5ff', borderBottom: '1px solid #f0f0f0' }}>
                          <List.Item.Meta 
                            avatar={<Tag color={item.isUrgent ? 'red' : 'blue'} style={{ marginTop: '5px' }}>{item.courseCode}</Tag>}
                            title={<span style={{ fontSize: '13px', fontWeight: 'bold', color: item.isUrgent ? 'red' : 'inherit' }}>{item.title}</span>} 
                            description={<span style={{ fontSize: '12px', color: '#595959' }}>{item.description} <br/><small>{item.date.toLocaleString()}</small></span>} 
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center' }}><Text type="secondary">No recent course alerts.</Text></div>
                  )}
                  <Button type="link" block onClick={() => { setActiveTab('mailbox'); setSelectedCourse(null); }}>Open Mailbox</Button>
                </div>
              } 
            >
              <Badge count={mailboxItems.filter(i => i.isUrgent).length} color="red" style={{ cursor: 'pointer' }}>
                <Button type="text" style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                  <MailOutlined style={{ fontSize: 22, color: '#1890ff' }} />
                </Button>
              </Badge>
            </Popover>

            {/* Social Notification Bell Popover */}
            <Popover 
              placement="bottomRight" 
              title={<div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Notifications</span><Button type="link" size="small" onClick={markNotificationsAsRead}>Mark all read</Button></div>}
              trigger="click"
              content={
                <div style={{ width: 320, maxHeight: '400px', overflowY: 'auto' }}>
                  {notifications.length > 0 ? (
                    <List
                      itemLayout="horizontal"
                      dataSource={notifications}
                      renderItem={item => (
                        <List.Item style={{ padding: '10px', background: item.isRead ? 'transparent' : '#f0f5ff', borderBottom: '1px solid #f0f0f0' }}>
                          <List.Item.Meta 
                            title={<span style={{ fontSize: '13px', fontWeight: item.isRead ? 'normal' : 'bold' }}>{item.title}</span>} 
                            description={<span style={{ fontSize: '12px', color: '#595959' }}>{item.message}</span>} 
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center' }}><Text type="secondary">No new notifications.</Text></div>
                  )}
                  <Button type="link" block onClick={() => { setActiveTab('mailbox'); setSelectedCourse(null); }}>Open Mailbox</Button>
                </div>
              } 
            >
              <Badge count={notifications.filter(n => !n.isRead).length} color="red" style={{ cursor: 'pointer' }}>
                <BellOutlined style={{ fontSize: 22, color: '#595959' }} />
              </Badge>
            </Popover>

          </Space>
        </Header>
        <Content style={{ margin: '24px' }}>
          {selectedCourse ? <CourseWorkspace course={selectedCourse} teacher={user} onBack={() => setSelectedCourse(null)} /> : (
            <>
              {activeTab === 'dashboard' && (
                <Row gutter={[24, 24]} justify="space-between">
                  <Col xs={24} lg={15} xl={17}>
                    <Title level={5} style={{ marginBottom: 12 }}>My Assigned Subjects</Title>
                    {myCourses.length === 0 ? <Empty description="You are not assigned to any courses." /> : (
                      <Row gutter={[16, 16]}>
                        {myCourses.map(course => (
                          <Col xs={24} sm={12} md={12} xl={8} key={course.code}>
                            <Card hoverable bodyStyle={{ padding: 0 }} onClick={() => setSelectedCourse(course)}>
                              <div style={{ height: 60, backgroundColor: course.color || '#1890ff' }} />
                              <div style={{ padding: 16 }}><Text type="secondary" strong>{course.code}</Text><Title level={5} style={{ margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.name}</Title><Space style={{ marginTop: 8 }}><Tag color="cyan">{course.targetProgram}</Tag><Tag color="blue">{course.targetYear}</Tag></Space></div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Col>
                  <Col xs={24} lg={9} xl={7} style={{ maxWidth: '320px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <Card size="small" headStyle={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }} bodyStyle={{ padding: '0px 4px' }} extra={<Button type="link" size="small" style={{ fontSize: '11px' }} onClick={clearDateFilter}>Clear Filter</Button>}>
                        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', margin: '-10px 0 -45px 0' }}>
                          <Calendar fullscreen={false} value={calendarDate} onChange={setCalendarDate} fullCellRender={calendarCellRender} onSelect={handleDateSelect} />
                        </div>
                      </Card>
                      <Card size="small" headStyle={{ minHeight: '32px', padding: '0 8px' }} title={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '13px' }}>Tasks Catalog</span><Select value={taskCategory} onChange={setTaskCategory} size="small" style={{ width: 110, fontSize: '11px' }} options={[{ value: 'upcoming', label: 'Upcoming Tasks' }, { value: 'overdue', label: 'Overdue Tasks' }]} /></div>} bodyStyle={{ maxHeight: '200px', overflowY: 'auto', padding: '4px 8px' }}>
                        {taskCategory === 'upcoming' ? (
                          <List size="small" dataSource={upcomingOnlyTasks} locale={{ emptyText: 'No upcoming tasks.' }} renderItem={item => (
                            <List.Item style={{ padding: '4px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }} onClick={() => setSelectedCourse({ code: item.courseCode, name: item.courseName })}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Space size={4}><FolderOpenOutlined style={{ color: '#1890ff', fontSize: '12px' }} /><Tag color="geekblue" style={{ margin: 0, fontSize: '9px' }}>{item.courseCode}</Tag><Text style={{ fontSize: '11px', fontWeight: 500 }}>{item.title}</Text></Space>
                                <div style={{ textAlign: 'right' }}><Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>{item.dateStr}</Text><Text style={{ fontSize: '10px', color: '#52c41a' }}>{item.submissions?.length || 0} Submitted</Text></div>
                              </div>
                            </List.Item>
                          )} />
                        ) : (
                          <List size="small" dataSource={overdueCoursesList} locale={{ emptyText: 'No overdue tasks.' }} renderItem={courseGroup => (
                            <List.Item style={{ padding: '6px 4px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }} onClick={() => handleCourseClick(courseGroup.code, courseGroup.name)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Space size={4}><Tag color="red" style={{ margin: '0 0 9px' }}>{courseGroup.code}</Tag><Text style={{ fontSize: '12px', fontWeight: 600, color: '#1890ff' }}>{courseGroup.name}</Text></Space><Badge count={courseGroup.tasks.length} style={{ backgroundColor: '#ff4d4f' }} />
                              </div>
                            </List.Item>
                          )} />
                        )}
                      </Card>
                    </div>
                  </Col>
                </Row>
              )}
              {activeTab === 'network' && <Network currentUser={user} />}
              {activeTab === 'mailbox' && <Mailbox user={user} notifications={notifications} onNotificationsChange={setNotifications} courseAlerts={mailboxItems} onOpenCourse={(code) => { const c = myCourses.find(x => x.code === code); if (c) setSelectedCourse(c); }} />}
              {activeTab === 'forum' && (
                <div style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}>
                  <Title level={4}>Forums (Moderation)</Title>
                  <Select placeholder="Select a Subject to view/moderate its Forum" style={{ width: 300, marginBottom: 20 }} onChange={val => setForumCourseCode(val)} value={forumCourseCode}>
                    {myCourses.map(c => <Select.Option key={c.code} value={c.code}>{c.code} - {c.name}</Select.Option>)}
                  </Select>
                  {forumCourseCode ? <Forum courseCode={forumCourseCode} currentUser={user} /> : <Empty description="Please select a course forum above." />}
                </div>
              )}
              {activeTab === 'profile' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <Card style={{ marginBottom: 20 }}>
                    <Row gutter={24} align="middle">
                      <Col><Avatar size={90} src={user.photoUrl} icon={!user.photoUrl && <UserOutlined />} style={{ backgroundColor: '#1890ff' }} /></Col>
                      <Col flex={1}>
                        <Title level={3} style={{ margin: 0 }}>{user.firstName} {user.middleName} {user.lastName}</Title>
                        <Text type="secondary" style={{ fontSize: '15px' }}>{user.schoolId}   {user.department || 'Faculty Member'}</Text><br />
                        <Text>{user.schoolEmail}</Text>
                        <div style={{ marginTop: 8 }}><Tag color="green">Faculty / Instructor</Tag></div>
                      </Col>
                    </Row>
                  </Card>
                  <Card>
                    <Tabs defaultActiveKey="bio">
                      <Tabs.TabPane tab="Faculty Biography" key="bio">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <Title level={5} style={{ margin: 0 }}>About Me</Title>
                          {!isEditingBio ? <Button icon={<EditOutlined />} onClick={() => setIsEditingBio(true)}>Edit Bio</Button> : <Space><Button type="primary" onClick={handleBioSave}>Save</Button><Button onClick={() => { setIsEditingBio(false); setBioText(user.bio || ''); }}>Cancel</Button></Space>}
                        </div>
                        {!isEditingBio ? <Paragraph style={{ whiteSpace: 'pre-wrap', backgroundColor: '#fafafa', padding: 16, borderRadius: 6, minHeight: 80 }}>{user.bio || "No biography provided yet. Click 'Edit Bio' to add your academic background."}</Paragraph> : <Input.TextArea rows={4} value={bioText} onChange={(e) => setBioText(e.target.value)} placeholder="Write your academic background, office hours, and expertise..." />}
                        <Divider />
                        <Text type="secondary"><strong>Personal Email:</strong> {user.personalEmail}</Text><br/>
                        <Text type="secondary"><strong>Mobile Number:</strong> {user.mobileNum}</Text><br/>
                        <Text type="secondary"><strong>Present Address:</strong> {user.presentAddress}</Text>
                      </Tabs.TabPane>
                      <Tabs.TabPane tab="Assigned Subjects" key="courses"><List dataSource={myCourses} locale={{ emptyText: 'No assigned subjects found.' }} renderItem={course => (<List.Item><List.Item.Meta title={course.name} description={<Space><Tag color="blue">{course.code}</Tag><Text type="secondary" style={{ fontSize: '12px' }}>{course.targetProgram} ({course.targetYear})</Text></Space>} /></List.Item>)} /></Tabs.TabPane>
                    </Tabs>
                  </Card>
                </div>
              )}
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}