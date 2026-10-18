import React, { useState, useEffect } from 'react';
import { List, Tag, Typography, Button } from 'antd';
import { BellOutlined, WarningOutlined, MessageOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../../api';

const { Text, Title } = Typography;

export default function Mailbox({ user, enrolledCourses = [] }) {
  const [notifications, setNotifications] = useState([]);
  const [urgentTasks, setUrgentTasks] = useState([]);

  useEffect(() => {
    api.get(`/notifications/${user.schoolId}`).then(res => {
      if (res.data.success) setNotifications(res.data.notifications);
    });

    if (enrolledCourses.length > 0) {
      let upcoming = [];
      const fetchCourseData = async () => {
        for (let course of enrolledCourses) {
          try {
            const assRes = await api.get(`/assignments/${course.code}`);
            if (assRes.data.success) {
              assRes.data.assignments.forEach(ass => {
                const hasSubmitted = ass.submissions?.some(s => s.studentUsername === user.schoolId);
                if (!hasSubmitted && ass.deadline) {
                  const msUntilDue = new Date(ass.deadline) - new Date();
                  const hoursUntilDue = msUntilDue / (1000 * 60 * 60);
                  if (hoursUntilDue > 0 && hoursUntilDue <= 24) {
                    upcoming.push({ ...ass, courseCode: course.code, hoursLeft: Math.ceil(hoursUntilDue) });
                  }
                }
              });
            }
          } catch(e) {}
        }
        setUrgentTasks(upcoming);
      };
      fetchCourseData();
    }
  }, [user, enrolledCourses]);

  const markAsRead = async () => {
    await api.post('/notifications/read', { userId: user.schoolId });
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0 }}><BellOutlined /> Mailbox & Alerts</Title>
        <Button onClick={markAsRead}>Mark All as Read</Button>
      </div>

      {urgentTasks.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <Title level={5} type="danger"><WarningOutlined /> Action Required: Due within 24 Hours!</Title>
          <List
            dataSource={urgentTasks}
            renderItem={item => (
              <List.Item style={{ background: '#fff1f0', border: '1px solid #ffa39e', padding: '10px 15px', borderRadius: '4px', marginBottom: '8px' }}>
                <List.Item.Meta
                  title={<span><Tag color="red">{item.courseCode}</Tag> {item.title} ({item.type || 'Task'})</span>}
                  description={<strong>Due in {item.hoursLeft} hours! ({new Date(item.deadline).toLocaleString()})</strong>}
                />
              </List.Item>
            )}
          />
        </div>
      )}

      <Title level={5}>Recent Activity</Title>
      <List
        dataSource={notifications}
        locale={{ emptyText: "No new notifications." }}
        renderItem={item => (
          <List.Item style={{ opacity: item.isRead ? 0.6 : 1, background: item.isRead ? 'transparent' : '#f0f5ff', padding: '10px', borderRadius: '4px', marginBottom: '5px' }}>
            <List.Item.Meta
              avatar={item.type === 'message' ? <MessageOutlined style={{fontSize: '20px', color: '#1890ff'}}/> : <CheckCircleOutlined style={{fontSize: '20px', color: '#52c41a'}}/>}
              title={<span style={{ fontWeight: item.isRead ? 'normal' : 'bold' }}>{item.title}</span>}
              description={item.message}
            />
            <div style={{ fontSize: '12px', color: 'gray' }}>{new Date(item.createdAt).toLocaleString()}</div>
          </List.Item>
        )}
      />
    </div>
  );
}