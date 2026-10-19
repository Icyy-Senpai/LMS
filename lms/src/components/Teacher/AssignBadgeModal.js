import React, { useEffect, useState } from 'react';
import { Modal, Empty, Tag, Typography, Spin, message } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import api from '../../api';

const { Text } = Typography;

/** Pick one of the course's badges (for the student's block) and assign it to the student. */
export default function AssignBadgeModal({ open, course, student, onClose, onAssigned }) {
  const [badges, setBadges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !course || !student?.block) { setBadges([]); return; }
    setSelected(null); setLoading(true);
    api.get(`/badges/course/${encodeURIComponent(course.code)}`, { params: { block: student.block } })
      .then(res => { if (res.data.success) setBadges(res.data.badges); })
      .catch(err => message.error(err?.response?.data?.message || 'Failed to load badges.'))
      .finally(() => setLoading(false));
  }, [open, course, student?.block]);

  // Only badges for this student's block can be given to them.
  const forBlock = badges.filter(b => b.block === student?.block);
  const hasIt = (b) => (b.studentsWithBadge || []).some(s => s.schoolId === student?.schoolId);

  const assign = async () => {
    if (!selected) return message.warning('Select a badge first.');
    setSaving(true);
    try {
      const res = await api.post(`/badges/${selected}/assign`, { studentId: student.schoolId });
      if (res.data.success) { message.success(res.data.message); onAssigned && onAssigned(); onClose(); }
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to assign the badge.'); }
    setSaving(false);
  };

  return (
    <Modal title={student ? `Assign Badge: ${student.lastName}, ${student.firstName}` : 'Assign Badge'} open={open} onCancel={onClose}
      onOk={assign} okText="Assign Badge" okButtonProps={{ disabled: !selected }} confirmLoading={saving} width={640} destroyOnHidden>
      <Text type="secondary">{course?.code} · Block {student?.block || '-'}</Text>
      {loading ? <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div> : forBlock.length === 0 ? (
        <Empty style={{ marginTop: 16 }} image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={`No badges exist for ${course?.code} in block ${student?.block || '-'}. Create one in the Badges section first.`} />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          {forBlock.map(b => {
            const owned = hasIt(b);
            const active = selected === b._id;
            return (
              <div key={b._id} onClick={() => { if (!owned) setSelected(b._id); }}
                style={{ width: 170, padding: 10, textAlign: 'center', borderRadius: 8, position: 'relative',
                  cursor: owned ? 'not-allowed' : 'pointer', opacity: owned ? 0.5 : 1,
                  border: active ? '2px solid #c62828' : '2px solid #f0f0f0', background: active ? '#fff5f5' : '#fff' }}>
                {active && <CheckCircleFilled style={{ position: 'absolute', top: 6, right: 6, color: '#c62828' }} />}
                <img src={b.photoUrl} alt={b.name} style={{ width: 72, height: 72, objectFit: 'contain' }} />
                <div><Text strong style={{ fontSize: 13 }}>{b.name}</Text></div>
                {owned && <Tag color="green" style={{ marginTop: 4 }}>Already awarded</Tag>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
