const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const Block = require('../models/Block');
const { markCourseComplete } = require('../utils/courseCompletion');
const { listBlocks, findBlock, assignStudentToBlock, enrollBlockStudents } = require('../utils/blocks');

const teacherName = (t) => `Prof. ${t.lastName}, ${t.firstName}`;

const sendErr = (res, err, fallback) => {
  if (err && err.status) return res.status(err.status).json({ success: false, message: err.message });
  if (err && err.code === 11000) return res.status(409).json({ success: false, message: 'That student is already registered in another block.' });
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};
const fail = (status, message) => Object.assign(new Error(message), { status });
// A Dean can only place teachers of their own department in blocks. A Dean with no department set can place no one.
const norm = (d) => String(d || '').trim().toLowerCase();
const sameDepartment = (teacher, dean) => Boolean(norm(dean.department)) && norm(teacher.department) === norm(dean.department);

// Moves a student to a block (see utils/blocks.js) and tells them about it.
const moveStudent = async ({ studentId, block, autoEnroll, by }) => {
  const result = await assignStudentToBlock({ studentSchoolId: studentId, blockCode: block, autoEnroll: autoEnroll === true });
  const changes = [
    result.enrolled.length ? ` You were enrolled in ${result.enrolled.join(', ')}.` : '',
    result.unenrolled.length ? ` You were removed from ${result.unenrolled.join(', ')}.` : ''
  ].join('');
  await new Notification({
    userSchoolId: studentId, title: 'Block Changed', type: 'block',
    message: `${by} moved you from block ${result.oldBlock || '(none)'} to block ${result.newBlock}.${changes}`
  }).save();
  const summary = [
    result.enrolled.length ? `enrolled in ${result.enrolled.length} subject(s)` : '',
    result.unenrolled.length ? `removed from ${result.unenrolled.length} subject(s)` : ''
  ].filter(Boolean).join(', ');
  return { result, message: `Student moved to block ${result.newBlock}${summary ? ` (${summary})` : ''}.` };
};

/* ------------------------------------------------------------------ */
/*  TEACHERS + DEANS                                                   */
/* ------------------------------------------------------------------ */
const getBlocks = async (req, res) => {
  try { res.json({ success: true, blocks: await listBlocks() }); }
  catch (err) { sendErr(res, err, 'Failed to load blocks.'); }
};

// The subjects this teacher handles, each with the blocks they teach it in (Block.courseProfessors).
// Courses they lead (Course.instructorID) but teach in no block yet are listed too, with no blocks.
const getMySubjects = async (req, res) => {
  try {
    const t = req.teacher;
    const [blocks, leadCourses] = await Promise.all([
      Block.find({ 'courseProfessors.teacherId': t._id }).sort({ code: 1 }).lean(),
      Course.find({ instructorID: t.schoolId }).lean()
    ]);
    const blockCourseIds = blocks.flatMap(b => b.courseProfessors.filter(p => String(p.teacherId) === String(t._id)).map(p => p.subjectId));
    const courses = [...leadCourses, ...(await Course.find({ _id: { $in: blockCourseIds } }).lean())];

    const byId = new Map();
    courses.forEach(c => { if (!byId.has(String(c._id))) byId.set(String(c._id), { ...c, isLead: c.instructorID === t.schoolId, blocks: [] }); });
    blocks.forEach(b => b.courseProfessors
      .filter(p => String(p.teacherId) === String(t._id) && byId.has(String(p.subjectId)))
      .forEach(p => byId.get(String(p.subjectId)).blocks.push({
        code: b.code, name: b.name, studentCount: (b.studentsRegistered || []).length, maxAmountOfStudents: b.maxAmountOfStudents ?? null
      })));

    res.json({ success: true, subjects: [...byId.values()].sort((a, b) => a.code.localeCompare(b.code)) });
  } catch (err) { sendErr(res, err, 'Failed to load your subjects.'); }
};

