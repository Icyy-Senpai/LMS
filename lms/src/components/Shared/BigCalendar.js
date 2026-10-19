import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Calendar, Button, Input, TimePicker, Checkbox, Popconfirm, Tag, Typography, Segmented, Tooltip, message } from 'antd';
import { PlusOutlined, BellOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, FormOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api';

const { Text, Title } = Typography;
const COLORS = ['red', 'black', 'gray'];
const MAX_CHIPS = 3;

export function useReminders(ownerId) {
  const [reminders, setReminders] = useState([]);

  const reload = useCallback(async () => {
    if (!ownerId) return;
    try {
      const res = await api.get(`/reminders/${encodeURIComponent(ownerId)}`);
      if (!res.data.success) return;
      setReminders(res.data.reminders);
      const today = dayjs().format('YYYY-MM-DD');
      const due = res.data.reminders.filter(r => r.date === today && !r.done);
      const key = `remindersNotified:${ownerId}:${today}`;
      let seen = false;
      try { seen = sessionStorage.getItem(key) === '1'; sessionStorage.setItem(key, '1'); } catch (e) { }
      if (due.length && !seen) {
        message.info({ content: `You have ${due.length} reminder${due.length > 1 ? 's' : ''} today: ${due.slice(0, 2).map(r => r.title).join(', ')}${due.length > 2 ? '…' : ''}`, duration: 6, icon: <BellOutlined style={{ color: '#e53935' }} /> });
      }
    } catch (e) { }
  }, [ownerId]);
  useEffect(() => { reload(); }, [reload]);

  const save = async (reminder) => {
    const body = { ...reminder, ownerId };
    const res = reminder._id ? await api.put(`/reminders/${reminder._id}`, body) : await api.post('/reminders', body);
    if (res.data.success) {
      setReminders(prev => {
        const rest = prev.filter(r => r._id !== res.data.reminder._id);
        return [...rest, res.data.reminder].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      });
    }
    return res.data;
  };
  const remove = async (id) => {
    const res = await api.delete(`/reminders/${id}`, { params: { ownerId } });
    if (res.data.success) setReminders(prev => prev.filter(r => r._id !== id));
    return res.data;
  };

  return { reminders, reload, save, remove };
}

const blankDraft = (date) => ({ title: '', date, time: '', note: '', color: 'red' });

export default function BigCalendar({ open, onClose, tasks = [], remindersApi, initialDate, onOpenTask, title = 'My Calendar' }) {
  const { reminders, save, remove } = remindersApi;
  const [month, setMonth] = useState(() => dayjs());
  const [selected, setSelected] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState('all');

  useEffect(() => {
    if (!open) return;
    const start = initialDate ? dayjs(initialDate) : dayjs();
    setMonth(start);
    setSelected(start.format('YYYY-MM-DD'));
    setDraft(null);
  }, [open, initialDate]);

  const byDay = useMemo(() => {
    const map = {};
    const add = (day, item) => { (map[day] = map[day] || []).push(item); };
    if (show !== 'reminders') tasks.forEach(t => add(t.calendarFilter, { kind: 'task', ...t }));
    if (show !== 'tasks') reminders.forEach(r => add(r.date, { kind: 'reminder', ...r }));
    Object.values(map).forEach(list => list.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'task' ? -1 : 1)));
    return map;
  }, [tasks, reminders, show]);

  const cellRender = (value, info) => {
    if (info.type !== 'date') return info.originNode;
    const items = byDay[value.format('YYYY-MM-DD')] || [];
    return (
      <div className="sdca-bigcal-cell">
        {items.slice(0, MAX_CHIPS).map(item => (
          item.kind === 'task'
            ? <div key={`t-${item.id}`} className={`sdca-bigcal-chip task${item.isOverdue ? ' overdue' : ''}`} title={`${item.courseCode} · ${item.title}`}>
                <FileTextOutlined /> <b>{item.title}</b> <span className="code">{item.courseCode}</span>
              </div>
            : <div key={`r-${item._id}`} className={`sdca-bigcal-chip reminder ${item.color}${item.done ? ' done' : ''}`} title={item.title}>
                <BellOutlined /> {item.time ? <b>{item.time}</b> : null} {item.title}
              </div>
        ))}
        {items.length > MAX_CHIPS && <div className="sdca-bigcal-more">+{items.length - MAX_CHIPS} more</div>}
      </div>
    );
  };

  const onSelect = (date, info) => {
    setMonth(date);
    if (!info || info.source === 'date') {
      setSelected(date.format('YYYY-MM-DD'));
      setDraft(null);
    }
  };

  const submitDraft = async () => {
    if (!draft.title.trim()) return message.warning('Give the reminder a title.');
    setSaving(true);
    try {
      const res = await save({ ...draft, title: draft.title.trim() });
      if (res.success) { message.success(res.message); setDraft(null); }
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to save the reminder.'); }
    setSaving(false);
  };
  const toggleDone = async (r) => {
    try { await save({ ...r, done: !r.done }); } catch (err) { message.error('Failed to update the reminder.'); }
  };
  const del = async (r) => {
    try { const res = await remove(r._id); if (res.success) message.success(res.message); } catch (err) { message.error('Failed to delete the reminder.'); }
  };

  const dayTasks = tasks.filter(t => t.calendarFilter === selected);
  const dayReminders = reminders.filter(r => r.date === selected);
  const selectedDay = dayjs(selected);

  return (
    <Modal open={open} onCancel={onClose} footer={null} width="min(1240px, 96vw)" className="sdca-bigcal-modal" destroyOnHidden
      title={<span><BellOutlined style={{ color: '#e53935', marginRight: 8 }} />{title}</span>}>
      <div className="sdca-bigcal">
        <div className="sdca-bigcal-main">
          <div className="sdca-bigcal-legend">
            <Segmented size="small" value={show} onChange={setShow}
              options={[{ value: 'all', label: 'Everything' }, { value: 'tasks', label: 'Tasks' }, { value: 'reminders', label: 'My reminders' }]} />
            <span><i className="dot task" />Task due</span>
            <span><i className="dot overdue" />Overdue</span>
            <span><i className="dot reminder" />Reminder</span>
            <Text type="secondary" style={{ fontSize: 12 }}>Click a day to see it and add a reminder.</Text>
          </div>
          <Calendar value={month} onSelect={onSelect} onPanelChange={(d) => setMonth(d)} cellRender={cellRender} />
        </div>

        <aside className="sdca-bigcal-side" key={selected}>
          <div className="sdca-bigcal-side-head">
            <div className="sdca-bigcal-daynum">{selectedDay.format('D')}</div>
            <div>
              <Title level={5} style={{ margin: 0 }}>{selectedDay.format('dddd')}</Title>
              <Text type="secondary">{selectedDay.format('MMMM YYYY')}{selected === dayjs().format('YYYY-MM-DD') ? ' · Today' : ''}</Text>
            </div>
          </div>

          <div className="sdca-bigcal-section">
            <Text strong><FileTextOutlined /> Due this day</Text>
            {dayTasks.length === 0 ? <div className="sdca-bigcal-none">Nothing due.</div> : dayTasks.map(t => (
              <div key={t.id} className={`sdca-bigcal-item task${t.isOverdue ? ' overdue' : ''}${onOpenTask ? ' clickable' : ''}`}
                onClick={() => onOpenTask && onOpenTask(t)}>
                <div><Tag color={t.isOverdue ? 'red' : 'volcano'} style={{ marginRight: 6 }}>{t.courseCode}</Tag><b>{t.title}</b></div>
                <Text type="secondary" style={{ fontSize: 12 }}>{t.type || 'Assignment'} · {t.dateStr}{t.isOverdue ? ' · overdue' : ''}</Text>
              </div>
            ))}
          </div>

          <div className="sdca-bigcal-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong><BellOutlined /> My reminders</Text>
              {!draft && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setDraft(blankDraft(selected))}>Add</Button>}
            </div>

            {draft && (
              <div className="sdca-bigcal-form">
                <Input autoFocus maxLength={120} placeholder="Reminder title, e.g. Review chapter 3" value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })} onPressEnter={submitDraft} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <TimePicker format="HH:mm" minuteStep={5} placeholder="Time (optional)" style={{ flex: 1 }}
                    value={draft.time ? dayjs(draft.time, 'HH:mm') : null} onChange={v => setDraft({ ...draft, time: v ? v.format('HH:mm') : '' })} />
                  <div className="sdca-bigcal-colors">
                    {COLORS.map(c => (
                      <Tooltip key={c} title={c}><button type="button" className={`swatch ${c}${draft.color === c ? ' on' : ''}`} onClick={() => setDraft({ ...draft, color: c })} /></Tooltip>
                    ))}
                  </div>
                </div>
                <Input.TextArea rows={2} maxLength={1000} placeholder="Notes (optional)" value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Button size="small" icon={<CloseOutlined />} onClick={() => setDraft(null)}>Cancel</Button>
                  <Button size="small" type="primary" icon={<CheckOutlined />} loading={saving} onClick={submitDraft}>{draft._id ? 'Save' : 'Add reminder'}</Button>
                </div>
              </div>
            )}

            {dayReminders.length === 0 && !draft ? <div className="sdca-bigcal-none">No reminders. Add one for this day.</div> : dayReminders.map(r => (
              <div key={r._id} className={`sdca-bigcal-item reminder ${r.color}${r.done ? ' done' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Checkbox checked={r.done} onChange={() => toggleDone(r)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="title">{r.time && <b>{r.time} </b>}{r.title}</div>
                    {r.note && <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{r.note}</Text>}
                  </div>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setDraft({ ...r })} />
                  <Popconfirm title="Delete this reminder?" okText="Delete" cancelText="Cancel" onConfirm={() => del(r)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>

          {!draft && <Button block icon={<FormOutlined />} onClick={() => setDraft(blankDraft(selected))}>New reminder on {selectedDay.format('MMM D')}</Button>}
        </aside>
      </div>
    </Modal>
  );
}
