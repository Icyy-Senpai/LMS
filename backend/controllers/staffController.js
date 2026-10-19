const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
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

module.exports = { getBlocks, reassignStudentBlock, getDeanUsers, reassignTeacherBlock, completeCourseAsDean };
