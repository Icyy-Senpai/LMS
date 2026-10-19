import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Empty, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined, TrophyOutlined } from '@ant-design/icons';
import api from '../../api';
import BadgeFormModal from './BadgeFormModal';

const { Text } = Typography;

/** The "Badges" section of the course workspace: lists this course's badges and lets the teacher / dean create more. */
export default function BadgesSection({ course }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/badges/course/${course.code}`);
      if (res.data.success) setBadges(res.data.badges);
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to load badges.'); }
    setLoading(false);
  }, [course.code]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    try {
      const res = await api.delete(`/badges/${id}`);
      if (res.data.success) { message.success(res.data.message); load(); }
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to delete the badge.'); }
  };

  return (
    <Card size="small" loading={loading && badges.length === 0} style={{ border: '1px solid #d9d9d9' }}
      title={<span><TrophyOutlined /> Badges</span>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>Create Badge</Button>}>
      {badges.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No badges yet. Create one, then assign it to students from the roster above." />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {badges.map(b => (
            <div key={b._id} style={{ width: 220, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, textAlign: 'center', background: '#fafafa' }}>
              <img src={b.photoUrl} alt={b.name} style={{ width: 96, height: 96, objectFit: 'contain' }} />
              <div style={{ marginTop: 8 }}><Text strong>{b.name}</Text></div>
              <Space size={4} style={{ margin: '4px 0 8px' }}><Tag color="blue">Block {b.block}</Tag><Tag>{b.studentsWithBadge?.length || 0} awarded</Tag></Space>
              <Popconfirm title="Delete this badge?" description="Students who earned it will lose it from their profile." okText="Delete" cancelText="Cancel" onConfirm={() => remove(b._id)}>
                <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            </div>
          ))}
        </div>
      )}
      <BadgeFormModal open={formOpen} course={course} onClose={() => setFormOpen(false)} onCreated={load} />
    </Card>
  );
}
