const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Block = require('../models/Block');

const fail = (status, message) => Object.assign(new Error(message), { status });
const studentLabel = (s) => `${s.lastName}, ${s.firstName}`;
const teacherLabel = (t) => `Prof. ${t.lastName}, ${t.firstName}`;

/**
 * Every block with its counts, subjects and the professor of each subject. The Block collection is the source of
 * truth (migrateBlocks() makes sure every Student.block has a Block document).
 */
const listBlocks = async () => {
  const blocks = await Block.find({}).sort({ code: 1 }).lean();
  const courseIds = blocks.flatMap(b => (b.assignedSubjects || []).map(s => s.subjectId));
  const teacherIds = blocks.flatMap(b => (b.courseProfessors || []).map(p => p.teacherId));
  const [courses, teachers] = await Promise.all([
    Course.find({ _id: { $in: courseIds } }, 'code name color').lean(),
    Teacher.find({ _id: { $in: teacherIds } }, 'schoolId firstName lastName').lean()
  ]);
  const courseById = new Map(courses.map(c => [String(c._id), c]));
  const teacherById = new Map(teachers.map(t => [String(t._id), t]));

  return blocks.map(b => {
    const professors = b.courseProfessors || [];
    const subjects = (b.assignedSubjects || []).map(s => {
      const course = courseById.get(String(s.subjectId));
      const prof = professors.find(p => String(p.subjectId) === String(s.subjectId));
      const teacher = prof && teacherById.get(String(prof.teacherId));
      return {
        subjectId: s.subjectId, code: course?.code || s.code, name: course?.name || '(deleted course)', color: course?.color,
        professor: teacher ? { _id: teacher._id, schoolId: teacher.schoolId, name: teacherLabel(teacher) } : null
      };
    });
    return {
      _id: b._id, code: b.code, name: b.name,
      maxAmountOfStudents: b.maxAmountOfStudents ?? null,
      studentCount: (b.studentsRegistered || []).length,
      teacherCount: new Set(professors.map(p => String(p.teacherId))).size,
      subjects
    };
  });
};

const findBlock = async (value) => {
  const code = typeof value === 'string' ? value.trim() : '';
  if (!code) throw fail(400, 'Please choose a block.');
  const block = await Block.findOne({ code });
  if (!block) throw fail(400, `Block "${code}" does not exist.`);
  return block;
};

const refreshCounts = (codes) => Block.updateMany(
  { code: { $in: codes.filter(Boolean) } },
  [{ $set: { amountOfStudents: { $size: '$studentsRegistered' } } }],
  { updatePipeline: true }
);

/**
 * Puts a student in a block (or removes them from every block when blockCode is empty). Keeps Student.block and
 * Block.studentsRegistered in step; a student is only ever registered in one block.
 *
 * autoEnroll = true:  the student is enrolled in the new block's subjects, and un-enrolled from the old block's
 *                     subjects that the new block does not have. Completed courses are never touched.
 * autoEnroll = false: only the block changes; course enrolment is left as it is.
 */
const assignStudentToBlock = async ({ studentSchoolId, blockCode, autoEnroll = false }) => {
  const student = await Student.findOne({ schoolId: studentSchoolId });
  if (!student) throw fail(404, 'Student not found.');

  const newBlock = blockCode ? await findBlock(blockCode) : null;
  const oldBlock = await Block.findOne({ 'studentsRegistered.schoolId': student.schoolId });
  const oldCode = oldBlock?.code || student.block || '';

  if (newBlock && oldBlock && oldBlock.code === newBlock.code && student.block === newBlock.code) {
    throw fail(400, `The student is already in block ${newBlock.code}.`);
  }
  if (newBlock && newBlock.maxAmountOfStudents && oldBlock?.code !== newBlock.code
      && newBlock.studentsRegistered.length >= newBlock.maxAmountOfStudents) {
    throw fail(400, `Block ${newBlock.code} is full (${newBlock.studentsRegistered.length}/${newBlock.maxAmountOfStudents} students).`);
  }

  // Leave every other block, then join the new one.
  await Block.updateMany(
    { 'studentsRegistered.schoolId': student.schoolId, ...(newBlock ? { code: { $ne: newBlock.code } } : {}) },
    { $pull: { studentsRegistered: { schoolId: student.schoolId } } }
  );
  if (newBlock) {
    await Block.updateOne(
      { _id: newBlock._id, 'studentsRegistered.schoolId': { $ne: student.schoolId } },
      { $push: { studentsRegistered: { name: studentLabel(student), schoolId: student.schoolId } } }
    );
  }
  await refreshCounts([oldCode, newBlock?.code]);

  const enrolled = [];
  const unenrolled = [];
  if (autoEnroll) {
    const newCodes = (newBlock?.assignedSubjects || []).map(s => s.code);
    const oldCodes = (oldBlock && oldBlock.code !== newBlock?.code ? oldBlock.assignedSubjects : []).map(s => s.code);
    const completed = new Set((student.completedCourses || []).map(c => c.code));
    const current = new Set((student.enrolledCourseSubjects || []).map(c => c.code));

    oldCodes.filter(c => !newCodes.includes(c) && current.has(c)).forEach(c => { current.delete(c); unenrolled.push(c); });
    newCodes.filter(c => !current.has(c) && !completed.has(c)).forEach(c => { current.add(c); enrolled.push(c); });
    student.enrolledCourseSubjects = [...current].map(code => ({ code }));
  }
  student.block = newBlock ? newBlock.code : '';
  await student.save();

  return { student, oldBlock: oldCode, newBlock: student.block, enrolled, unenrolled };
};

