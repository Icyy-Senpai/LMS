const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin'); 
const Block = require('../models/Block');

const login = async (req, res) => {
  // FIX: Extract 'email' from req.body instead of 'username'
  const { email, password } = req.body; 
  try {
    let user = null;

    // 1. Try finding a Student using schoolEmail
    user = await Student.findOne({ schoolEmail: email, password });
    
    // 2. If not a student, try finding a Teacher using schoolEmail
    if (!user) {
      user = await Teacher.findOne({ schoolEmail: email, password });
    }
    
    // 3. If neither, try finding an Admin
    if (!user) {
      // Admins might still use a standard username or an email, so we check both
      const adminCheck = await Admin.findOne({ 
        $or: [{ email: email }, { username: email }], 
        password 
      });
      
      if (adminCheck) {
        user = adminCheck.toObject();
        user.accountType = 'Admin'; 
      }
    }

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials. Please check your email and password.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

const getAdminUsers = async (req, res) => {
  try {
    const students = await Student.find({}, '-password');
    const teachers = await Teacher.find({}, '-password');
    const users = [...students, ...teachers];
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

const updateProfile = async (req, res) => {
  const { schoolId, photoUrl, mobileNum, teleNum, personalEmail, bio, ...rest } = req.body;
  try {
    const updateData = { photoUrl, mobileNum, teleNum, personalEmail, bio, ...rest };
    let updatedUser = await Student.findOneAndUpdate({ schoolId }, updateData, { new: true });
    if (!updatedUser) {
      updatedUser = await Teacher.findOneAndUpdate({ schoolId }, updateData, { new: true });
    }
    if (updatedUser) {
      res.json({ success: true, user: updatedUser, message: 'Profile updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateTodos = async (req, res) => {
  const { schoolId, todos } = req.body;
  try {
    const updatedUser = await Student.findOneAndUpdate({ schoolId }, { todos }, { new: true });
    if (updatedUser) {
      res.json({ success: true, todos: updatedUser.todos, message: 'To-Do list updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const { schoolId, courseCode } = req.query;
    let query = {};
    
    if (schoolId) {
      const studentBlock = await Block.findOne({ "studentsRegistered.schoolId": schoolId });
      if (studentBlock) {
        const blockStudentSchoolIds = studentBlock.studentsRegistered.map(s => s.schoolId);
        query.schoolId = { $in: blockStudentSchoolIds };
      }
    }

    if (courseCode && courseCode !== 'all') {
      query.$or = [
        { "enrolledCourseSubjects.code": courseCode },
        { "enrolledCourses.code": courseCode }
      ];
    }

    const topStudents = await Student.find(query, 'firstName lastName department points photoUrl enrolledCourseSubjects enrolledCourses schoolId')
      .sort({ points: -1 })
      .limit(50);
      
    res.json({ success: true, leaderboard: topStudents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
};

module.exports = { login, getAdminUsers, updateProfile, updateTodos, getLeaderboard };