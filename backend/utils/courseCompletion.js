const Student = require('../models/Student');
const Course = require('../models/Course');
const Notification = require('../models/Notification');

/**
 * Moves a course from a student's registered courses (enrolledCourseSubjects) to their
 * completedCourses. Shared by the teacher route and the admin route so both behave identically.
 *
 * Throws an Error with a `.status` (400 / 404 / 409) and a user-facing message on failure.
 *
 * @param {object} args
 * @param {string} args.studentSchoolId
 * @param {string} args.courseCode
 * @param {string} args.byName   display name of whoever marked it complete
 * @param {'Teacher'|'Admin'} args.byRole
 */
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

  // The course may have been deleted since enrolment; fall back to whatever we still know.
  const course = await Course.findOne({ code: courseCode }).lean();
  const record = {
    code: courseCode,
    name: course ? course.name : '',
    instructor: course ? course.instructor : '',
    completedAt: new Date(),
    completedBy: byName,
    completedByRole: byRole
  };

  // Single atomic update guarded on both conditions, so a double click / two staff members
  // racing each other can never create a duplicate completed entry.
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
