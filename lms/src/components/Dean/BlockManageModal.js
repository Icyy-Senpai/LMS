import React, { useEffect, useState } from 'react';
import { Modal, Table, Select, Button, Checkbox, Popconfirm, Space, Tag, Typography, Empty, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api';

const { Text } = Typography;

export default function BlockManageModal({ open, block, courses = [], teachers = [], department, onClose, onChanged }) {
  const [newCourse, setNewCourse] = useState();
  const [enrollStudents, setEnrollStudents] = useState(true);
  const [unenrollOnRemove, setUnenrollOnRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setNewCourse(undefined); setEnrollStudents(true); } }, [open, block?.code]);

  const run = async (request, fallback) => {
    setBusy(true);
    let ok = false;
    try {
      const res = await request();
      if (res.data.success) { ok = true; message.success(res.data.message); onChanged && onChanged(); }
    } catch (err) { message.error(err?.response?.data?.message || fallback); }
    setBusy(false);
    return ok;
  };

  if (!block) return null;
  const path = `/dean/blocks/${encodeURIComponent(block.code)}`;
  const subjects = block.subjects || [];
  const available = courses.filter(c => !subjects.some(s => s.code === c.code));
  const teacherOptions = teachers.filter(t => t.status !== 'Suspended')
    .map(t => ({ value: t.schoolId, label: `${t.lastName}, ${t.firstName} (${t.schoolId})${t.isDean ? ' · Dean' : ''}` }));

  const addSubject = () => {
    if (!newCourse) return message.warning('Choose a subject to add.');
    run(() => api.post(`${path}/subjects`, { courseCode: newCourse, enrollStudents }), 'Failed to add the subject.')
      .then(ok => { if (ok) setNewCourse(undefined); });
  };
  const setProfessor = (courseCode, teacherId) =>
    run(() => api.put(`${path}/professor`, { courseCode, teacherId: teacherId || '' }), 'Failed to set the professor.');
  const removeSubject = (courseCode) =>
    run(() => api.delete(`${path}/subjects/${encodeURIComponent(courseCode)}`, { params: { unenroll: unenrollOnRemove } }), 'Failed to remove the subject.');

  const columns = [
    { title: 'Subject', key: 'subject', render: (_, s) => (
      <Space><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: s.color || '#d9d9d9' }} /><Text strong>{s.code}</Text><Text>{s.name}</Text></Space>
    ) },
    { title: `Professor (from ${department || 'your department'})`, key: 'professor', width: 320, render: (_, s) => (
      <Select style={{ width: '100%' }} showSearch allowClear optionFilterProp="label" placeholder="No professor yet"
        disabled={busy || Boolean(s.professor && !teacherOptions.some(o => o.value === s.professor.schoolId))}
        value={s.professor?.schoolId} onChange={(v) => setProfessor(s.code, v)}
        notFoundContent={`No teachers in your department (${department || 'none set'}).`}
        options={s.professor && !teacherOptions.some(o => o.value === s.professor.schoolId)
          ? [{ value: s.professor.schoolId, label: `${s.professor.name} (not in your department or suspended)`, disabled: true }, ...teacherOptions]
          : teacherOptions} />
    ) },
    { title: '', key: 'remove', width: 60, render: (_, s) => (
      <Popconfirm title={`Remove ${s.code} from ${block.code}?`} okText="Remove" cancelText="Cancel" okButtonProps={{ danger: true }}
        onOpenChange={(o) => { if (o) setUnenrollOnRemove(false); }}
        description={(
          <div style={{ maxWidth: 260 }}>
            <div>Its professor here is unassigned too.</div>
            <Checkbox checked={unenrollOnRemove} onChange={e => setUnenrollOnRemove(e.target.checked)}>Also un-enroll this block's students</Checkbox>
          </div>
        )}
        onConfirm={() => removeSubject(s.code)}>
        <Button size="small" danger icon={<DeleteOutlined />} disabled={busy} />
      </Popconfirm>
    ) }
  ];

  return (
    <Modal title={`Block ${block.code}: ${block.name}`} open={open} onCancel={onClose} footer={null} width={860} destroyOnHidden>
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag color="blue">{block.maxAmountOfStudents ? `${block.studentCount} / ${block.maxAmountOfStudents}` : block.studentCount} students</Tag>
        <Tag>{subjects.length} subjects</Tag>
        <Tag>{block.teacherCount} professors</Tag>
      </Space>

      <Table size="small" rowKey="code" dataSource={subjects} columns={columns} pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No subjects registered to this block yet." /> }} />

      <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <Text strong>Add a subject</Text>
        <Space wrap style={{ display: 'flex', marginTop: 8 }}>
          <Select style={{ width: 340 }} showSearch optionFilterProp="label" placeholder="Choose a subject" value={newCourse} onChange={setNewCourse}
            options={available.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} notFoundContent="Every course is already registered to this block." />
          <Checkbox checked={enrollStudents} onChange={e => setEnrollStudents(e.target.checked)}>
            Enroll this block's {block.studentCount} student{block.studentCount === 1 ? '' : 's'} in it
          </Checkbox>
          <Button type="primary" icon={<PlusOutlined />} loading={busy} onClick={addSubject}>Add Subject</Button>
        </Space>
      </div>
    </Modal>
  );
}
