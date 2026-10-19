const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: String, 
  question: String,
  options: [String], 
  answer: String 
});

const assignmentSchema = new mongoose.Schema({
  courseCode: String,
  // The block (section) this assignment / quiz belongs to: only that block's students see it and can submit, and
  // only the professor of the course in that block (Block.courseProfessors) can grade or delete it.
  // '' = created before assignments were block-based; those stay visible to every block of the course.
  block: { type: String, default: '' },
  title: String,
  instructions: String,
  deadline: Date,
  autoClose: Boolean,
  maxGrade: Number,
  type: { type: String, default: 'Assignment' }, 
  questions: [questionSchema], 
  // Updated to store actual file data
  attachedFiles: [{ 
    fileName: String, 
    fileData: String, 
    contentType: String 
  }] 
});

module.exports = mongoose.model('Assignment', assignmentSchema);