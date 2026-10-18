const mongoose = require('mongoose');

// A department / academic program. Student.department, Teacher.department and Course.targetProgram
// all store the department NAME as a plain string, so renaming one here cascades (see adminController).
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Department', departmentSchema);
