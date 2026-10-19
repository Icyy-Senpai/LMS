import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Row, Col, message } from 'antd';
import api from '../../api';
import { showError } from './adminUtils';

/** Create / Edit course modal. Pass `course` to edit, omit to create. */
export default function CourseFormModal({ open, course, programs = [], onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(course);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (course) form.setFieldsValue({ ...course });
    else form.setFieldsValue({ color: '#c62828' });
  }, [open, course, form]);

  const handleFinish = async (values) => {
    setSaving(true);
    try {
      const res = isEdit ? await api.put('/admin/courses', { ...values, code: course.code }) : await api.post('/admin/courses', values);
      if (res.data.success) { message.success(res.data.message); onSaved(); onClose(); }
    } catch (err) { showError(err, 'Failed to save course.'); }
    setSaving(false);
  };

  return (
    <Modal title={isEdit ? `Edit Course: ${course.code}` : 'Create New Course'} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {!isEdit && <Form.Item name="code" label="Course Code (unique)" rules={[{ required: true }]}><Input placeholder="e.g. CC101" /></Form.Item>}
        <Form.Item name="name" label="Course Name" rules={[{ required: true }]}><Input placeholder="e.g. Introduction to Computing" /></Form.Item>
        {/* Instructors are assigned by a Dean (Dean's Office > Course Assignments), not by admins. */}
        {isEdit && <Form.Item label="Instructor" extra="Instructors are assigned by a Dean."><Input disabled value={course.instructor && course.instructor !== 'TBA' ? course.instructor : 'TBA'} /></Form.Item>}
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="targetProgram" label="Target Program" rules={[{ required: true }]} extra="Students see this course in their catalog when this matches their department.">
              <Select showSearch optionFilterProp="label" placeholder="Select a department"
                options={[...new Set([...programs, course?.targetProgram].filter(Boolean))].map(p => ({ value: p, label: p }))}
                notFoundContent="No departments yet. Create one in the Departments tab." />
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item name="targetYear" label="Target Year" rules={[{ required: true }]}><Input placeholder="e.g. 1st Year" /></Form.Item></Col>
        </Row>
        <Form.Item name="color" label="Card Color"><Input type="color" style={{ width: 80, padding: 2 }} /></Form.Item>
        <Button type="primary" htmlType="submit" block loading={saving}>{isEdit ? 'Update Course' : 'Create Course'}</Button>
      </Form>
    </Modal>
  );
}
