const Reminder = require('../models/Reminder');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

// NOTE: like the rest of the non-admin API there are no sessions yet, so the owner is the schoolId the client
// sends. Every query is scoped to that owner, so one user's id never reaches another user's reminders.
const fail = (status, message) => Object.assign(new Error(message), { status });
const sendErr = (res, err, fallback) => {
  if (err && err.status) return res.status(err.status).json({ success: false, message: err.message });
  if (err && err.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(' ') });
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};

const assertOwner = async (ownerId) => {
  if (!ownerId) throw fail(400, 'ownerId is required.');
  const exists = (await Student.exists({ schoolId: ownerId })) || (await Teacher.exists({ schoolId: ownerId }));
  if (!exists) throw fail(404, 'User not found.');
};

const FIELDS = ['title', 'date', 'time', 'note', 'color', 'done'];
const pick = (body) => Object.fromEntries(FIELDS.filter(k => body[k] !== undefined).map(k => [k, body[k]]));

const listReminders = async (req, res) => {
  try {
    await assertOwner(req.params.ownerId);
    const reminders = await Reminder.find({ ownerId: req.params.ownerId }).sort({ date: 1, time: 1 }).lean();
    res.json({ success: true, reminders });
  } catch (err) { sendErr(res, err, 'Failed to load reminders.'); }
};

const createReminder = async (req, res) => {
  try {
    await assertOwner(req.body.ownerId);
    const reminder = await Reminder.create({ ...pick(req.body), ownerId: req.body.ownerId });
    res.json({ success: true, message: 'Reminder added.', reminder });
  } catch (err) { sendErr(res, err, 'Failed to add the reminder.'); }
};

const updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate({ _id: req.params.id, ownerId: req.body.ownerId }, { $set: pick(req.body) },
      { new: true, runValidators: true });
    if (!reminder) throw fail(404, 'Reminder not found.');
    res.json({ success: true, message: 'Reminder saved.', reminder });
  } catch (err) { sendErr(res, err, 'Failed to save the reminder.'); }
};

const deleteReminder = async (req, res) => {
  try {
    const result = await Reminder.deleteOne({ _id: req.params.id, ownerId: req.query.ownerId });
    if (!result.deletedCount) throw fail(404, 'Reminder not found.');
    res.json({ success: true, message: 'Reminder deleted.' });
  } catch (err) { sendErr(res, err, 'Failed to delete the reminder.'); }
};

module.exports = { listReminders, createReminder, updateReminder, deleteReminder };
