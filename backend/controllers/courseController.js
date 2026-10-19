const Course = require('../models/Course');
const CourseContent = require('../models/CourseContent');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { markCourseComplete } = require('../utils/courseCompletion');
const { assertTeaches } = require('../utils/blocks');
const Block = require('../models/Block');
const { getBlockContent, studentBlock } = require('../utils/courseContent');

const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).lean();
    for (let course of courses) {
      if (course.instructorID) {
        const teacher = await Teacher.findOne({ schoolId: course.instructorID });
        if (teacher) {
          course.instructor = `Prof. ${teacher.lastName}, ${teacher.firstName} ${teacher.middleName}`;
        }
      }
    }
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching courses' });
  }
};

const getInstructorCourse = async (req, res) => {
  try {
    const block = req.query.studentId ? await studentBlock(req.query.studentId) : (typeof req.query.block === 'string' ? req.query.block.trim() : '');
    if (!block && req.query.studentId) {
      return res.json({ success: true, content: { courseCode: req.params.courseCode, block: '', announcements: [], videos: [], materials: [] } });
    }
    if (!block) return res.status(400).json({ success: false, message: 'block is required.' });
    if (!(await Block.exists({ code: block }))) return res.status(404).json({ success: false, message: `Block ${block} does not exist.` });
    const content = await getBlockContent(req.params.courseCode, block);
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching course content' });
  }
};

const updateInstructorCourse = async (req, res) => {
  const { courseCode, block, videos, materials, announcements } = req.body;
  try {
    if (!block) return res.status(400).json({ success: false, message: 'block is required.' });
    await assertTeaches(req.teacher, courseCode, block);
    await getBlockContent(courseCode, block);
    const set = {};
    if (Array.isArray(videos)) set.videos = videos;
    if (Array.isArray(materials)) set.materials = materials;
    if (Array.isArray(announcements)) set.announcements = announcements;
    const updated = await CourseContent.findOneAndUpdate({ courseCode, block }, { $set: set }, { new: true });
    res.json({ success: true, content: updated, message: 'Course updated successfully' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Error updating course content' });
  }
};

const loadOwnedCourse = async (teacherId, courseCode, blockCode) => {
  const fail = (status, message) => Object.assign(new Error(message), { status });
  if (!teacherId) throw fail(401, 'Teacher identification required.');
  const teacher = await Teacher.findOne({ schoolId: teacherId });
  if (!teacher || teacher.status === 'Suspended') throw fail(403, 'Teacher access denied.');
  const { course } = await assertTeaches(teacher, courseCode, blockCode);
  return { teacher, course };
};

const sendErr = (res, err, fallback) => {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};

const getTeacherCourseRoster = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const block = typeof req.query.block === 'string' ? req.query.block : '';
    if (!block) return res.status(400).json({ success: false, message: 'block is required.' });
    await loadOwnedCourse(req.query.teacherId, courseCode, block);
    const fields = 'schoolId firstName lastName middleName department yearLevel block photoUrl';
    const enrolled = await Student.find({ block, 'enrolledCourseSubjects.code': courseCode }, fields).sort({ lastName: 1, firstName: 1 }).lean();
    const doneRaw = await Student.find({ block, 'completedCourses.code': courseCode }, `${fields} completedCourses`).sort({ lastName: 1, firstName: 1 }).lean();
    const completed = doneRaw.map(({ completedCourses, ...st }) => ({ ...st, completion: completedCourses.find(c => c.code === courseCode) }));
    res.json({ success: true, enrolled, completed });
  } catch (err) { sendErr(res, err, 'Failed to load class roster.'); }
};

const completeCourseForStudent = async (req, res) => {
  const { teacherId, studentId, courseCode } = req.body;
  try {
    if (!studentId || !courseCode) return res.status(400).json({ success: false, message: 'studentId and courseCode are required.' });
    const student = await Student.findOne({ schoolId: studentId }, 'block').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (!student.block) return res.status(400).json({ success: false, message: 'That student is not in a block.' });
    const { teacher } = await loadOwnedCourse(teacherId, courseCode, student.block);
    await markCourseComplete({
      studentSchoolId: studentId, courseCode,
      byName: `Prof. ${teacher.lastName}, ${teacher.firstName}`, byRole: teacher.isDean === true ? 'Dean' : 'Teacher'
    });
    res.json({ success: true, message: `${courseCode} marked as completed.` });
  } catch (err) { sendErr(res, err, 'Failed to mark course as completed.'); }
};

module.exports = { getCourses, getInstructorCourse, updateInstructorCourse, getTeacherCourseRoster, completeCourseForStudent };