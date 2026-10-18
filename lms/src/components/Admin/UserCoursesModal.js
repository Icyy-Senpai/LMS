import React, { useEffect, useState } from 'react';
import { Modal, List, Button, Popconfirm, Select, Space, Typography, Empty, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError, fullName, getUserCourseCodes } from './adminUtils';

const { Text } = Typography;

/** Combined "view + assign + remove courses" modal for a Student or Teacher. */
export default function UserCoursesModal({ open, user, courses, onClose, onChanged }) {
  const [codes, setCodes] = useState([]);
  const [target, setTarget] = useState();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setCodes(getUserCourseCodes(user)); setTarget(undefined); } }, [open, user]);

  const isTeacher = user?.accountType === 'Teacher';
  const nameOf = (code) => courses.find(c => c.code === code)?.name || '';

  const assign = async () => {
    if (!target) return message.warning('Please select a course.');
    setBusy(true);
    try {
      const res = await api.post('/admin/assign-course', { schoolId: user.schoolId, accountType: user.accountType, courseCode: target });
      if (res.data.success) { message.success(res.data.message); setCodes(prev => [...prev, target]); setTarget(undefined); onChanged(); }
    } catch (err) { showError(err, 'Failed to assign course.'); }
    setBusy(false);
  };

  const remove = async (courseCode) => {
    try {
      const res = await api.post('/admin/remove-course', { schoolId: user.schoolId, accountType: user.accountType, courseCode });
      if (res.data.success) { message.success(`${courseCode} removed.`); setCodes(prev => prev.filter(c => c !== courseCode)); onChanged(); }
    } catch (err) { showError(err, 'Failed to remove course.'); }
  };

  const options = courses.filter(c => !codes.includes(c.code)).map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }));

  return (
    <Modal title={`${isTeacher ? 'Teaching load' : 'Enrolled courses'}: ${fullName(user)}`} open={open} onCancel={onClose} footer={<Button type="primary" onClick={onClose}>Close</Button>} destroyOnHidden>
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Select showSearch placeholder={isTeacher ? 'Assign as instructor of...' : 'Enrol in course...'} style={{ width: '100%' }} value={target} onChange={setTarget} options={options}
          filterOption={(i, o) => o.label.toLowerCase().includes(i.toLowerCase())} />
        <Button type="primary" icon={<PlusOutlined />} loading={busy} onClick={assign}>{isTeacher ? 'Assign' : 'Enrol'}</Button>
      </Space.Compact>
      {isTeacher && <Text type="secondary" style={{ fontSize: 12 }}>A course has one instructor. Assigning it here replaces the current instructor.</Text>}
      <List style={{ marginTop: 12 }} dataSource={codes} locale={{ emptyText: <Empty description="No courses yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        renderItem={code => (
          <List.Item actions={[
            <Popconfirm key="rm" title={`Remove ${code}?`} onConfirm={() => remove(code)} okText="Remove" cancelText="Cancel">
              <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
            </Popconfirm>
          ]}>
            <List.Item.Meta title={<Text strong>{code}</Text>} description={nameOf(code) || 'Course no longer exists'} />
          </List.Item>
        )} />
    </Modal>
  );
}
