const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
//   coursesRegistered: [{
//     subjectCode: { type: String, required: true },
//     instructor: { type: String, required: true },
//     instructorID: { type: String, required: true },
//   }],
  studentsRegistered: [{
    name: { type: String, required: true },
    schoolId: { type: String, required: true, unique: true }
  }],
  amountOfStudents: { type: Number },
});
module.exports = mongoose.model('Block', blockSchema);