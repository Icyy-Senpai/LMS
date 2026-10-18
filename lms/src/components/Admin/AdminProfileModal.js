import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Tabs, Row, Col, Button, message } from 'antd';
import api from '../../api';
import { showError } from './adminUtils';

/** Admin's own settings (mirrors the Student / Faculty Settings modals) + change password. */
export default function AdminProfileModal({ open, user, onClose, onUpdated }) {
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { form.setFieldsValue(user); pwForm.resetFields(); } }, [open, user, form, pwForm]);

  const saveProfile = async (values) => {
    setSaving(true);
    try {
      const res = await api.put('/admin/profile', values);
      if (res.data.success) { message.success(res.data.message); onUpdated(res.data.user); onClose(); }
    } catch (err) { showError(err, 'Failed to update profile.'); }
    setSaving(false);
  };

  const changePassword = async (values) => {
    setSaving(true);
    try {
      const res = await api.put('/admin/profile/password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      if (res.data.success) { message.success(res.data.message); pwForm.resetFields(); }
    } catch (err) { showError(err, 'Failed to change password.'); }
    setSaving(false);
  };

  return (
    <Modal title="Admin Settings" open={open} onCancel={onClose} footer={null} destroyOnHidden width={700}>
      <Tabs items={[
        { key: 'profile', label: 'Profile', children: (
          <Form form={form} layout="vertical" onFinish={saveProfile}>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
              <Col span={24}><Form.Item name="organization" label="Organization"><Input /></Form.Item></Col>
            </Row>
            <Button type="primary" htmlType="submit" block loading={saving}>Save Changes</Button>
          </Form>
        ) },
        { key: 'password', label: 'Change Password', children: (
          <Form form={pwForm} layout="vertical" onFinish={changePassword}>
            <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}><Input.Password /></Form.Item>
            <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}><Input.Password /></Form.Item>
            <Form.Item name="confirm" label="Confirm New Password" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({
              validator: (_, v) => (!v || getFieldValue('newPassword') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match')))
            })]}><Input.Password /></Form.Item>
            <Button type="primary" htmlType="submit" block loading={saving}>Change Password</Button>
          </Form>
        ) }
      ]} />
    </Modal>
  );
}
