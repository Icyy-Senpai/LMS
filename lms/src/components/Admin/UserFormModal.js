import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, Divider, Tag, Switch, Radio, message } from 'antd';
import api from '../../api';
import { showError } from './adminUtils';

const GENDERS = ['Male', 'Female', 'Other'].map(v => ({ value: v }));
const CIVIL = ['Single', 'Married', 'Widowed', 'Separated'].map(v => ({ value: v }));

/**
 * Add / Edit user modal (Student, Teacher or Admin).
 * mode = 'create' | 'edit'. In edit mode `user` is the row being edited.
 */
export default function UserFormModal({ open, mode, user, programs = [], onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const isEdit = mode === 'edit';
  const watchedBlock = Form.useWatch('block', form);
  const watchedType = Form.useWatch('accountType', form);
  const accountType = isEdit ? user?.accountType : watchedType;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (isEdit && user) {
      form.setFieldsValue({ ...user, schoolEmail: user.schoolEmail || user.email, email: user.email, isDean: user.isDean === true, block: user.block || undefined, autoEnrollBlockSubjects: true });
    } else {
      form.setFieldsValue({ accountType: 'Student', isDean: false, autoEnrollBlockSubjects: true });
    }
  }, [open, isEdit, user, form]);

  // Blocks a student can be placed in (created by Deans).
  useEffect(() => {
    if (!open) return;
    api.get('/admin/blocks')
      .then(res => { if (res.data.success) setBlocks(res.data.blocks); })
      .catch(() => setBlocks([]));
  }, [open]);

  // New Student / Teacher: preview the School ID the server will assign (next number after the highest existing one).
  // The server picks the final value when the account is created, so this is display-only.
  useEffect(() => {
    if (!open || isEdit || (accountType !== 'Student' && accountType !== 'Teacher')) return;
    let cancelled = false;
    form.setFieldsValue({ schoolId: undefined });
    api.get('/admin/next-school-id', { params: { accountType } })
      .then(res => { if (!cancelled && res.data.success) form.setFieldsValue({ schoolId: res.data.schoolId }); })
      .catch(() => { /* the field just stays on its placeholder; the server still assigns an ID */ });
    return () => { cancelled = true; };
  }, [open, isEdit, accountType, form]);

  const handleFinish = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values };
      if (!isEdit) delete payload.schoolId; // always assigned by the server
      ['mobileNum', 'teleNum'].forEach(k => { if (payload[k] !== undefined && payload[k] !== '') payload[k] = Number(payload[k]); });
      if (payload.yearLevel !== undefined) payload.yearLevel = Number(payload.yearLevel);
      if (accountType === 'Student') payload.block = values.block || ''; // '' = not in a block
      else { delete payload.block; delete payload.autoEnrollBlockSubjects; }
      const res = isEdit
        ? await api.put('/admin/users', { ...payload, id: user._id, accountType: user.accountType })
        : await api.post('/admin/users', payload);
      if (res.data.success) {
        message.success(res.data.message);
        onSaved();
        onClose();
      }
    } catch (err) { showError(err, 'Failed to save user.'); }
    setSaving(false);
  };

  // Departments are created by the admin (Departments tab). Keep a user's current value selectable even if it is not registered.
  const programOptions = [...new Set([...programs, user?.department].filter(Boolean))].map(p => ({ value: p, label: p }));
  const isAdminType = accountType === 'Admin';

  return (
    <Modal
      title={isEdit ? `Edit ${user?.accountType}: ${user?.firstName || ''} ${user?.lastName || ''}` : 'Add New User'}
      open={open} onCancel={onClose} footer={null} destroyOnHidden width={800}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {!isEdit && (
          <Form.Item name="accountType" label="Account Type" rules={[{ required: true }]}>
            <Select options={[{ value: 'Student' }, { value: 'Teacher' }, { value: 'Admin' }]} />
          </Form.Item>
        )}
        {isEdit && <div style={{ marginBottom: 16 }}><Tag color={accountType === 'Teacher' ? 'blue' : accountType === 'Admin' ? 'purple' : 'green'}>{accountType}</Tag>{accountType === 'Teacher' && user?.isDean === true && <Tag color="gold">Dean</Tag>}</div>}

        <Divider orientation="left" plain>Account</Divider>
        <Row gutter={16}>
          {isAdminType ? (
            <Col span={12}>
              <Form.Item name="username" label="Username" rules={[{ required: !isEdit }]}><Input disabled={isEdit} /></Form.Item>
            </Col>
          ) : (
            <Col span={12}>
              <Form.Item name="schoolId" label="School / Faculty ID"
                extra={isEdit ? 'The ID cannot be changed because records reference it.' : 'Assigned automatically: the next number after the highest existing ID.'}>
                <Input disabled placeholder={isEdit ? undefined : 'Generating...'} />
              </Form.Item>
            </Col>
          )}
          <Col span={12}>
            <Form.Item name={isAdminType ? 'email' : 'schoolEmail'} label={isAdminType ? 'Email' : 'School Email (login)'} rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          </Col>
          {!isEdit && (
            <Col span={12}>
              <Form.Item name="password" label="Temporary Password" rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}><Input.Password /></Form.Item>
            </Col>
          )}
        </Row>

        <Divider orientation="left" plain>Personal Details</Divider>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          {!isAdminType && <Col span={8}><Form.Item name="middleName" label="Middle Name"><Input /></Form.Item></Col>}
          <Col span={8}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          {!isAdminType && (
            <>
              <Col span={6}><Form.Item name="suffix" label="Suffix"><Input placeholder="Jr., III" /></Form.Item></Col>
              <Col span={6}><Form.Item name="bithDate" label="Birth Date"><Input type="date" /></Form.Item></Col>
              <Col span={6}><Form.Item name="gender" label="Gender"><Select options={GENDERS} allowClear /></Form.Item></Col>
              <Col span={6}><Form.Item name="civilStatus" label="Civil Status"><Select options={CIVIL} allowClear /></Form.Item></Col>
            </>
          )}
        </Row>

        <Divider orientation="left" plain>Contact</Divider>
        <Row gutter={16}>
          {isAdminType ? (
            <>
              <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="organization" label="Organization"><Input /></Form.Item></Col>
            </>
          ) : (
            <>
              <Col span={12}><Form.Item name="personalEmail" label="Personal Email"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="mobileNum" label="Mobile Number"><Input type="number" /></Form.Item></Col>
              <Col span={24}><Form.Item name="presentAddress" label="Present Address"><Input /></Form.Item></Col>
            </>
          )}
        </Row>

        {!isAdminType && (
          <>
            <Divider orientation="left" plain>School</Divider>
            <Row gutter={16}>
              <Col span={accountType === 'Student' ? 12 : 24}>
                <Form.Item name="department" label={accountType === 'Student' ? 'Program / Department' : 'Department'} rules={[{ required: accountType === 'Student' }]}
                  extra={accountType === 'Student' ? 'Courses whose Target Program matches this department appear in the student\'s catalog.' : undefined}>
                  <Select showSearch allowClear={accountType !== 'Student'} options={programOptions} optionFilterProp="label" placeholder="Select a department" notFoundContent="No departments yet. Create one in the Departments tab." />
                </Form.Item>
              </Col>
              {accountType === 'Teacher' && (
                <Col span={24}>
                  {/* isDean is strictly true / false. false = Teacher dashboard at login, true = Dean's dashboard. */}
                  <Form.Item name="isDean" label="Dean Account" valuePropName="checked"
                    extra="Off: logs in to the Teacher dashboard. On: logs in to the Dean's dashboard (all teacher features, plus reassigning teachers to blocks and reassigning users with courses).">
                    <Switch checkedChildren="Dean" unCheckedChildren="Teacher" />
                  </Form.Item>
                </Col>
              )}
              {accountType === 'Student' && (
                <>
                  <Col span={6}><Form.Item name="yearLevel" label="Year Level" rules={[{ required: true }]}><Select options={[1, 2, 3, 4, 5].map(v => ({ value: v, label: `Year ${v}` }))} /></Form.Item></Col>
                  <Col span={6}>
                    <Form.Item name="block" label="Block">
                      <Select showSearch allowClear placeholder="No block" optionFilterProp="label" notFoundContent="No blocks yet. A Dean creates them."
                        options={blocks.map(b => {
                          const full = Boolean(b.maxAmountOfStudents) && b.studentCount >= b.maxAmountOfStudents && b.code !== user?.block;
                          return { value: b.code, label: `${b.code}${full ? ' (full)' : ''}`, disabled: full };
                        })} />
                    </Form.Item>
                  </Col>
                  {watchedBlock && watchedBlock !== (isEdit ? user?.block || '' : '') && (
                    <Col span={24}>
                      <Form.Item name="autoEnrollBlockSubjects" label="Block subjects">
                        <Radio.Group options={[
                          { value: true, label: `Enroll in ${watchedBlock}'s subjects automatically` },
                          { value: false, label: 'Keep course enrollment separate' }
                        ]} />
                      </Form.Item>
                    </Col>
                  )}
                </>
              )}
            </Row>
          </>
        )}

        <Button type="primary" htmlType="submit" block loading={saving}>{isEdit ? 'Save Changes' : 'Create Account'}</Button>
      </Form>
    </Modal>
  );
}
