const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: String, 
  question: String,
  options: [String], 
  answer: String 
});

const assignmentSchema = new mongoose.Schema({
  courseCode: String,
  block: { type: String, default: '' },
  title: String,
  instructions: String,
  deadline: Date,
  autoClose: Boolean,
  maxGrade: Number,
  type: { type: String, default: 'Assignment' }, 
  questions: [questionSchema], 
  attachedFiles: [{ 
    fileName: String, 
    fileData: String, 
    contentType: String 
  }] 
});

module.exports = mongoose.model('Assignment', assignmentSchema);