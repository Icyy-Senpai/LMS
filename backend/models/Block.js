const mongoose = require('mongoose');

// A block is a section (e.g. "IT-201"). It holds:
//  - studentsRegistered: the students in this section. A student belongs to at most ONE block (Student.block holds
//    the same code; see utils/blocks.js assignStudentToBlock, which keeps both sides in step).
//  - assignedSubjects:   the subjects (courses) registered to this section.
//  - courseProfessors:   who teaches each of those subjects in this section. One professor per subject per block,
//    but a teacher can hold many blocks and many subjects.
const blockSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  assignedSubjects: [{
    _id: false,
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    code: { type: String, required: true } // Course.code snapshot (codes are not editable), used for lookups
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

// One block per student, enforced by the database. Partial so that blocks with no students (an empty array would
// otherwise index as null) do not collide with each other.
blockSchema.index(
  { 'studentsRegistered.schoolId': 1 },
  { unique: true, name: 'one_block_per_student', partialFilterExpression: { 'studentsRegistered.schoolId': { $exists: true } } }
);

module.exports = mongoose.model('Block', blockSchema);
