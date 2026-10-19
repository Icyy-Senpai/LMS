import React, { useMemo, useState } from 'react';
import { List, Typography, Button, Segmented, Badge, Card, Tag, Empty, message } from 'antd';
import { BellOutlined, WarningOutlined, MessageOutlined, TrophyOutlined, NotificationOutlined, ReadOutlined, MailOutlined } from '@ant-design/icons';
import api from '../../api';

const { Text } = Typography;

const ICONS = {
  message: <MessageOutlined style={{ fontSize: 20, color: '#c62828' }} />,
  completion: <TrophyOutlined style={{ fontSize: 20, color: '#faad14' }} />,
  admin: <NotificationOutlined style={{ fontSize: 20, color: '#424242' }} />,
  alert: <BellOutlined style={{ fontSize: 20, color: '#fa8c16' }} />,
  deadline: <WarningOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />,
  course: <ReadOutlined style={{ fontSize: 20, color: '#757575' }} />
};

/**
 * Mailbox / notifications inbox shared by the student and teacher dashboards.
 *
 * Props
 *  - user                   the logged-in user (needs schoolId)
 *  - notifications          documents from GET /notifications/:schoolId (admin broadcasts, messages, friend requests, course completion...)
 *  - onNotificationsChange  state setter for `notifications`; called with an updater function
 *  - courseAlerts           alerts the dashboard derives from the user's courses (announcements, new tasks, deadlines)
 *  - onOpenCourse(code, tab) optional; makes course alerts clickable (tab = course tab to open, if the alert has one)
 */
export default function Mailbox({ user, notifications = [], onNotificationsChange, courseAlerts = [], onOpenCourse }) {
  const [filter, setFilter] = useState('all');

  const items = useMemo(() => {
    const fromNotifications = notifications.map(n => ({
      key: `n-${n._id}`, source: 'notification', kind: n.type || 'alert', id: n._id,
      title: n.title || 'Notification', body: n.message, date: new Date(n.createdAt), unread: !n.isRead
    }));
    const fromCourses = courseAlerts.map(a => ({
      key: `a-${a.id}`, source: 'course', kind: a.isUrgent ? 'deadline' : 'course',
      title: a.title, body: a.description, date: new Date(a.date), courseCode: a.courseCode, tab: a.tab, urgent: a.isUrgent
    }));
    return [...fromNotifications, ...fromCourses].sort((a, b) => b.date - a.date);
  }, [notifications, courseAlerts]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const visible = items.filter(i => {
    if (filter === 'unread') return i.unread;
    if (filter === 'course') return i.source === 'course';
    if (filter === 'notification') return i.source === 'notification';
    return true;
  });

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read', { userId: user.schoolId });
      onNotificationsChange?.(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) { message.error('Could not mark notifications as read.'); }
  };

  const handleClick = async (item) => {
    if (item.source === 'course') { if (onOpenCourse && item.courseCode) onOpenCourse(item.courseCode, item.tab); return; }
    if (!item.unread) return;
    onNotificationsChange?.(prev => prev.map(n => (n._id === item.id ? { ...n, isRead: true } : n)));
    try { await api.post('/notifications/read', { userId: user.schoolId, notificationId: item.id }); } catch (e) { /* UI already updated; the next refresh will correct it */ }
  };

  return (
    <Card style={{ maxWidth: 900, margin: '0 auto' }}
      title={<span><MailOutlined /> Mailbox &amp; Notifications {unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 8 }} />}</span>}
      extra={<Button onClick={markAllRead} disabled={unreadCount === 0}>Mark all as read</Button>}>
      <Segmented style={{ marginBottom: 16 }} value={filter} onChange={setFilter} options={[
        { value: 'all', label: `All (${items.length})` },
        { value: 'unread', label: `Unread (${unreadCount})` },
        { value: 'course', label: `Course Alerts (${courseAlerts.length})` },
        { value: 'notification', label: `Notifications (${notifications.length})` }
      ]} />

      <List
        dataSource={visible}
        rowKey="key"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing here yet." /> }}
        pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true }}
        renderItem={item => {
          const clickable = item.source === 'course' ? Boolean(onOpenCourse && item.courseCode) : item.unread;
          return (
            <List.Item
              onClick={() => handleClick(item)}
              style={{
                cursor: clickable ? 'pointer' : 'default', padding: '12px 14px', marginBottom: 6, borderRadius: 6,
                background: item.urgent ? '#fff1f0' : item.unread ? '#fff5f5' : 'transparent',
                border: `1px solid ${item.urgent ? '#ffa39e' : item.unread ? '#f5c2c0' : '#f0f0f0'}`
              }}
              extra={<Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{item.date.toLocaleString()}</Text>}>
              <List.Item.Meta
                avatar={ICONS[item.kind] || ICONS.alert}
                title={<span style={{ fontWeight: item.unread || item.urgent ? 700 : 400 }}>
                  {item.courseCode && <Tag color={item.urgent ? 'red' : 'blue'}>{item.courseCode}</Tag>}{item.title}
                </span>}
                description={item.body}
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
