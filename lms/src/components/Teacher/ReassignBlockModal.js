import React, { useEffect, useState } from 'react';
import { Modal, Select, Typography, Radio, message } from 'antd';
import api from '../../api';

const { Text } = Typography;

/**
 * Move a student to a different block (teachers + deans). A student is only ever in one block.
 * The person moving them chooses whether the student is also enrolled in the new block's subjects
 * (and removed from the old block's subjects), or whether course enrollment is left as it is.
 * `onSubmit(block, autoEnroll)` must return a promise; the modal closes when it resolves and shows the server's
 * error when it rejects.
 */
export default function ReassignBlockModal({ open, personLabel, currentBlock, onClose, onSubmit }) {
  const [blocks, setBlocks] = useState([]);
  const [target, setTarget] = useState();
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTarget(undefined);
    setAutoEnroll(true);
    setLoading(true);
    api.get('/staff/blocks')
      .then(res => { if (res.data.success) setBlocks(res.data.blocks); })
      .catch(err => message.error(err?.response?.data?.message || 'Failed to load blocks.'))
      .finally(() => setLoading(false));
  }, [open]);

  const submit = async () => {
    if (!target) return message.warning('Please select a block.');
    setSaving(true);
    try { await onSubmit(target, autoEnroll); onClose(); }
    catch (err) { message.error(err?.response?.data?.message || 'Failed to reassign block.'); }
    setSaving(false);
  };

  const options = blocks.filter(b => b.code !== currentBlock)
    .map(b => {
      const full = Boolean(b.maxAmountOfStudents) && b.studentCount >= b.maxAmountOfStudents;
      const cap = b.maxAmountOfStudents ? `${b.studentCount}/${b.maxAmountOfStudents} students` : `${b.studentCount} students`;
      return { value: b.code, label: `${b.code}  (${cap}, ${b.subjects?.length || 0} subjects)${full ? ' - full' : ''}`, disabled: full };
    });
  const chosen = blocks.find(b => b.code === target);

  return (
    <Modal title={`Reassign block: ${personLabel || ''}`} open={open} onCancel={onClose} onOk={submit}
      okText="Reassign" confirmLoading={saving} destroyOnHidden>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">Current block: </Text><Text strong>{currentBlock || 'None'}</Text>
      </div>
      <Select showSearch style={{ width: '100%' }} placeholder="Move to block..." loading={loading}
        value={target} onChange={setTarget} options={options} optionFilterProp="label"
        notFoundContent="No other blocks exist yet." />

      {target && (
        <div style={{ marginTop: 16 }}>
          <Text strong>Block subjects</Text>
          <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }} value={autoEnroll} onChange={e => setAutoEnroll(e.target.value)}>
            <Radio value={true}>
              Automatically enroll in {target}'s subjects
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {chosen?.subjects?.length ? chosen.subjects.map(s => s.code).join(', ') : 'This block has no subjects yet.'}
                {currentBlock ? ` Subjects only ${currentBlock} has are removed (completed courses are kept).` : ''}
              </Text>
            </Radio>
            <Radio value={false}>Keep course enrollment separate (only change the block)</Radio>
          </Radio.Group>
        </div>
      )}
    </Modal>
  );
}
