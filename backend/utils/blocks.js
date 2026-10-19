const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Block = require('../models/Block');

/**
 * Every block that exists: the Block collection plus any block string already used by a Student or Teacher.
 * Student.block / Teacher.block are plain strings (e.g. "IT201"), so this is the single place that merges them.
 */
const listBlocks = async () => {
  const [docs, studentBlocks, teacherBlocks] = await Promise.all([
    Block.find({}, 'code name').lean(),
    Student.distinct('block'),
    Teacher.distinct('block')
  ]);
  const codes = new Set();
  docs.forEach(b => b.code && codes.add(b.code));
  [...studentBlocks, ...teacherBlocks].forEach(b => { if (b && String(b).trim()) codes.add(String(b).trim()); });

  const result = [];
  for (const code of [...codes].sort()) {
    const [studentCount, teacherCount] = await Promise.all([
      Student.countDocuments({ block: code }), Teacher.countDocuments({ block: code })
    ]);
    result.push({ code, studentCount, teacherCount });
  }
  return result;
};

/**
 * Keeps the Block collection (used by the leaderboard to group classmates) in step with Student.block.
 * Only touches Block documents when the student is already registered in one, or the target Block exists,
 * so installs that never populated the Block collection are left alone.
 */
const syncBlockCollection = async (student, newBlock) => {
  const label = `${student.lastName}, ${student.firstName}`;
  const oldDoc = await Block.findOne({ 'studentsRegistered.schoolId': student.schoolId });
  if (oldDoc && oldDoc.code === newBlock) return;

  if (oldDoc) {
    oldDoc.studentsRegistered = oldDoc.studentsRegistered.filter(s => s.schoolId !== student.schoolId);
    oldDoc.amountOfStudents = oldDoc.studentsRegistered.length;
    await oldDoc.save();
  }

  let newDoc = await Block.findOne({ code: newBlock });
  if (!newDoc && oldDoc) newDoc = new Block({ code: newBlock, name: newBlock, studentsRegistered: [] });
  if (newDoc) {
    newDoc.studentsRegistered.push({ name: label, schoolId: student.schoolId });
    newDoc.amountOfStudents = newDoc.studentsRegistered.length;
    await newDoc.save();
  }
};

module.exports = { listBlocks, syncBlockCollection };