/** Enrols (or un-enrols) every student of a block in one course. Completed courses are left alone. */
const enrollBlockStudents = async (block, courseCode, enroll) => {
  const ids = (block.studentsRegistered || []).map(s => s.schoolId);
  if (ids.length === 0) return 0;
  const res = enroll
    ? await Student.updateMany(
      { schoolId: { $in: ids }, 'enrolledCourseSubjects.code': { $ne: courseCode }, 'completedCourses.code': { $ne: courseCode } },
      { $push: { enrolledCourseSubjects: { code: courseCode } } })
    : await Student.updateMany({ schoolId: { $in: ids } }, { $pull: { enrolledCourseSubjects: { code: courseCode } } });
  return res.modifiedCount;
};

/** Codes of the blocks in which `teacher` is the professor of `course`. */
const blocksTaughtBy = async (teacher, course) => (
  await Block.find({ courseProfessors: { $elemMatch: { subjectId: course._id, teacherId: teacher._id } } }, 'code').lean()
).map(b => b.code);

/**
 * Who may work on a course:
 *  - With a block: only the professor assigned to that course in that block (Block.courseProfessors).
 *  - Without a block (course-wide content / assignments): the course's lead instructor (Course.instructorID,
 *    assigned by a Dean) or anyone who teaches it in at least one block.
 */
const assertTeaches = async (teacher, courseCode, blockCode) => {
  const course = await Course.findOne({ code: courseCode });
  if (!course) throw fail(404, 'Course not found.');
  const blocks = await blocksTaughtBy(teacher, course);
  if (blockCode) {
    if (!blocks.includes(blockCode)) throw fail(403, `You do not teach ${course.code} in block ${blockCode}.`);
  } else if (course.instructorID !== teacher.schoolId && blocks.length === 0) {
    throw fail(403, 'You are not an instructor of this course.');
  }
  return { course, blocks };
};

/**
 * One-off data fixes, run at server start (safe to run every time):
 *  - replaces the old unique index on studentsRegistered.schoolId, which made a 2nd empty block impossible to create;
 *  - makes sure every block used by a student has a Block document and lists exactly the students in it;
 *  - removes the old single Teacher.block field (teachers now hold blocks through Block.courseProfessors).
 */
const migrateBlocks = async () => {
  try {
    const indexes = await Block.collection.indexes().catch(() => []);
    if (indexes.some(i => i.name === 'studentsRegistered.schoolId_1')) {
      await Block.collection.dropIndex('studentsRegistered.schoolId_1');
    }

    const students = await Student.find({ block: { $nin: [null, ''] } }, 'schoolId firstName lastName block').lean();
    const byBlock = new Map();
    students.forEach(s => {
      const code = String(s.block).trim();
      if (!byBlock.has(code)) byBlock.set(code, []);
      byBlock.get(code).push({ name: studentLabel(s), schoolId: s.schoolId });
    });

    const existing = await Block.find({}, 'code').lean();
    const known = new Set(existing.map(b => b.code));
    for (const code of byBlock.keys()) {
      if (!known.has(code)) await Block.collection.insertOne({ code, name: code, assignedSubjects: [], courseProfessors: [], studentsRegistered: [], amountOfStudents: 0 });
    }
    // Clear everyone first so the unique index never sees a student in two blocks mid-way.
    await Block.collection.updateMany({}, { $set: { studentsRegistered: [], amountOfStudents: 0 } });
    for (const [code, list] of byBlock) {
      await Block.collection.updateOne({ code }, { $set: { studentsRegistered: list, amountOfStudents: list.length } });
    }
    await Block.collection.updateMany({ assignedSubjects: { $exists: false } }, { $set: { assignedSubjects: [] } });
    await Block.collection.updateMany({ courseProfessors: { $exists: false } }, { $set: { courseProfessors: [] } });
    await Teacher.collection.updateMany({ block: { $exists: true } }, { $unset: { block: '' } });

    await Block.createIndexes();
  } catch (err) {
    console.error('Block migration failed:', err);
  }
};

module.exports = {
  listBlocks, findBlock, assignStudentToBlock, enrollBlockStudents, blocksTaughtBy, assertTeaches, migrateBlocks, teacherLabel
};
