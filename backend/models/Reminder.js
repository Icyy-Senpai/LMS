const mongoose = require('mongoose');

// A personal reminder a student / teacher / dean puts on their own calendar. Only the owner sees it.
const reminderSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, index: true }, // schoolId of the student or teacher
  title: { type: String, required: true, trim: true, maxlength: 120 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD (a calendar day, no timezone shifts)
  time: { type: String, default: '', match: /^(\d{2}:\d{2})?$/ },     // optional HH:mm
  note: { type: String, default: '', maxlength: 1000 },
  color: { type: String, enum: ['red', 'black', 'gray'], default: 'red' },
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', reminderSchema);
