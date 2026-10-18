const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Course = require('../models/Course');
const CourseContent = require('../models/CourseContent');
const Forum = require('../models/Forum');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');

const getSystemStats = async (req, res) => {
  try {
    const students = await Student.countDocuments();
    const teachers = await Teacher.countDocuments();
    const courses = await Course.countDocuments();
    const forums = await Forum.countDocuments();
    const assignments = await Assignment.countDocuments();
    res.json({ success: true, stats: { users: students + teachers, courses, forums, assignments } });
  } catch (err) { res.status(500).json({ success: false }); }
};

const getAllUsers = async (req, res) => {
  try {
    const students = await Student.find({}, '-password').lean();
    const teachers = await Teacher.find({}, '-password').lean();
    const admins = await Admin.find({}, '-password').lean();
    res.json({ success: true, users: [...students, ...teachers, ...admins] });
  } catch (err) { res.status(500).json({ success: false }); }
};

const updateUser = async (req, res) => {
  const { id, accountType, firstName, lastName, department, schoolEmail } = req.body;
  try {
    let updated;
    if (accountType === 'Student') {
      updated = await Student.findByIdAndUpdate(id, { firstName, lastName, department, schoolEmail }, { new: true });
    } else if (accountType === 'Teacher') {
      updated = await Teacher.findByIdAndUpdate(id, { firstName, lastName, department, schoolEmail }, { new: true });
    } else if (accountType === 'Admin') {
      updated = await Admin.findByIdAndUpdate(id, { firstName, lastName, email: schoolEmail }, { new: true });
    }
    res.json({ success: true, message: 'User updated successfully', user: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update user' }); }
};

const deleteUser = async (req, res) => {
  try {
    const { id, type } = req.params;
    if (type === 'Student') await Student.findByIdAndDelete(id);
    else if (type === 'Teacher') await Teacher.findByIdAndDelete(id);
    else if (type === 'Admin') await Admin.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted permanently.' });
  } catch (err) { res.status(500).json({ success: false }); }
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).lean();
    res.json({ success: true, courses });
  } catch (err) { res.status(500).json({ success: false }); }
};

const createCourse = async (req, res) => {
  try {
    const newCourse = new Course(req.body);
    await newCourse.save();
    await new CourseContent({ courseCode: newCourse.code, videos: [], materials: [], quizzes: [], announcements: [], assignments: [] }).save();
    res.json({ success: true, message: 'Course created successfully', course: newCourse });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to create course' }); }
};

const updateCourse = async (req, res) => {
  const { code, name, instructor, targetProgram, targetYear, color } = req.body;
  try {
    const updated = await Course.findOneAndUpdate({ code }, { name, instructor, targetProgram, targetYear, color }, { new: true });
    res.json({ success: true, message: 'Course updated successfully', course: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update course' }); }
};

const deleteCourse = async (req, res) => {
  try {
    const { code } = req.params;
    await Course.findOneAndDelete({ code });
    await CourseContent.findOneAndDelete({ courseCode: code });
    await Forum.deleteMany({ courseCode: code });
    
    const assignments = await Assignment.find({ courseCode: code });
    for (let ass of assignments) {
        await Submission.deleteMany({ assignmentId: ass._id });
        await Assignment.findByIdAndDelete(ass._id);
    }

    res.json({ success: true, message: 'Course and all associated data deleted.' });
  } catch (err) { res.status(500).json({ success: false }); }
};

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

// Assign course with duplicate prevention
const assignUserCourse = async (req, res) => {
  const { schoolId, accountType, courseCode } = req.body;
  try {
    if (accountType === 'Student') {
      const student = await Student.findOne({ schoolId });
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
      
      const alreadyEnrolled = (student.enrolledCourseSubjects && student.enrolledCourseSubjects.some(c => c.code === courseCode)) ||
                              (student.enrolledCourses && student.enrolledCourses.some(c => c.code === courseCode));
      if (alreadyEnrolled) {
        return res.status(400).json({ success: false, message: 'Student is already enrolled in this course.' });
      }

      await Student.findOneAndUpdate(
        { schoolId },
        { $addToSet: { enrolledCourseSubjects: { code: courseCode }, enrolledCourses: { code: courseCode } } }
      );
    } else if (accountType === 'Teacher') {
      const teacher = await Teacher.findOne({ schoolId });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

      const alreadyAssigned = teacher.courseSubjectHeld && teacher.courseSubjectHeld.some(c => c.code === courseCode);
      if (alreadyAssigned) {
        return res.status(400).json({ success: false, message: 'Teacher is already holding this course.' });
      }

      await Teacher.findOneAndUpdate(
        { schoolId },
        { $addToSet: { courseSubjectHeld: { code: courseCode } } }
      );
      
      const courseObj = await Course.findOne({ code: courseCode });
      if (courseObj) {
        courseObj.instructorID = schoolId;
        courseObj.instructor = `${teacher.lastName}, ${teacher.firstName}`;
        await courseObj.save();
      }
    }
    res.json({ success: true, message: 'Course assigned successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign course.' });
  }
};

// Remove course from user account
const removeUserCourse = async (req, res) => {
  const { schoolId, accountType, courseCode } = req.body;
  try {
    if (accountType === 'Student') {
      await Student.findOneAndUpdate(
        { schoolId },
        { 
          $pull: { 
            enrolledCourseSubjects: { code: courseCode }, 
            enrolledCourses: { code: courseCode } 
          } 
        }
      );
    } else if (accountType === 'Teacher') {
      await Teacher.findOneAndUpdate(
        { schoolId },
        { $pull: { courseSubjectHeld: { code: courseCode } } }
      );
      
      const courseObj = await Course.findOne({ code: courseCode });
      if (courseObj && courseObj.instructorID === schoolId) {
        courseObj.instructorID = '';
        courseObj.instructor = 'TBA';
        await courseObj.save();
      }
    }
    res.json({ success: true, message: 'Course removed from user successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove course.' });
  }
};

module.exports = { 
  getSystemStats, 
  getAllUsers, updateUser, deleteUser, 
  getAllCourses, createCourse, updateCourse, deleteCourse, 
  getAllForums, deleteForum, 
  assignUserCourse,
  removeUserCourse
};