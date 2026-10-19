import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Tabs, List, Button, Tag, Typography, Empty, Select, Space } from 'antd';
import dayjs from 'dayjs';
import api from '../../api';
import { showError } from './adminUtils';
import CourseContentManager from './CourseContentManager';

const { Text } = Typography;

export default function CourseDetailsModal({ open, course, onClose, onChanged }) {
  const [roster, setRoster] = useState({ students: [], teachers: [], completedStudents: [] });
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [contentBlock, setContentBlock] = useState('');

  const loadRoster = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/courses/${course.code}/roster`);
      if (res.data.success) setRoster({ students: res.data.students, teachers: res.data.teachers, completedStudents: res.data.completedStudents || [] });
    } catch (err) { showError(err, 'Failed to load roster.'); }
    setLoading(false);
  }, [course]);

  useEffect(() => { if (open) loadRoster(); }, [open, loadRoster]);

  useEffect(() => {
    if (!open || !course) return;
    setContentBlock('');
    api.get('/admin/blocks')
      .then(res => { if (res.data.success) setBlocks(res.data.blocks.filter(b => (b.subjects || []).some(s => s.code === course.code))); })
      .catch(() => setBlocks([]));
  }, [open, course]);

  const blockPicker = (
    <Space style={{ marginBottom: 12 }}>
      <Text type="secondary">Block:</Text>
      <Select style={{ width: 320 }} value={contentBlock} onChange={setContentBlock}
        options={[
          { value: '', label: 'Course-wide (older content, copied to new blocks)' },
          ...blocks.map(b => ({ value: b.code, label: `${b.code} - ${b.name}` }))
        ]} />
    </Space>
  );
  const contentTab = (kind) => (
    <>{blockPicker}<CourseContentManager key={`${kind}-${contentBlock}`} courseCode={course.code} kind={kind} block={contentBlock} /></>
  );

  const rosterTab = (
    <>
      <Text strong>Instructor</Text>
      <List size="small" dataSource={roster.teachers} locale={{ emptyText: 'No instructor assigned (TBA)' }} renderItem={t => (
        <List.Item>{t.lastName}, {t.firstName} <Tag style={{ marginLeft: 8 }}>{t.schoolId}</Tag></List.Item>
      )} />
      <div style={{ marginTop: 16 }}><Text strong>Enrolled Students ({roster.students.length})</Text></div>
      <List size="small" loading={loading} dataSource={roster.students} locale={{ emptyText: <Empty description="No students enrolled" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{ pageSize: 6, size: 'small', hideOnSinglePage: true }}
        renderItem={s => (
          <List.Item>
            <List.Item.Meta title={`${s.lastName}, ${s.firstName}`} description={`${s.schoolId} · ${s.department || '-'} · ${s.block || '-'}`} />
          </List.Item>
        )} />
      <div style={{ marginTop: 16 }}><Text strong>Completed ({roster.completedStudents.length})</Text></div>
      <List size="small" dataSource={roster.completedStudents} locale={{ emptyText: <Empty description="No students have completed this course yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{ pageSize: 6, size: 'small', hideOnSinglePage: true }}
        renderItem={s => (
          <List.Item extra={<Tag color="green">Completed</Tag>}>
            <List.Item.Meta title={`${s.lastName}, ${s.firstName}`}
              description={`${s.schoolId}${s.completion?.completedAt ? ` · ${dayjs(s.completion.completedAt).format('MMM D, YYYY')}` : ''}${s.completion?.completedBy ? ` · by ${s.completion.completedBy}` : ''}`} />
          </List.Item>
        )} />
    </>
  );

  return (
    <Modal title={course ? `${course.code}: ${course.name}` : 'Course'} open={open} onCancel={onClose} footer={<Button type="primary" onClick={onClose}>Close</Button>} width={900} destroyOnHidden>
      {course && (
        <Tabs destroyOnHidden items={[
          { key: 'roster', label: 'Roster', children: rosterTab },
          { key: 'ann', label: 'Announcements', children: contentTab('announcements') },
          { key: 'vid', label: 'Videos', children: contentTab('videos') },
          { key: 'mat', label: 'Materials', children: contentTab('materials') }
        ]} />
      )}
    </Modal>
  );
}
