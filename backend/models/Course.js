const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  instructor: { type: String, required: true },
  instructorID: {type: String, required: true},
  color: { type: String, default: '#1890ff' },
  targetProgram: { type: String, required: true },
  targetYear: { type: String, required: true }
});

module.exports = mongoose.model('Course', courseSchema);