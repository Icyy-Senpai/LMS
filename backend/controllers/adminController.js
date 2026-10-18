const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const CourseContent = require('../models/CourseContent');
const Forum = require('../models/Forum');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

// Get global stats
const getSystemStats = async (req, res) => {
  try {
    const students = await Student.countDocuments();
    const teachers = await Teacher.countDocuments();
    const courses = await Course.countDocuments();
    const forums = await Forum.countDocuments();
    res.json({ success: true, stats: { users: students + teachers, courses, forums } });
  } catch (err) { res.status(500).json({ success: false }); }
};

// Manage Users
const getAllUsers = async (req, res) => {
  try {
    const students = await Student.find({}, '-password').lean();
    const teachers = await Teacher.find({}, '-password').lean();
    res.json({ success: true, users: [...students, ...teachers] });
  } catch (err) { res.status(500).json({ success: false }); }
};

const deleteUser = async (req, res) => {
  try {
    const { id, type } = req.params;
    if (type === 'Student') await Student.findByIdAndDelete(id);
    if (type === 'Teacher') await Teacher.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted permanently.' });
  } catch (err) { res.status(500).json({ success: false }); }
};

// Manage Courses
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).lean();
    res.json({ success: true, courses });
  } catch (err) { res.status(500).json({ success: false }); }
};

const deleteCourse = async (req, res) => {
  try {
    const { code } = req.params;
    // Wipe everything associated with the course to keep DB clean
    await Course.findOneAndDelete({ code });
    await CourseContent.findOneAndDelete({ courseCode: code });
    await Forum.deleteMany({ courseCode: code });
    
    // Find all assignments for this course and delete them along with their submissions
    const assignments = await Assignment.find({ courseCode: code });
    for (let ass of assignments) {
        await Submission.deleteMany({ assignmentId: ass._id });
        await Assignment.findByIdAndDelete(ass._id);
    }

    res.json({ success: true, message: 'Course and all associated data deleted.' });
  } catch (err) { res.status(500).json({ success: false }); }
};

// Manage Forums
const getAllForums = async (req, res) => {
  try {
    const forums = await Forum.find({}).sort({ createdAt: -1 });
    res.json({ success: true, forums });
  } catch (err) { res.status(500).json({ success: false }); }
};

const deleteForum = async (req, res) => {
  try {
    await Forum.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Forum thread deleted.' });
  } catch (err) { res.status(500).json({ success: false }); }
};

module.exports = { getSystemStats, getAllUsers, deleteUser, getAllCourses, deleteCourse, getAllForums, deleteForum };