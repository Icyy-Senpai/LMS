import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import api from '../../api';
import { showError } from './adminUtils';

/** Sends a notification to everyone, all students, all teachers, or one course. */
export default function BroadcastModal({ open, courses, onClose }) {
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const audience = Form.useWatch('audience', form);

  useEffect(() => { if (open) { form.resetFields(); form.setFieldsValue({ audience: 'All' }); } }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setSending(true);
      const res = await api.post('/admin/broadcast', values);
      if (res.data.success) { message.success(res.data.message); onClose(); }
    } catch (err) { if (err?.response) showError(err, 'Failed to send notification.'); }
    setSending(false);
  };

  return (
    <Modal title="Send Announcement" open={open} onOk={handleOk} onCancel={onClose} okText="Send" confirmLoading={sending} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item name="audience" label="Send to" rules={[{ required: true }]}>
          <Select options={[{ value: 'All', label: 'Everyone (students + faculty)' }, { value: 'Student', label: 'All students' }, { value: 'Teacher', label: 'All faculty' }, { value: 'Course', label: 'One course (students + instructor)' }]} />
        </Form.Item>
        {audience === 'Course' && (
          <Form.Item name="courseCode" label="Course" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={courses.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} />
          </Form.Item>
        )}
        <Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="message" label="Message" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
      </Form>
    </Modal>
  );
}
