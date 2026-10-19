const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  assignedSubjects: [{
    _id: false,
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    code: { type: String, required: true }
  }],
  courseProfessors: [{
    _id: false,
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }
  }],
  studentsRegistered: [{
    name: { type: String, required: true },
    schoolId: { type: String, required: true }
  }],
  amountOfStudents: { type: Number, default: 0 },
  maxAmountOfStudents: { type: Number }
});

blockSchema.index(
  { 'studentsRegistered.schoolId': 1 },
  { unique: true, name: 'one_block_per_student', partialFilterExpression: { 'studentsRegistered.schoolId': { $exists: true } } }
);

module.exports = mongoose.model('Block', blockSchema);
