const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  time: { type: String, default: '', match: /^(\d{2}:\d{2})?$/ },
  note: { type: String, default: '', maxlength: 1000 },
  color: { type: String, enum: ['red', 'black', 'gray'], default: 'red' },
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', reminderSchema);
