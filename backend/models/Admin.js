const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['Student', 'Teacher', 'Admin'] }, 
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  photoUrl: { type: String, default: '' }, 
  organization: { type: String, default: '' },
  
  academicCourse: { type: String, default: 'BS Information Technology' },
  yearLevel: { type: String, enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'], default: '1st Year' },
  
  points: { type: Number, default: 0 },
  badges: [{ type: String }],
  enrolledCourses: [{
    code: { type: String },
    progress: { type: Number, default: 0 }
  }],
  todos: [{
    id: { type: String },
    task: { type: String },
    due: { type: String },
    course: { type: String }
  }],
  notifications: [{
    id: { type: String },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('User', userSchema);