// A teacher (or dean) may move a student who is currently in one of the blocks they teach.
const reassignStudentBlock = async (req, res) => {
  const { studentId, block, autoEnroll } = req.body;
  try {
    if (!studentId) throw fail(400, 'studentId is required.');
    const student = await Student.findOne({ schoolId: studentId }, 'block').lean();
    if (!student) throw fail(404, 'Student not found.');
    const mine = student.block && await Block.exists({ code: student.block, 'courseProfessors.teacherId': req.teacher._id });
    if (!mine && req.teacher.isDean !== true) throw fail(403, 'You can only move students who are in one of the blocks you teach.');

    const { result, message } = await moveStudent({ studentId, block, autoEnroll, by: teacherName(req.teacher) });
    res.json({ success: true, message, block: result.newBlock });
  } catch (err) { sendErr(res, err, 'Failed to reassign the student.'); }
};

/* ------------------------------------------------------------------ */
/*  DEANS ONLY                                                         */
/* ------------------------------------------------------------------ */
const FIELDS = 'schoolId firstName lastName middleName department status isDean';

// Students and teachers only (a Dean has no business seeing Admin accounts). Each teacher comes with the
// blocks / subjects they teach.
const getDeanUsers = async (req, res) => {
  try {
    const [students, teachers, blocks, courses] = await Promise.all([
      Student.find({}, `${FIELDS} block yearLevel enrolledCourseSubjects completedCourses`).lean(),
      Teacher.find({}, `${FIELDS} courseSubjectHeld`).lean(),
      Block.find({}, 'code courseProfessors').lean(),
      Course.find({}, 'code').lean()
    ]);
    const codeOf = new Map(courses.map(c => [String(c._id), c.code]));
    const loads = new Map(); // teacher _id -> [{ block, course }]
    blocks.forEach(b => (b.courseProfessors || []).forEach(p => {
      const key = String(p.teacherId);
      if (!loads.has(key)) loads.set(key, []);
      loads.get(key).push({ block: b.code, course: codeOf.get(String(p.subjectId)) || '?' });
    }));
    res.json({
      success: true,
      users: [
        ...students.map(u => ({ ...u, accountType: 'Student' })),
        ...teachers.map(u => ({ ...u, accountType: 'Teacher', isDean: u.isDean === true, teaching: loads.get(String(u._id)) || [] }))
      ]
    });
  } catch (err) { sendErr(res, err, 'Failed to load users.'); }
};

// A Dean may move any student to any block.
const reassignStudentBlockAsDean = async (req, res) => {
  const { studentId, block, autoEnroll } = req.body;
  try {
    if (!studentId) throw fail(400, 'studentId is required.');
    const { result, message } = await moveStudent({ studentId, block, autoEnroll, by: `${teacherName(req.teacher)} (Dean)` });
    res.json({ success: true, message, block: result.newBlock });
  } catch (err) { sendErr(res, err, 'Failed to reassign the student.'); }
};

// Registers a subject (course) to a block. Optionally enrols the block's students in it.
const addBlockSubject = async (req, res) => {
  const { courseCode, enrollStudents } = req.body;
  try {
    const block = await findBlock(req.params.code);
    const course = await Course.findOne({ code: courseCode });
    if (!course) throw fail(404, 'Course not found.');
    if (block.assignedSubjects.some(s => String(s.subjectId) === String(course._id))) throw fail(400, `${course.code} is already registered to block ${block.code}.`);

    block.assignedSubjects.push({ subjectId: course._id, code: course.code });
    await block.save();
    const enrolled = enrollStudents === true ? await enrollBlockStudents(block, course.code, true) : 0;
    res.json({ success: true, message: `${course.code} added to block ${block.code}${enrollStudents === true ? ` (${enrolled} student(s) enrolled)` : ''}.` });
  } catch (err) { sendErr(res, err, 'Failed to add the subject.'); }
};

// Removes a subject from a block, together with its professor there. ?unenroll=true also un-enrols the block's students.
const removeBlockSubject = async (req, res) => {
  try {
    const block = await findBlock(req.params.code);
    const { courseCode } = req.params;
    const entry = block.assignedSubjects.find(s => s.code === courseCode);
    if (!entry) throw fail(404, 'That subject is not registered to this block.');
    const subjectId = String(entry.subjectId);

    const prof = block.courseProfessors.find(p => String(p.subjectId) === subjectId);
    block.assignedSubjects = block.assignedSubjects.filter(s => String(s.subjectId) !== subjectId);
    block.courseProfessors = block.courseProfessors.filter(p => String(p.subjectId) !== subjectId);
    await block.save();

    if (prof) {
      const t = await Teacher.findById(prof.teacherId, 'schoolId').lean();
      if (t) await new Notification({
        userSchoolId: t.schoolId, title: 'Block Assignment', type: 'block',
        message: `${teacherName(req.teacher)} (Dean) removed ${courseCode} from block ${block.code}. You no longer teach it there.`
      }).save();
    }
    const unenrolled = req.query.unenroll === 'true' ? await enrollBlockStudents(block, courseCode, false) : 0;
    res.json({ success: true, message: `${courseCode} removed from block ${block.code}${unenrolled ? ` (${unenrolled} student(s) un-enrolled)` : ''}.` });
  } catch (err) { sendErr(res, err, 'Failed to remove the subject.'); }
};

