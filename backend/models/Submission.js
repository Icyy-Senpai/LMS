const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  courseCode: { type: String, required: true },
  studentUsername: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
  fileUrl: String,
  fileName: String,
  fileData: String,
  answers: [mongoose.Schema.Types.Mixed], 
  grade: { type: Number, default: null },
  feedback: { type: String, default: '' },
  cheatingFlag: { type: Boolean, default: false }
});

module.exports = mongoose.model('Submission', submissionSchema);