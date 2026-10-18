const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: { type: String, required: true },
  middleInitial: { type: String, required: true },
  suffix: { type: String },
  bithDate: { type: String, required: true },
  countryOfBirth: { type: String, required: true },
  birthPlace: { type: String, required: true },
  civilStatus: { type: String, required: true },

  gender: { type: String, required: true },
  religion: { type: String, required: true },
  // Changeable Data
  mobileNum: { type: Number, required: true },
  teleNum: { type: Number, required: true },
  personalEmail: { type: String, required: true },

  presentAddress: { type: String, required: true },
  presentProvince: { type: String, required: true },
  presentcmun: { type: String, required: true },
  presentHouseNum: { type: String, required: true },
  presentBrgy: { type: Number, required: true },
  presentPostal: { type: Number, required: true },
  permanentAddress: { type: String, required: true },
  permanentProvince: { type: String, required: true },
  permanentCmun: { type: String, required: true },
  permanentHouseNum: { type: String, required: true },
  permanentBrgy: { type: String, required: true },
  permanentPostal: { type: String, required: true },

  // School Data
  schoolId: { type: String, required: true, unique: true },
  yearLevel: { type: Number, required: true },
  schoolEmail: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  block: { type: String, required: true},
  password: { type: String, required: true},
  photoUrl: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  accountType : {type: String, required: true, default: 'Student'},

  // Profile Data
  bio: { type: String, default: '' },

  // Personal Data
  points: { type: Number, default: 0 },
  badges: [{ type: String }],
  enrolledCourseSubjects: [{
    code: { type: String },
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

module.exports = mongoose.model('Student', studentSchema);