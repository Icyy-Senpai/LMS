import React, { useEffect, useState } from 'react';
import { Modal, Select, Typography, Alert, Space, Tag, message } from 'antd';
import api from '../../api';

const { Text } = Typography;

export default function AssignTeacherBlockModal({ open, teacher, blocks = [], onClose, onAssigned }) {
  const [blockCode, setBlockCode] = useState();
  const [courseCode, setCourseCode] = useState();
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setBlockCode(undefined); setCourseCode(undefined); } }, [open, teacher?.schoolId]);

  const block = blocks.find(b => b.code === blockCode);
  const subject = block?.subjects?.find(s => s.code === courseCode);
  const teachesHere = (s) => s.professor?.schoolId === teacher?.schoolId;

  const submit = async () => {
    if (!blockCode || !courseCode) return message.warning('Choose a block and a subject.');
    setSaving(true);
    try {
      const res = await api.put(`/dean/blocks/${encodeURIComponent(blockCode)}/professor`, { courseCode, teacherId: teacher.schoolId });
      if (res.data.success) { message.success(res.data.message); onAssigned && onAssigned(); onClose(); }
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to assign the block.'); }
    setSaving(false);
  };

  return (
    <Modal title={teacher ? `Assign Block: ${teacher.lastName}, ${teacher.firstName}` : 'Assign Block'} open={open} onCancel={onClose}
      onOk={submit} okText="Assign" okButtonProps={{ disabled: !blockCode || !courseCode }} confirmLoading={saving} destroyOnHidden>
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Text type="secondary">Department: {teacher?.department || '-'}</Text>
        <div>
          <div style={{ marginBottom: 6 }}>Block</div>
          <Select style={{ width: '100%' }} showSearch optionFilterProp="label" placeholder="Choose a block" value={blockCode}
            onChange={(v) => { setBlockCode(v); setCourseCode(undefined); }} notFoundContent="No blocks yet. Create one in the Blocks tab."
            options={blocks.map(b => ({ value: b.code, label: `${b.code} - ${b.name} (${b.subjects?.length || 0} subjects)` }))} />
        </div>
        <div>
          <div style={{ marginBottom: 6 }}>Subject they will teach in this block</div>
          <Select style={{ width: '100%' }} placeholder={blockCode ? 'Choose a subject' : 'Choose a block first'} value={courseCode} onChange={setCourseCode}
            disabled={!blockCode} notFoundContent="This block has no subjects yet. Add them with Manage in the Blocks tab."
            options={(block?.subjects || []).map(s => ({
              value: s.code, disabled: teachesHere(s),
              label: `${s.code} - ${s.name}${teachesHere(s) ? ' (already teaching)' : s.professor ? ` · now: ${s.professor.name}` : ' · no professor'}`
            }))} />
        </div>
        {subject?.professor && !teachesHere(subject) && (
          <Alert type="warning" showIcon message={<span>{subject.professor.name} currently teaches <Tag>{subject.code}</Tag> in {blockCode} and will be replaced.</span>} />
        )}
      </Space>
    </Modal>
  );
}
