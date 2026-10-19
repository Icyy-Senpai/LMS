const Student = require('../models/Student');
const Course = require('../models/Course');
const Notification = require('../models/Notification');

const markCourseComplete = async ({ studentSchoolId, courseCode, byName, byRole }) => {
  const fail = (status, message) => Object.assign(new Error(message), { status });

  const student = await Student.findOne({ schoolId: studentSchoolId });
  if (!student) throw fail(404, 'Student not found.');

  if ((student.completedCourses || []).some(c => c.code === courseCode)) {
    throw fail(409, 'This course is already marked as completed for that student.');
  }
  if (!(student.enrolledCourseSubjects || []).some(c => c.code === courseCode)) {
    throw fail(400, 'The student is not currently registered in this course.');
  }

  const course = await Course.findOne({ code: courseCode }).lean();
  const record = {
    code: courseCode,
    name: course ? course.name : '',
    instructor: course ? course.instructor : '',
    completedAt: new Date(),
    completedBy: byName,
    completedByRole: byRole
  };

  const result = await Student.updateOne(
    { schoolId: studentSchoolId, 'enrolledCourseSubjects.code': courseCode, 'completedCourses.code': { $ne: courseCode } },
    { $pull: { enrolledCourseSubjects: { code: courseCode } }, $push: { completedCourses: record } }
  );
  if (result.modifiedCount === 0) throw fail(409, 'This course was just updated by someone else. Please refresh.');

  await new Notification({
    userSchoolId: studentSchoolId,
    title: 'Course Completed',
    message: `${courseCode}${record.name ? ` - ${record.name}` : ''} was marked as completed by ${byRole === 'Admin' ? 'an administrator' : byName}. It now appears under Completed Courses in your profile.`,
    type: 'completion'
  }).save();

  return Student.findOne({ schoolId: studentSchoolId }, '-password').lean();
};

module.exports = { markCourseComplete };
