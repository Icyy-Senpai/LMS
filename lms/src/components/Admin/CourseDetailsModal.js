import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Tabs, List, Button, Popconfirm, Select, Space, Tag, Typography, Empty, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError } from './adminUtils';
import CourseContentManager from './CourseContentManager';
import AssignmentsPanel from './AssignmentsPanel';

const { Text } = Typography;

/** Everything an admin can manage inside one course: roster, announcements, videos, materials, assignments. */
export default function CourseDetailsModal({ open, course, allUsers, onClose, onChanged }) {
  const [roster, setRoster] = useState({ students: [], teachers: [] });
  const [loading, setLoading] = useState(false);
  const [studentToAdd, setStudentToAdd] = useState();

  const loadRoster = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/courses/${course.code}/roster`);
      if (res.data.success) setRoster({ students: res.data.students, teachers: res.data.teachers });
    } catch (err) { showError(err, 'Failed to load roster.'); }
    setLoading(false);
  }, [course]);

  useEffect(() => { if (open) { loadRoster(); setStudentToAdd(undefined); } }, [open, loadRoster]);

  const enrolledIds = new Set(roster.students.map(s => s.schoolId));
  const candidates = allUsers.filter(u => u.accountType === 'Student' && !enrolledIds.has(u.schoolId))
    .map(u => ({ value: u.schoolId, label: `${u.lastName}, ${u.firstName} (${u.schoolId})` }));

  const enrol = async () => {
    if (!studentToAdd) return message.warning('Select a student first.');
    try {
      await api.post('/admin/assign-course', { schoolId: studentToAdd, accountType: 'Student', courseCode: course.code });
      message.success('Student enrolled.');
      setStudentToAdd(undefined); loadRoster(); onChanged();
    } catch (err) { showError(err, 'Failed to enrol student.'); }
  };

  const unenrol = async (schoolId, accountType) => {
    try {
      await api.post('/admin/remove-course', { schoolId, accountType, courseCode: course.code });
      message.success('Removed from course.');
      loadRoster(); onChanged();
    } catch (err) { showError(err, 'Failed to remove.'); }
  };

  const rosterTab = (
    <>
      <Text strong>Instructor</Text>
      <List size="small" dataSource={roster.teachers} locale={{ emptyText: 'No instructor assigned (TBA)' }} renderItem={t => (
        <List.Item actions={[<Popconfirm key="r" title="Remove instructor?" onConfirm={() => unenrol(t.schoolId, 'Teacher')} okText="Remove" cancelText="Cancel"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>]}>
          {t.lastName}, {t.firstName} <Tag style={{ marginLeft: 8 }}>{t.schoolId}</Tag>
        </List.Item>
      )} />
      <div style={{ marginTop: 16 }}><Text strong>Enrolled Students ({roster.students.length})</Text></div>
      <Space.Compact style={{ width: '100%', margin: '8px 0' }}>
        <Select showSearch placeholder="Enrol a student..." style={{ width: '100%' }} value={studentToAdd} onChange={setStudentToAdd} options={candidates} optionFilterProp="label" />
        <Button type="primary" icon={<PlusOutlined />} onClick={enrol}>Enrol</Button>
      </Space.Compact>
      <List size="small" loading={loading} dataSource={roster.students} locale={{ emptyText: <Empty description="No students enrolled" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{ pageSize: 6, size: 'small', hideOnSinglePage: true }}
        renderItem={s => (
          <List.Item actions={[<Popconfirm key="r" title="Unenrol this student?" onConfirm={() => unenrol(s.schoolId, 'Student')} okText="Unenrol" cancelText="Cancel"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>]}>
            <List.Item.Meta title={`${s.lastName}, ${s.firstName}`} description={`${s.schoolId} · ${s.department || '-'} · ${s.block || '-'}`} />
          </List.Item>
        )} />
    </>
  );

  return (
    <Modal title={course ? `${course.code}: ${course.name}` : 'Course'} open={open} onCancel={onClose} footer={<Button type="primary" onClick={onClose}>Close</Button>} width={900} destroyOnHidden>
      {course && (
        <Tabs destroyOnHidden items={[
          { key: 'roster', label: 'Roster', children: rosterTab },
          { key: 'ann', label: 'Announcements', children: <CourseContentManager courseCode={course.code} kind="announcements" /> },
          { key: 'vid', label: 'Videos', children: <CourseContentManager courseCode={course.code} kind="videos" /> },
          { key: 'mat', label: 'Materials', children: <CourseContentManager courseCode={course.code} kind="materials" /> },
          { key: 'asg', label: 'Assignments & Quizzes', children: <AssignmentsPanel courseCode={course.code} onChanged={onChanged} /> }
        ]} />
      )}
    </Modal>
  );
}
