const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [{
    questionText: String,
    options: [String],
    correctAnswer: Number
  }]
});

const contentSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, unique: true },
  videos: [{ title: { type: String }, url: { type: String } }],
  materials: [{ 
    title: { type: String }, 
    fileUrl: { type: String },  // Keeps support for external links
    fileName: { type: String }, // Stores the uploaded file's name
    fileData: { type: String }  // Stores the Base64 file string
  }],
  quizzes: [quizSchema],
  announcements: [{ title: String, content: String, date: { type: Date, default: Date.now } }],
  enrolledStudents: [{
    username: String,
    progress: { type: Number, default: 0 },
    quizScores: [{ quizId: String, score: Number }]
  }],
  assignments: [{
    title: String,
    submissions: [{
      studentUsername: String,
      fileUrl: String,
      grade: { type: Number, default: null },
      feedback: { type: String, default: '' }
    }]
  }]
});

module.exports = mongoose.model('CourseContent', contentSchema);