// Sets (or clears, with an empty teacherId) the professor of one subject in one block.
// Stored in Block.courseProfessors as { subjectId: Course._id, teacherId: Teacher._id }.
const setBlockProfessor = async (req, res) => {
  const { courseCode, teacherId } = req.body;
  try {
    const block = await findBlock(req.params.code);
    const course = await Course.findOne({ code: courseCode });
    if (!course) throw fail(404, 'Course not found.');
    if (!block.assignedSubjects.some(s => String(s.subjectId) === String(course._id))) throw fail(400, `${course.code} is not registered to block ${block.code}. Add the subject first.`);

    const teacher = teacherId ? await Teacher.findOne({ schoolId: teacherId }) : null;
    if (teacherId && !teacher) throw fail(404, 'Teacher not found.');
    if (teacher && teacher.status === 'Suspended') throw fail(400, 'That teacher account is suspended.');
    if (teacher && !sameDepartment(teacher, req.teacher)) {
      throw fail(403, `You can only assign teachers from your own department (${req.teacher.department || 'none set'}). ${teacherName(teacher)} is in ${teacher.department || 'no department'}.`);
    }

    const current = block.courseProfessors.find(p => String(p.subjectId) === String(course._id));
    if (teacher && current && String(current.teacherId) === String(teacher._id)) throw fail(400, `${teacherName(teacher)} already teaches ${course.code} in this block.`);
    // Likewise a Dean cannot remove or replace a professor who belongs to another department.
    const currentTeacher = current ? await Teacher.findById(current.teacherId, 'firstName lastName department').lean() : null;
    if (currentTeacher && !sameDepartment(currentTeacher, req.teacher)) {
      throw fail(403, `${teacherName(currentTeacher)} (${currentTeacher.department || 'no department'}) teaches ${course.code} here. Only a Dean of that department can change it.`);
    }

    block.courseProfessors = block.courseProfessors.filter(p => String(p.subjectId) !== String(course._id));
    if (teacher) block.courseProfessors.push({ subjectId: course._id, teacherId: teacher._id });
    await block.save();

    const notes = [];
    if (current && (!teacher || String(current.teacherId) !== String(teacher._id))) {
      const prev = await Teacher.findById(current.teacherId, 'schoolId').lean();
      if (prev) notes.push({ userSchoolId: prev.schoolId, message: `${teacherName(req.teacher)} (Dean) unassigned you from ${course.code} in block ${block.code}.` });
    }
    if (teacher) notes.push({ userSchoolId: teacher.schoolId, message: `${teacherName(req.teacher)} (Dean) assigned you to teach ${course.code} - ${course.name} in block ${block.code}.` });
    await Promise.all(notes.map(n => new Notification({ ...n, title: 'Block Assignment', type: 'block' }).save()));

    res.json({ success: true, message: teacher ? `${teacherName(teacher)} now teaches ${course.code} in block ${block.code}.` : `${course.code} in block ${block.code} has no professor now.` });
  } catch (err) { sendErr(res, err, 'Failed to set the professor.'); }
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

    const block = await new Block({ code, name, assignedSubjects: [], courseProfessors: [], studentsRegistered: [], amountOfStudents: 0, maxAmountOfStudents: max }).save();
    res.json({ success: true, message: `Block ${code} created.`, block });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ success: false, message: 'That block already exists.' });
    sendErr(res, err, 'Failed to create the block.');
  }
};

module.exports = {
  createBlock, getBlocks, getMySubjects, reassignStudentBlock, getDeanUsers, reassignStudentBlockAsDean,
  addBlockSubject, removeBlockSubject, setBlockProfessor, completeCourseAsDean
};
