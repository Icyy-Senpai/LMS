import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Tooltip, Input, Card, Form, Typography, List, Row, Col, Modal, message, Tag, Avatar, Badge, Calendar, Popover, Upload, Spin, Empty, Tabs, Table, Space, Select, Divider } from 'antd';
import { UserOutlined, DashboardOutlined, LogoutOutlined, SettingOutlined, AppstoreOutlined, PlusOutlined, BellOutlined, CommentOutlined, EditOutlined, MailOutlined, TrophyOutlined, ExpandAltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import BigCalendar, { useReminders } from '../Shared/BigCalendar';
import CourseView from './CourseView';
import Network from '../Shared/Network';
import Forum from '../Shared/Forum';
import Mailbox from '../Shared/Mailbox';
import api from '../../api';
import BrandHero from '../Shared/BrandHero';
import ThemeToggle from '../Shared/ThemeToggle';
import logoImage from '../../logo.png';

const { Header, Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function StudentDashboard({ user, onLogout, onUpdateProfile }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [forumCourseCode, setForumCourseCode] = useState(null); 

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isCatalogModalVisible, setIsCatalogModalVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.photoUrl);
  const [collapsed, setCollapsed] = useState(true);
  
  const [allCourses, setAllCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [taskCategory, setTaskCategory] = useState('upcoming');
  const [activeCourseModal, setActiveCourseModal] = useState(null);
  const [courseModalTasks, setCourseModalTasks] = useState([]);
  
  const [calendarDate, setCalendarDate] = useState(() => dayjs());
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  const remindersApi = useReminders(user.schoolId);
  const [bigCalOpen, setBigCalOpen] = useState(false);
  const [bigCalDate, setBigCalDate] = useState(null);
  const openBigCalendar = (date) => { setBigCalDate(date ? date.format('YYYY-MM-DD') : null); setBigCalOpen(true); };
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardCourse, setLeaderboardCourse] = useState('all');
  
  const [notifications, setNotifications] = useState([]);

  const [myBadges, setMyBadges] = useState([]);
  useEffect(() => {
    if (activeTab !== 'profile' && activeTab !== 'grades') return;
    api.get(`/badges/student/${user.schoolId}`)
      .then(res => { if (res.data.success) setMyBadges(res.data.badges); })
      .catch(() => { });
  }, [activeTab, user.schoolId]);
  const badgeGrid = myBadges.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No badges earned yet." /> : (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {myBadges.map(b => (
        <div key={b._id} style={{ width: 180, padding: 12, textAlign: 'center', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
          <img src={b.photoUrl} alt={b.name} style={{ width: 96, height: 96, objectFit: 'contain' }} />
          <div style={{ marginTop: 6 }}><Text strong>{b.name}</Text></div>
          <Tag color="red" style={{ margin: '4px 0' }}>{b.course}</Tag>
          {b.courseName && <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{b.courseName}</Text>}
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            {b.awardedAt ? `Awarded ${dayjs(b.awardedAt).format('MMM D, YYYY')}` : ''}{b.awardedBy ? ` · ${b.awardedBy}` : ''}
          </Text>
        </div>
      ))}
    </div>
  );
  const [mailboxItems, setMailboxItems] = useState([]);
  const [taskToOpen, setTaskToOpen] = useState(null);

  const [form] = Form.useForm();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user.bio || '');

  const userYearLevel = user.yearLevel ? `${user.yearLevel}rd Year` : '1st Year';

  useEffect(() => {
    if (selectedCourse) {
      window.history.pushState(null, '', `/course/${selectedCourse.code}`);
      document.title = `eLMS | ${selectedCourse.code}`;
    } else {
      window.history.pushState(null, '', `/${activeTab}`);
      document.title = `eLMS | ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;
    }
  }, [activeTab, selectedCourse]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses');
        if (response.data.success) setAllCourses(response.data.courses);
      } catch (error) { message.error('Failed to load course catalog'); } 
      finally { setLoadingCourses(false); }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      const courseParam = leaderboardCourse !== 'all' ? `&courseCode=${leaderboardCourse}` : '';
      api.get(`/leaderboard?schoolId=${user.schoolId}${courseParam}`)
        .then(res => { if (res.data.success) setLeaderboard(res.data.leaderboard); })
        .catch(() => message.error('Failed to fetch leaderboard'));
    }
  }, [activeTab, leaderboardCourse, user.schoolId]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get(`/notifications/${user.schoolId}`);
        if (res.data.success) setNotifications(res.data.notifications);
      } catch(e) { console.error(e); }
    };
    fetchNotifications();
  }, [user.schoolId, activeTab]);

  useEffect(() => {
    let cancelled = false;
    api.get(`/user/${user.schoolId}`)
      .then(res => { if (!cancelled && res.data.success) onUpdateProfile({ ...user, ...res.data.user }); })
      .catch(() => { });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.schoolId, activeTab]);

  const enrolledCodes = (user.enrolledCourseSubjects || []).map(e => e.code);
  const enrolledKey = enrolledCodes.join(',');
  const currentlyEnrolled = allCourses.filter(course => enrolledCodes.includes(course.code));
  const completedCourses = (user.completedCourses || [])
    .map(rec => {
      const live = allCourses.find(c => c.code === rec.code) || {};
      return { ...live, code: rec.code, name: rec.name || live.name || rec.code, instructor: rec.instructor || live.instructor, completedAt: rec.completedAt, completedBy: rec.completedBy, completedByRole: rec.completedByRole };
    })
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const programAvailableCourses = allCourses.filter(c => c.targetProgram === user.department || c.department === user.department);

  const getOverdueText = (deadline) => {
    const ms = new Date() - new Date(deadline);
    const mins = Math.floor((ms / 1000) / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  };

  useEffect(() => {
    if (currentlyEnrolled.length === 0) { setUpcomingTasks([]); setMailboxItems([]); return; }
    const fetchTasksAndMailbox = async () => {
      let tasks = [];
      let alerts = [];
      const now = new Date();

      for (let course of currentlyEnrolled) {
        try {
          const [contentRes, assRes] = await Promise.all([
            api.get(`/instructor/course/${encodeURIComponent(course.code)}`, { params: { studentId: user.schoolId } }).catch(() => ({ data: {} })),
            api.get(`/assignments/${encodeURIComponent(course.code)}`, { params: { studentId: user.schoolId } })
          ]);

          if (contentRes.data.success && contentRes.data.content?.announcements) {
            contentRes.data.content.announcements.forEach(ann => {
              const annDate = new Date(ann.date);
              if ((now - annDate) / (1000 * 60 * 60 * 24) <= 3) {
                alerts.push({
                  id: `ann-${Math.random()}`, type: 'Announcement', tab: 'announcements', courseCode: course.code,
                  title: `Announcement: ${ann.title}`, description: ann.content, date: annDate, isUrgent: false
                });
              }
            });
          }

          if (assRes.data.success) {
            assRes.data.assignments.forEach(ass => {
              const hasSubmitted = ass.submissions?.some(s => s.studentUsername === user.schoolId);
              const dl = new Date(ass.deadline);
              const isOverdue = new Date() > dl;
              const hoursLeft = (dl - now) / (1000 * 60 * 60);

              if (!hasSubmitted) {
                tasks.push({
                  id: ass._id, courseCode: course.code, courseName: course.name, type: ass.type || 'Assignment', 
                  title: ass.title, dateStr: dayjs(dl).format('MMM D, h:mm A'), calendarFilter: dayjs(dl).format('YYYY-MM-DD'),
                  isOverdue, overdueString: isOverdue ? getOverdueText(dl) : '', rawDate: dl
                });

                if (hoursLeft > 0 && hoursLeft <= 24) {
                  alerts.push({
                    id: `due-${ass._id}`, type: 'Deadline', tab: 'assignments', courseCode: course.code,
                    title: `Upcoming Deadline: ${ass.title}`, description: `Due in ${Math.ceil(hoursLeft)} hours!`, date: dl, isUrgent: true
                  });
                }
              }

              const createdAt = new Date(parseInt(ass._id.substring(0, 8), 16) * 1000);
              if ((now - createdAt) / (1000 * 60 * 60 * 24) <= 3) {
                alerts.push({
                  id: `new-${ass._id}`, type: `New ${ass.type || 'Assignment'}`, tab: 'assignments', courseCode: course.code,
                  title: `New ${ass.type || 'Assignment'} Posted`, description: ass.title, date: createdAt, isUrgent: false
                });
              }
            });
          }
        } catch (e) {}
      }
      tasks.sort((a, b) => a.rawDate - b.rawDate);
      alerts.sort((a, b) => b.date - a.date);
      setUpcomingTasks(tasks);
      setMailboxItems(alerts);
    };
    fetchTasksAndMailbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCourses, enrolledKey]);

  const handleProfileUpdate = async (values) => {
    try {
      const response = await api.post('/update-profile', { schoolId: user.schoolId, ...values, photoUrl: avatarUrl });
      if (response.data.success) {
        message.success("Profile Updated");
        onUpdateProfile(response.data.user);
        setIsProfileModalVisible(false);
      }
    } catch (err) { message.error('Error updating profile'); }
  };

  const handleBioSave = async () => {
    try {
      const response = await api.post('/update-profile', { schoolId: user.schoolId, bio: bioText, photoUrl: avatarUrl });
      if (response.data.success) {
        message.success("Bio updated successfully!");
        onUpdateProfile(response.data.user);
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
    const dayTasks = upcomingTasks.filter(todo => todo.calendarFilter === cellDateStr);
    const dayReminders = remindersApi.reminders.filter(r => r.date === cellDateStr && !r.done);
    return (
      <div style={{ textAlign: 'center', fontSize: '11px', padding: '2px 0' }}>
        <div style={{ display: 'inline-block', width: '22px', height: '22px', lineHeight: '22px', borderRadius: '50%', backgroundColor: isSelected ? '#c62828' : 'transparent', color: isSelected ? '#fff' : 'inherit', border: isToday && !isSelected ? '1px solid #c62828' : '1px solid transparent', fontWeight: isSelected || isToday ? 'bold' : 'normal', transition: 'all 0.2s' }}>
          {value.date()}
        </div>
        {(dayTasks.length > 0 || dayReminders.length > 0) && (
          <div style={{ marginTop: -4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {dayTasks.length > 0 && <Badge dot color={isSelected ? 'white' : 'red'} />}
            {dayReminders.length > 0 && <Badge dot color={isSelected ? 'white' : '#9e9e9e'} />}
          </div>
        )}
      </div>
    );
  };

  const handleDateSelect = (date, info) => {
    setCalendarDate(date);
    if (info && info.source === 'date') { setSelectedDateFilter(date.format('YYYY-MM-DD')); openBigCalendar(date); }
  };

  const clearDateFilter = () => {
    setCalendarDate(dayjs());
    setSelectedDateFilter('');
  };

  const filteredTasks = selectedDateFilter ? upcomingTasks.filter(t => t.calendarFilter === selectedDateFilter) : upcomingTasks;
  const upcomingOnlyTasks = filteredTasks.filter(t => !t.isOverdue);
  const overdueOnlyTasks = filteredTasks.filter(t => t.isOverdue);
  const overdueCoursesMap = overdueOnlyTasks.reduce((acc, task) => {
    if (!acc[task.courseCode]) { acc[task.courseCode] = { code: task.courseCode, name: task.courseName, tasks: [] }; }
    acc[task.courseCode].tasks.push(task);
    return acc;
  }, {});
  const overdueCoursesList = Object.values(overdueCoursesMap);

  const handleCourseClick = (courseCode, courseName) => {
    const targetCourse = currentlyEnrolled.find(c => c.code === courseCode) || { code: courseCode, name: courseName };
    setActiveCourseModal(targetCourse);
    setCourseModalTasks((taskCategory === 'upcoming' ? upcomingOnlyTasks : overdueOnlyTasks).filter(t => t.courseCode === courseCode));
  };

  const openTask = () => {
    if (!taskToOpen) return;
    const course = currentlyEnrolled.find(c => c.code === taskToOpen.courseCode) || { code: taskToOpen.courseCode, name: taskToOpen.courseName };
    setSelectedCourse({ ...course, initialTab: 'assignments', focusTaskId: taskToOpen.id });
    setTaskToOpen(null);
  };

  const openCourseFromMailbox = (code, tab) => {
    const course = currentlyEnrolled.find(c => c.code === code);
    if (course) setSelectedCourse({ ...course, initialTab: tab || 'announcements' });
  };

  const markNotificationsAsRead = async () => {
    await api.post('/notifications/read', { userId: user.schoolId });
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const catalogPopoverContent = (
    <div style={{ width: 280 }}>
      <Tabs defaultActiveKey="enrolled">
        <Tabs.TabPane tab={<Badge count={currentlyEnrolled.length} offset={[10, 0]} color="red">Enrolled</Badge>} key="enrolled">
          {currentlyEnrolled.length > 0 ? (
            <List size="small" dataSource={currentlyEnrolled} renderItem={c => (
              <List.Item style={{ cursor: 'pointer' }} onClick={() => { setSelectedCourse(c); }}>
                <Text strong>{c.code}</Text> <br/> <Text type="secondary" style={{ fontSize: '12px' }}>{c.name}</Text>
              </List.Item>
            )} />
          ) : <Empty description="No enrolled courses." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </Tabs.TabPane>
        <Tabs.TabPane tab={<Badge count={completedCourses.length} offset={[10, 0]} color="green">Completed</Badge>} key="completed">
          {completedCourses.length > 0 ? (
            <List size="small" dataSource={completedCourses} renderItem={c => (
              <List.Item style={{ cursor: 'pointer' }} onClick={() => { setSelectedCourse({ ...c, readOnly: true }); }}>
                <Text strong>{c.code}</Text> <br/> <Text type="secondary" style={{ fontSize: '12px' }}>{c.name}</Text>
              </List.Item>
            )} />
          ) : <Empty description="No completed courses." image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </Tabs.TabPane>
      </Tabs>
      <Divider style={{ margin: '12px 0 8px 0' }} />
      <Button type="dashed" block onClick={() => setIsCatalogModalVisible(true)}>View All Available Courses</Button>
    </div>
  );

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'catalog', icon: <AppstoreOutlined />, label: (
      <Popover placement="rightTop" content={catalogPopoverContent} trigger="hover">
        <div style={{ width: '100%' }}>Course Catalog</div>
      </Popover>
    )},
    { key: 'grades', icon: <TrophyOutlined />, label: 'Badges' },
    { key: 'network', icon: <UserOutlined />, label: 'Friends & Chat' },
    { key: 'forum', icon: <CommentOutlined />, label: 'Forums' },
    { key: 'mailbox', icon: <MailOutlined />, label: <span>Mailbox <Badge count={notifications.filter(n => !n.isRead).length} size="small" /></span> },
    { type: 'divider' },
    { key: 'profile', icon: <SettingOutlined />, label: 'Profile' },
  ];

  if (loadingCourses) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Modal title="Student Settings" open={isProfileModalVisible} onCancel={() => setIsProfileModalVisible(false)} footer={null} destroyOnClose width={800}>
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

      <Modal title={activeCourseModal ? `${activeCourseModal.code}: ${activeCourseModal.name}` : "Course Tasks"} open={Boolean(activeCourseModal)} onCancel={() => setActiveCourseModal(null)} footer={[<Button key="close" type="primary" onClick={() => setActiveCourseModal(null)}>Close</Button>]}>
        <List size="small" dataSource={courseModalTasks} locale={{ emptyText: 'No tasks found for this course.' }} renderItem={item => (
          <List.Item>
            <List.Item.Meta title={item.title} description={<Space><Tag color={item.type === 'Quiz' ? 'purple' : 'geekblue'}>{item.type}</Tag><Text type={item.isOverdue ? 'danger' : 'secondary'} strong={item.isOverdue}>{item.isOverdue ? `Overdue by ${item.overdueString}` : `Due: ${item.dateStr}`}</Text></Space>} />
          </List.Item>
        )} />
        {activeCourseModal && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button type="primary" onClick={() => { setSelectedCourse(activeCourseModal); setActiveCourseModal(null); }}>Open Course Workspace</Button>
          </div>
        )}
      </Modal>

      <Modal title="Go to this task?" open={Boolean(taskToOpen)} onOk={openTask} onCancel={() => setTaskToOpen(null)} okText="Yes, take me there" cancelText="Not now" destroyOnHidden>
        {taskToOpen && (
          <>
            <Paragraph>Do you want to be redirected to <Text strong>{taskToOpen.title}</Text>?</Paragraph>
            <Space wrap>
              <Tag color="volcano">{taskToOpen.courseCode}</Tag>
              <Tag color={taskToOpen.type === 'Quiz' ? 'purple' : 'blue'}>{taskToOpen.type}</Tag>
              <Text type="secondary">Due: {taskToOpen.dateStr}</Text>
            </Space>
          </>
        )}
      </Modal>

      <Modal title={`Available Courses: ${user.department}`} open={isCatalogModalVisible} onCancel={() => setIsCatalogModalVisible(false)} footer={[<Button key="close" type="primary" onClick={() => setIsCatalogModalVisible(false)}>Close</Button>]} width={750}>
        <List grid={{ gutter: 16, xs: 1, sm: 2 }} dataSource={programAvailableCourses} locale={{ emptyText: `No available courses found for ${user.department}.` }} renderItem={course => (
          <List.Item>
            <Card size="small" hoverable={enrolledCodes.includes(course.code) || completedCourses.some(c => c.code === course.code)}
              style={{ cursor: enrolledCodes.includes(course.code) || completedCourses.some(c => c.code === course.code) ? 'pointer' : 'default' }}
              onClick={() => {
                const done = completedCourses.find(c => c.code === course.code);
                if (enrolledCodes.includes(course.code)) { setIsCatalogModalVisible(false); setSelectedCourse(course); }
                else if (done) { setIsCatalogModalVisible(false); setSelectedCourse({ ...course, ...done, readOnly: true }); }
                else message.info(`You are not enrolled in ${course.code}.`);
              }}>
              <div style={{ height: 40, backgroundColor: course.color || '#c62828', margin: '-12px -12px 12px -12px', borderRadius: '8px 8px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>{course.code}</Text>
                {enrolledCodes.includes(course.code) ? <Tag color="red" style={{ margin: 0 }}>Enrolled · Open</Tag>
                  : completedCourses.some(c => c.code === course.code) ? <Tag color="green" style={{ margin: 0 }}>Completed</Tag>
                  : <Tag style={{ margin: 0 }}>Not enrolled</Tag>}
              </div>
              <Title level={5} style={{ margin: '4px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.name}</Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>Prof. {course.instructor || 'TBA'}</Text>
            </Card>
          </List.Item>
        )} />
      </Modal>

      <BigCalendar open={bigCalOpen} onClose={() => setBigCalOpen(false)} initialDate={bigCalDate} remindersApi={remindersApi}
        tasks={upcomingTasks}
        onOpenTask={(t) => { const course = currentlyEnrolled.find(c => c.code === t.courseCode) || { code: t.courseCode, name: t.courseName }; setBigCalOpen(false); setSelectedCourse({ ...course, initialTab: 'assignments', focusTaskId: t.id }); }} />

      <Sider className="sdca-sider" theme="dark" width={250} collapsible collapsed={collapsed} onMouseEnter={() => setCollapsed(false)} onMouseLeave={() => setCollapsed(true)} trigger={null}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          <div className="sdca-sider-brand" onClick={() => { setActiveTab('dashboard'); setSelectedCourse(null); }}>
            <img src={logoImage} alt="St. Dominic College of Asia" />
            {!collapsed && <div className="sdca-sider-name"><b>eLMS</b><small>St. Dominic College</small></div>}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Menu
              theme="dark" mode="inline" selectedKeys={selectedCourse ? [] : [activeTab]}
              onClick={(e) => { if (e.key !== 'catalog') { setActiveTab(e.key); setSelectedCourse(null); } }}
              items={menuItems} style={{ borderRight: 0, marginTop: 16 }}
            />
          </div>
          <div className="sdca-sider-foot" style={{ padding: collapsed ? '16px 8px' : '16px' }}>
            {collapsed ? (
              <Avatar src={user.photoUrl} style={{ backgroundColor: '#c62828' }} icon={!user.photoUrl && <UserOutlined />} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Avatar src={user.photoUrl} style={{ backgroundColor: '#c62828' }} icon={!user.photoUrl && <UserOutlined />} />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.firstName} {user.lastName}</div>
                    <div className="sdca-sider-user-sub">{user.points || 0} EXP</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button icon={<SettingOutlined />} onClick={() => { form.setFieldsValue(user); setAvatarUrl(user.photoUrl); setIsProfileModalVisible(true); }} style={{ flex: 1, fontSize: '12px' }}>Settings</Button>
                  <Button danger icon={<LogoutOutlined />} onClick={onLogout} style={{ flex: 1, fontSize: '12px' }}>Logout</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.06)', zIndex: 1 }}>
          <Title level={4} style={{ margin: 0, textTransform: 'none' }}>{selectedCourse ? selectedCourse.code : activeTab.replace('-', ' ')}</Title>
          <Space size="middle" align="center">
            <ThemeToggle />
            
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
                        <List.Item style={{ padding: '10px', background: item.isUrgent ? '#fff1f0' : '#fff5f5', borderBottom: '1px solid #f0f0f0' }}>
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
                  <MailOutlined style={{ fontSize: 22, color: '#c62828' }} />
                </Button>
              </Badge>
            </Popover>

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
                        <List.Item style={{ padding: '10px', background: item.isRead ? 'transparent' : '#fff5f5', borderBottom: '1px solid #f0f0f0' }}>
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
          {selectedCourse ? (
            <CourseView user={user} course={selectedCourse} initialTab={selectedCourse.initialTab || 'announcements'} focusTaskId={selectedCourse.focusTaskId} readOnly={Boolean(selectedCourse.readOnly)} onBack={() => setSelectedCourse(null)} />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Row gutter={[24, 24]} justify="space-between">
                  <Col span={24}>
                    <BrandHero name={user.firstName} role={`Student${user.block ? ` · Block ${user.block}` : ''}`}
                      subtitle="Keep going. Here is what is happening in your courses."
                      chips={[
                        { label: 'Courses', value: currentlyEnrolled.length },
                        { label: 'Upcoming tasks', value: upcomingTasks.filter(t => !t.isOverdue).length },
                        { label: 'EXP', value: user.points || 0 },
                        { label: 'Badges', value: myBadges.length }
                      ]} />
                  </Col>
                  <Col xs={24} lg={15} xl={17}>
                    <Title level={5} style={{ marginBottom: 12 }}>My Enrolled Courses</Title>
                    {currentlyEnrolled.length === 0 ? <Empty description="You are not enrolled in any courses." /> : (
                      <Row gutter={[16, 16]}>
                        {currentlyEnrolled.map(course => (
                          <Col xs={24} sm={12} md={12} xl={8} key={course.id}>
                            <Card hoverable bodyStyle={{ padding: 0 }} onClick={() => setSelectedCourse(course)}>
                              <div style={{ height: 60, backgroundColor: course.color || '#c62828' }} />
                              <div style={{ padding: 16 }}>
                                <Text type="secondary" strong>{course.code}</Text>
                                <Title level={5} style={{ margin: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.name}</Title>
                                <Text type="secondary" style={{ fontSize: '12px' }}>{course.instructor}</Text>
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Col>
                  <Col xs={24} lg={9} xl={7} style={{ maxWidth: '320px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <Card size="small" className="sdca-cal-card" headStyle={{ minHeight: '32px', padding: '0 8px', fontSize: '12px' }} bodyStyle={{ padding: '0px 4px' }}
                        title={<Tooltip title="Open the big calendar"><span onClick={() => openBigCalendar()}><ExpandAltOutlined className="sdca-cal-expand" /> Calendar</span></Tooltip>}
                        extra={<Button type="link" size="small" style={{ fontSize: '11px' }} onClick={clearDateFilter}>Clear Filter</Button>}>
                        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', margin: '-10px 0 -45px 0' }}>
                          <Calendar fullscreen={false} value={calendarDate} onChange={setCalendarDate} fullCellRender={calendarCellRender} onSelect={handleDateSelect} />
                        </div>
                      </Card>
                      <Card size="small" headStyle={{ minHeight: '32px', padding: '0 8px' }} title={<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '13px' }}>Tasks Catalog</span><Select value={taskCategory} onChange={setTaskCategory} size="small" style={{ width: 110, fontSize: '11px' }} options={[{ value: 'upcoming', label: 'Upcoming Tasks' }, { value: 'overdue', label: 'Overdue Tasks' }]} /></div>} bodyStyle={{ maxHeight: '140px', overflowY: 'auto', padding: '4px 8px' }}>
                        {taskCategory === 'upcoming' ? (
                          <List size="small" dataSource={upcomingOnlyTasks} locale={{ emptyText: 'No upcoming tasks.' }} renderItem={item => (
                            <List.Item style={{ padding: '4px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }} onClick={() => setTaskToOpen(item)} title="Click to open this task">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Space size={4}><Tag color={item.type === 'Quiz' ? 'purple' : 'geekblue'} style={{ margin: 0, fontSize: '9px' }}>{item.courseCode}</Tag><Text style={{ fontSize: '11px', fontWeight: 500 }}>{item.title}</Text></Space>
                                <Text type="secondary" style={{ fontSize: '10px' }}>{item.dateStr}</Text>
                              </div>
                            </List.Item>
                          )} />
                        ) : (
                          <List size="small" dataSource={overdueCoursesList} locale={{ emptyText: 'No overdue tasks.' }} renderItem={courseGroup => (
                            <List.Item style={{ padding: '6px 4px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }} onClick={() => handleCourseClick(courseGroup.code, courseGroup.name)}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Space size={4}><Tag color="red" style={{ margin: '0 0 9px' }}>{courseGroup.code}</Tag><Text style={{ fontSize: '12px', fontWeight: 600, color: '#c62828' }}>{courseGroup.name}</Text></Space>
                                <Badge count={courseGroup.tasks.length} style={{ backgroundColor: '#ff4d4f' }} />
                              </div>
                            </List.Item>
                          )} />
                        )}
                      </Card>
                      <Card size="small" headStyle={{ minHeight: '32px', padding: '0 8px' }} title={<span style={{ fontSize: '13px' }}>Block Leaderboard</span>} extra={<Select value={leaderboardCourse} onChange={setLeaderboardCourse} style={{ width: 100, fontSize: '11px' }} size="small" options={[{ value: 'all', label: 'All Courses' }, ...currentlyEnrolled.map(c => ({ value: c.code, label: c.code }))]} />} bodyStyle={{ maxHeight: '160px', overflowY: 'auto', padding: '4px 8px' }}>
                        <Table size="small" dataSource={leaderboard} rowKey="_id" pagination={false} columns={[
                          { title: 'Rank', key: 'rank', render: (_, __, idx) => <Text strong style={{ fontSize: 12, color: idx === 0 ? '#faad14' : idx === 1 ? '#8c8c8c' : idx === 2 ? '#d48806' : 'inherit' }}>#{idx + 1}</Text> },
                          { title: 'Student', key: 'student', render: (_, record) => <Space><Avatar size="small" src={record.photoUrl} icon={!record.photoUrl && <UserOutlined />} /><Text style={{fontSize: '11px'}} strong>{record.firstName} {record.lastName}</Text></Space> },
                          { title: 'EXP', dataIndex: 'points', key: 'points', render: pts => <Tag color="gold" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>{pts}</Tag> }
                        ]} />
                      </Card>
                    </div>
                  </Col>
                </Row>
              )}
              {activeTab === 'network' && <Network currentUser={user} />}
              {activeTab === 'mailbox' && <Mailbox user={user} notifications={notifications} onNotificationsChange={setNotifications} courseAlerts={mailboxItems} onOpenCourse={openCourseFromMailbox} />}
              {activeTab === 'forum' && (
                <div style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}>
                  <Title level={4}>Forums</Title>
                  <Select placeholder="Select a Course to view its Forum" style={{ width: 300, marginBottom: 20 }} onChange={val => setForumCourseCode(val)} value={forumCourseCode}>
                    {currentlyEnrolled.map(c => <Select.Option key={c.code} value={c.code}>{c.code} - {c.name}</Select.Option>)}
                  </Select>
                  {forumCourseCode ? <Forum courseCode={forumCourseCode} currentUser={user} /> : <Empty description="Please select a course forum above." />}
                </div>
              )}
              {activeTab === 'grades' && (
                <Card title={<span><TrophyOutlined /> My Badges ({myBadges.length})</span>}>{badgeGrid}</Card>
              )}
              {activeTab === 'profile' && (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <Card style={{ marginBottom: 20 }}>
                    <Row gutter={24} align="middle">
                      <Col><Avatar size={90} src={user.photoUrl} icon={!user.photoUrl && <UserOutlined />} style={{ backgroundColor: '#c62828' }} /></Col>
                      <Col flex={1}>
                        <Title level={3} style={{ margin: 0 }}>{user.firstName} {user.middleName} {user.lastName}</Title>
                        <Text type="secondary" style={{ fontSize: '15px' }}>{user.schoolId}   {user.department}</Text><br />
                        <Text>{user.schoolEmail}</Text>
                        <div style={{ marginTop: 8 }}><Tag color="red">{userYearLevel}</Tag><Tag color="gold">{user.points || 0} EXP</Tag></div>
                      </Col>
                    </Row>
                  </Card>
                  <Card>
                    <Tabs defaultActiveKey="bio" items={[
                      { key: 'bio', label: 'BIO', children: (
                        <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <Title level={5} style={{ margin: 0 }}>Student Biography</Title>
                          {!isEditingBio ? <Button icon={<EditOutlined />} onClick={() => setIsEditingBio(true)}>Edit Bio</Button> : <Space><Button type="primary" onClick={handleBioSave}>Save</Button><Button onClick={() => { setIsEditingBio(false); setBioText(user.bio || ''); }}>Cancel</Button></Space>}
                        </div>
                        {!isEditingBio ? <Paragraph style={{ whiteSpace: 'pre-wrap', backgroundColor: '#fafafa', padding: 16, borderRadius: 6, minHeight: 80 }}>{user.bio || "No biography provided yet. Click 'Edit Bio' to add one."}</Paragraph> : <Input.TextArea rows={4} value={bioText} onChange={(e) => setBioText(e.target.value)} placeholder="Write something about yourself..." />}
                        <Divider />
                        <Text type="secondary"><strong>Personal Email:</strong> {user.personalEmail}</Text><br/>
                        <Text type="secondary"><strong>Mobile Number:</strong> {user.mobileNum}</Text><br/>
                        <Text type="secondary"><strong>Present Address:</strong> {user.presentAddress}</Text>
                      </>
                      ) },
                      { key: 'courses', label: 'Courses', children: (
                        <List dataSource={currentlyEnrolled} locale={{ emptyText: 'No enrolled courses found.' }} renderItem={course => (<List.Item><List.Item.Meta title={course.name} description={<Tag color="red">{course.code}</Tag>} /></List.Item>)} />
                      ) },
                      { key: 'badges', label: <span><TrophyOutlined /> Badges ({myBadges.length})</span>, children: (
                        badgeGrid
                      ) },
                      { key: 'completed', label: <span><TrophyOutlined /> Completed Courses ({completedCourses.length})</span>, children: (
                        <List dataSource={completedCourses} locale={{ emptyText: 'No completed courses yet.' }} renderItem={course => (
                          <List.Item extra={<Tag color="green">Completed</Tag>}>
                            <List.Item.Meta
                              title={course.name}
                              description={
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span><Tag color="red">{course.code}</Tag>{course.instructor && course.instructor !== 'TBA' ? <Text type="secondary" style={{ fontSize: 12 }}>{course.instructor}</Text> : null}</span>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Completed on {course.completedAt ? dayjs(course.completedAt).format('MMM D, YYYY') : '-'}{course.completedBy ? ` · marked by ${course.completedBy}` : ''}
                                  </Text>
                                </div>
                              }
                            />
                          </List.Item>
                        )} />
                      ) }
                    ]} />
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