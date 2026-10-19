import React, { useEffect, useState } from 'react';
import { Modal, Select, Typography, message } from 'antd';
import api from '../../api';

const { Text } = Typography;

/**
 * Pick a different block for a student (teachers + deans) or a teacher (deans).
 * `onSubmit(block)` must return a promise; the modal closes when it resolves and shows the server's error when it rejects.
 */
export default function ReassignBlockModal({ open, personLabel, currentBlock, studentMove = true, onClose, onSubmit }) {
  const [blocks, setBlocks] = useState([]);
  const [target, setTarget] = useState();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTarget(undefined);
    setLoading(true);
    api.get('/staff/blocks')
      .then(res => { if (res.data.success) setBlocks(res.data.blocks); })
      .catch(err => message.error(err?.response?.data?.message || 'Failed to load blocks.'))
      .finally(() => setLoading(false));
  }, [open]);

  const submit = async () => {
    if (!target) return message.warning('Please select a block.');
    setSaving(true);
    try { await onSubmit(target); onClose(); }
    catch (err) { message.error(err?.response?.data?.message || 'Failed to reassign block.'); }
    setSaving(false);
  };

  const options = blocks.filter(b => b.code !== currentBlock)
    .map(b => {
      const full = Boolean(b.maxAmountOfStudents) && b.studentCount >= b.maxAmountOfStudents;
      const cap = b.maxAmountOfStudents ? `${b.studentCount}/${b.maxAmountOfStudents} students` : `${b.studentCount} students`;
      return { value: b.code, label: `${b.code}  (${cap}, ${b.teacherCount} teachers)${full ? ' - full' : ''}`, disabled: full && studentMove };
    });

  return (
    <Modal title={`Reassign block: ${personLabel || ''}`} open={open} onCancel={onClose} onOk={submit}
      okText="Reassign" confirmLoading={saving} destroyOnHidden>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">Current block: </Text><Text strong>{currentBlock || 'None'}</Text>
      </div>
      <Select showSearch style={{ width: '100%' }} placeholder="Move to block..." loading={loading}
        value={target} onChange={setTarget} options={options} optionFilterProp="label"
        notFoundContent="No other blocks exist yet." />
    </Modal>
  );
}
