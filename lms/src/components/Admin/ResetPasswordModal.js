import React, { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import api from '../../api';
import { showError, fullName } from './adminUtils';

export default function ResetPasswordModal({ open, user, onClose }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    try {
      const { newPassword } = await form.validateFields();
      setSaving(true);
      const res = await api.put('/admin/users/password', { id: user._id, accountType: user.accountType, newPassword });
      if (res.data.success) { message.success(res.data.message); form.resetFields(); onClose(); }
    } catch (err) { if (err?.response) showError(err, 'Failed to reset password.'); }
    setSaving(false);
  };

  return (
    <Modal title={`Reset Password: ${fullName(user)}`} open={open} onOk={handleOk} onCancel={onClose} okText="Reset Password" confirmLoading={saving} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}><Input.Password /></Form.Item>
        <Form.Item name="confirm" label="Confirm Password" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({
          validator: (_, v) => (!v || getFieldValue('newPassword') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')))
        })]}><Input.Password /></Form.Item>
      </Form>
    </Modal>
  );
}
