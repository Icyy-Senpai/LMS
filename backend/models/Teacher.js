const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
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
  schoolEmail: { type: String, required: true, unique: true },
  department: { type: String, default: '' }, // Updated to allow empty default
  password: { type: String, required: true},
  photoUrl: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  accountType : {type: String, required: true, default: 'Teacher'},

  // Marks a Teacher account as a Dean. Only a real boolean is accepted (true | false).
  // false (default) -> logs in to the Teacher dashboard; true -> logs in to the Dean's dashboard.
  // The account is still a 'Teacher' account either way, so Deans can hold courses and teach.
  isDean: {
    type: Boolean,
    required: true,
    default: false,
    // Runs before Mongoose's own casting, which would otherwise turn 'true', 'yes', 1... into a boolean.
    set: (v) => {
      if (v !== undefined && typeof v !== 'boolean') throw new TypeError('isDean only accepts true or false.');
      return v;
    },
    validate: { validator: (v) => typeof v === 'boolean', message: 'isDean only accepts true or false.' }
  },
  // The block this teacher is currently assigned to. Changed by a Dean (see staffController).
  block: { type: String, default: '' },

  points: { type: Number, default: 0 },
  badges: [{ type: String }],
  courseSubjectHeld: [{
    code: { type: String },
  }],
  notifications: [{
    id: { type: String },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Teacher', teacherSchema);