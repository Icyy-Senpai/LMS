const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const Block = require('../models/Block');
const { setCourseInstructor } = require('./adminController');
const { markCourseComplete } = require('../utils/courseCompletion');
const { listBlocks, syncBlockCollection } = require('../utils/blocks');

const teacherName = (t) => `Prof. ${t.lastName}, ${t.firstName}`;

const sendErr = (res, err, fallback) => {
  if (err && err.status) return res.status(err.status).json({ success: false, message: err.message });
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};
const fail = (status, message) => Object.assign(new Error(message), { status });

// Returns the trimmed block code if it is an existing block, otherwise throws a 400.
const validBlock = async (value) => {
  const code = typeof value === 'string' ? value.trim() : '';
  if (!code) throw fail(400, 'Please choose a block.');
  const known = await listBlocks();
  if (!known.some(b => b.code === code)) throw fail(400, `Block "${code}" does not exist.`);
  return code;
};

// A block created with a maxAmountOfStudents cap cannot take more students than that.
const assertBlockHasRoom = async (code) => {
  const doc = await Block.findOne({ code }, 'maxAmountOfStudents').lean();
  if (!doc || !doc.maxAmountOfStudents) return;
  const current = await Student.countDocuments({ block: code });
  if (current >= doc.maxAmountOfStudents) throw fail(400, `Block ${code} is full (${current}/${doc.maxAmountOfStudents} students).`);
};

/* ------------------------------------------------------------------ */
/*  TEACHERS + DEANS                                                   */
/* ------------------------------------------------------------------ */
const getBlocks = async (req, res) => {
  try { res.json({ success: true, blocks: await listBlocks() }); }
  catch (err) { sendErr(res, err, 'Failed to load blocks.'); }
};

// A teacher (or dean) may reassign students who are registered in, or have completed, one of their own courses.
const reassignStudentBlock = async (req, res) => {
  const { studentId, block } = req.body;
  try {
    if (!studentId) throw fail(400, 'studentId is required.');
    const newBlock = await validBlock(block);

    const myCodes = (await Course.find({ instructorID: req.teacher.schoolId }, 'code').lean()).map(c => c.code);
    const student = await Student.findOne({ schoolId: studentId });
    if (!student) throw fail(404, 'Student not found.');
    const inMyClass = [...(student.enrolledCourseSubjects || []), ...(student.completedCourses || [])].some(c => myCodes.includes(c.code));
    if (!inMyClass) throw fail(403, 'You can only reassign students who are in one of your courses.');
    if (student.block === newBlock) throw fail(400, `The student is already in block ${newBlock}.`);
    await assertBlockHasRoom(newBlock);

    const oldBlock = student.block;
    await Student.updateOne({ schoolId: studentId }, { block: newBlock });
    await syncBlockCollection(student, newBlock);
    await new Notification({
      userSchoolId: studentId, title: 'Block Changed', type: 'block',
      message: `${teacherName(req.teacher)} moved you from block ${oldBlock || '(none)'} to block ${newBlock}.`
    }).save();

    res.json({ success: true, message: `Student moved to block ${newBlock}.`, block: newBlock });
  } catch (err) { sendErr(res, err, 'Failed to reassign the student.'); }
};

/* ------------------------------------------------------------------ */
/*  DEANS ONLY                                                         */
/* ------------------------------------------------------------------ */
const FIELDS = 'schoolId firstName lastName middleName department status isDean block';

// Students and teachers only (a Dean has no business seeing Admin accounts).
const getDeanUsers = async (req, res) => {
  try {
    const [students, teachers] = await Promise.all([
      Student.find({}, `${FIELDS} yearLevel enrolledCourseSubjects completedCourses`).lean(),
      Teacher.find({}, `${FIELDS} courseSubjectHeld`).lean()
    ]);
    res.json({
      success: true,
      users: [
        ...students.map(u => ({ ...u, accountType: 'Student' })),
        ...teachers.map(u => ({ ...u, accountType: 'Teacher', isDean: u.isDean === true }))
      ]
    });
  } catch (err) { sendErr(res, err, 'Failed to load users.'); }
};

