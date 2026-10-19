import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message } from 'antd';
import api from '../../api';

export default function BlockFormModal({ open, onClose, onCreated }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) form.resetFields(); }, [open, form]);

  const submit = async (values) => {
    setSaving(true);
    try {
      const res = await api.post('/dean/blocks', {
        code: values.code, name: values.name,
        maxAmountOfStudents: values.maxAmountOfStudents ?? null
      });
      if (res.data.success) { message.success(res.data.message); onCreated && onCreated(res.data.block); onClose(); }
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to create the block.'); }
    setSaving(false);
  };

  return (
    <Modal title="Create Block" open={open} onCancel={onClose} onOk={() => form.submit()} okText="Create Block" confirmLoading={saving} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="code" label="Block Code (unique)" rules={[{ required: true, whitespace: true, message: 'Enter a block code' }]}
          extra="Letters, numbers, spaces, - and _ (max 20). This is the value students and teachers are assigned to.">
          <Input maxLength={20} placeholder="e.g. IT201" />
        </Form.Item>
        <Form.Item name="name" label="Block Name" rules={[{ required: true, whitespace: true, message: 'Enter a block name' }]}>
          <Input maxLength={80} placeholder="e.g. BSIT 2nd Year - Block 1" />
        </Form.Item>
        <Form.Item name="maxAmountOfStudents" label="Maximum Students" extra="Optional. Leave empty for no limit; students cannot be moved into a full block.">
          <InputNumber min={1} max={500} precision={0} style={{ width: '100%' }} placeholder="e.g. 40" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
