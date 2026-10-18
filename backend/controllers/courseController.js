const Course = require('../models/Course');
const CourseContent = require('../models/CourseContent');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { markCourseComplete } = require('../utils/courseCompletion');

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
    let content = await CourseContent.findOne({ courseCode: req.params.courseCode });
    if (!content) {
      content = new CourseContent({ courseCode: req.params.courseCode, videos: [], materials: [], quizzes: [], enrolledStudents: [], assignments: [] });
      await content.save();
    }
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching course content' });
  }
};

const updateInstructorCourse = async (req, res) => {
  const { courseCode, videos, materials, quizzes, announcements, assignments } = req.body;
  try {
    const updated = await CourseContent.findOneAndUpdate(
      { courseCode },
      { videos, materials, quizzes, announcements, assignments },
      { new: true, upsert: true }
    );
    res.json({ success: true, content: updated, message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating course content' });
  }
};

// A teacher may only act on courses they are the assigned instructor of.
// NOTE: like the rest of the non-admin API, this trusts the teacherId sent by the client (the app has no sessions/tokens yet).
const loadOwnedCourse = async (teacherId, courseCode) => {
  const fail = (status, message) => Object.assign(new Error(message), { status });
  if (!teacherId) throw fail(401, 'Teacher identification required.');
  const teacher = await Teacher.findOne({ schoolId: teacherId });
  if (!teacher || teacher.status === 'Suspended') throw fail(403, 'Teacher access denied.');
  const course = await Course.findOne({ code: courseCode });
  if (!course) throw fail(404, 'Course not found.');
  if (course.instructorID !== teacher.schoolId) throw fail(403, 'You are not the instructor of this course.');
  return { teacher, course };
};

const sendErr = (res, err, fallback) => {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};

// Students registered in (and those who have completed) one of the teacher's courses.
const getTeacherCourseRoster = async (req, res) => {
  try {
    const { courseCode } = req.params;
    await loadOwnedCourse(req.query.teacherId, courseCode);
    const fields = 'schoolId firstName lastName middleName department yearLevel block photoUrl';
    const enrolled = await Student.find({ 'enrolledCourseSubjects.code': courseCode }, fields).sort({ lastName: 1, firstName: 1 }).lean();
    const doneRaw = await Student.find({ 'completedCourses.code': courseCode }, `${fields} completedCourses`).sort({ lastName: 1, firstName: 1 }).lean();
    const completed = doneRaw.map(({ completedCourses, ...st }) => ({ ...st, completion: completedCourses.find(c => c.code === courseCode) }));
    res.json({ success: true, enrolled, completed });
  } catch (err) { sendErr(res, err, 'Failed to load class roster.'); }
};

const completeCourseForStudent = async (req, res) => {
  const { teacherId, studentId, courseCode } = req.body;
  try {
    if (!studentId || !courseCode) return res.status(400).json({ success: false, message: 'studentId and courseCode are required.' });
    const { teacher } = await loadOwnedCourse(teacherId, courseCode);
    await markCourseComplete({
      studentSchoolId: studentId, courseCode,
      byName: `Prof. ${teacher.lastName}, ${teacher.firstName}`, byRole: 'Teacher'
    });
    res.json({ success: true, message: `${courseCode} marked as completed.` });
  } catch (err) { sendErr(res, err, 'Failed to mark course as completed.'); }
};

module.exports = { getCourses, getInstructorCourse, updateInstructorCourse, getTeacherCourseRoster, completeCourseForStudent };