const reassignTeacherBlock = async (req, res) => {
  const { teacherId, block } = req.body;
  try {
    if (!teacherId) throw fail(400, 'teacherId is required.');
    const newBlock = await validBlock(block);
    const teacher = await Teacher.findOne({ schoolId: teacherId });
    if (!teacher) throw fail(404, 'Teacher not found.');
    if (teacher.block === newBlock) throw fail(400, `${teacherName(teacher)} is already in block ${newBlock}.`);

    const oldBlock = teacher.block;
    await Teacher.updateOne({ schoolId: teacherId }, { block: newBlock });
    await new Notification({
      userSchoolId: teacherId, title: 'Block Reassigned', type: 'block',
      message: `${teacherName(req.teacher)} (Dean) reassigned you from block ${oldBlock || '(none)'} to block ${newBlock}.`
    }).save();

    res.json({ success: true, message: `${teacherName(teacher)} reassigned to block ${newBlock}.`, block: newBlock });
  } catch (err) { sendErr(res, err, 'Failed to reassign the teacher.'); }
};

// A Dean may mark any registered course complete for any student (Teachers are limited to their own courses).
const completeCourseAsDean = async (req, res) => {
  const { schoolId, courseCode } = req.body;
  try {
    if (!schoolId || !courseCode) throw fail(400, 'schoolId and courseCode are required.');
    const student = await markCourseComplete({
      studentSchoolId: schoolId, courseCode, byName: teacherName(req.teacher), byRole: 'Dean'
    });
    res.json({ success: true, message: `${courseCode} marked as completed.`, student });
  } catch (err) { sendErr(res, err, 'Failed to mark course as completed.'); }
};

// Creates a block in the Block collection (code, name, optional student cap).
const createBlock = async (req, res) => {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    let max = req.body.maxAmountOfStudents;

    if (!code) throw fail(400, 'Block code is required.');
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,19}$/.test(code)) throw fail(400, 'Block code may use letters, numbers, spaces, - and _ (max 20 characters).');
    if (!name) throw fail(400, 'Block name is required.');
    if (name.length > 80) throw fail(400, 'Block name is too long (max 80 characters).');
    if (max === '' || max === null || max === undefined) max = undefined;
    else if (!Number.isInteger(max) || max < 1 || max > 500) throw fail(400, 'Maximum students must be a whole number from 1 to 500.');

    // Codes are compared case-insensitively against every block that exists (including ones only students use).
    if ((await listBlocks()).some(b => b.code.toLowerCase() === code.toLowerCase())) throw fail(409, `Block ${code} already exists.`);

    const block = await new Block({ code, name, studentsRegistered: [], amountOfStudents: 0, maxAmountOfStudents: max }).save();
    res.json({ success: true, message: `Block ${code} created.`, block });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ success: false, message: 'That block already exists.' });
    sendErr(res, err, 'Failed to create the block.');
  }
};

// A Dean assigns (or takes over) a course for themselves. A course has one instructor, so taking over replaces
// the current one, who is notified.
const claimCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ code: req.params.code });
    if (!course) throw fail(404, 'Course not found.');
    if (course.instructorID === req.teacher.schoolId) throw fail(400, 'You already handle this course.');
    const previous = course.instructorID;
    await setCourseInstructor(course.code, req.teacher.schoolId);
    if (previous) {
      await new Notification({
        userSchoolId: previous, title: 'Course Reassigned', type: 'course',
        message: `${teacherName(req.teacher)} (Dean) took over ${course.code} - ${course.name}. You are no longer its instructor.`
      }).save();
    }
    res.json({ success: true, message: `You now handle ${course.code}.`, course: await Course.findOne({ code: course.code }).lean() });
  } catch (err) { sendErr(res, err, 'Failed to assign the course to you.'); }
};

// A Dean hands a course they handle back (it shows as TBA until someone is assigned).
const releaseCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ code: req.params.code });
    if (!course) throw fail(404, 'Course not found.');
    if (course.instructorID !== req.teacher.schoolId) throw fail(403, 'You do not handle this course.');
    await setCourseInstructor(course.code, '');
    res.json({ success: true, message: `${course.code} released. It now shows as TBA.` });
  } catch (err) { sendErr(res, err, 'Failed to release the course.'); }
};

module.exports = { createBlock, claimCourse, releaseCourse, getBlocks, reassignStudentBlock, getDeanUsers, reassignTeacherBlock, completeCourseAsDean };
