import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Popconfirm, Modal, Form, Input, Tag, Tooltip, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api';
import { showError } from './adminUtils';

const { Text } = Typography;

/** Create / edit one department. Pass `dept` to edit. */
function DepartmentFormModal({ open, dept, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(dept);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (dept) form.setFieldsValue({ name: dept.name, code: dept.code, description: dept.description });
  }, [open, dept, form]);

  const handleFinish = async (values) => {
    setSaving(true);
    try {
      const res = isEdit ? await api.put(`/admin/departments/${dept._id}`, values) : await api.post('/admin/departments', values);
      if (res.data.success) { message.success(res.data.message); onSaved(); onClose(); }
    } catch (err) { showError(err, 'Failed to save department.'); }
    setSaving(false);
  };

  return (
    <Modal title={isEdit ? `Edit Department: ${dept.name}` : 'Create Department'} open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="name" label="Department / Program Name" rules={[{ required: true, whitespace: true, message: 'Name is required' }]}
          extra={isEdit ? 'Renaming also updates every student, teacher and course that uses this department.' : 'e.g. BS Information Technology. Students see courses whose Target Program matches this name.'}>
          <Input placeholder="e.g. BS Information Technology" />
        </Form.Item>
        <Form.Item name="code" label="Short Code (optional)"><Input placeholder="e.g. BSIT" /></Form.Item>
        <Form.Item name="description" label="Description (optional)"><Input.TextArea rows={3} /></Form.Item>
        <Button type="primary" htmlType="submit" block loading={saving}>{isEdit ? 'Save Changes' : 'Create Department'}</Button>
      </Form>
    </Modal>
  );
}

/** Admin "Departments" tab: list, create, rename and delete departments. */
export default function DepartmentsPanel({ departments, loading, onChanged }) {
  const [modal, setModal] = useState({ open: false, dept: null });

  const handleDelete = async (d) => {
    try {
      const res = await api.delete(`/admin/departments/${d._id}`);
      if (res.data.success) { message.success(res.data.message); onChanged(); }
    } catch (err) { showError(err, 'Failed to delete department.'); }
  };

  const columns = [
    { title: 'Department / Program', dataIndex: 'name', render: n => <Text strong>{n}</Text> },
    { title: 'Code', dataIndex: 'code', render: c => c || '-' },
    { title: 'Students', dataIndex: 'studentCount', render: n => <Tag color="green">{n || 0}</Tag> },
    { title: 'Teachers', dataIndex: 'teacherCount', render: n => <Tag color="blue">{n || 0}</Tag> },
    { title: 'Courses', dataIndex: 'courseCount', render: n => <Tag>{n || 0}</Tag> },
    { title: 'Description', dataIndex: 'description', ellipsis: true, render: d => d || '-' },
    { title: 'Actions', key: 'actions', render: (_, d) => {
      const inUse = (d.studentCount || 0) + (d.teacherCount || 0) + (d.courseCount || 0) > 0;
      return (
        <Space>
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => setModal({ open: true, dept: d })}>Edit</Button>
          <Tooltip title={inUse ? 'In use. Reassign its students, teachers and courses before deleting.' : ''}>
            <span>
              <Popconfirm title={`Delete ${d.name}?`} onConfirm={() => handleDelete(d)} okText="Delete" cancelText="Cancel" disabled={inUse}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={inUse} />
              </Popconfirm>
            </span>
          </Tooltip>
        </Space>
      );
    } }
  ];

  return (
    <>
      <Card title="Department Management" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, dept: null })}>Create Department</Button>}>
        <Table dataSource={departments} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10, hideOnSinglePage: true }} locale={{ emptyText: 'No departments yet. Create one to get started.' }} />
      </Card>
      <DepartmentFormModal open={modal.open} dept={modal.dept} onClose={() => setModal(m => ({ ...m, open: false }))} onSaved={onChanged} />
    </>
  );
}
