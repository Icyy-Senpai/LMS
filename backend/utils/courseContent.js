const CourseContent = require('../models/CourseContent');
const Student = require('../models/Student');

const KINDS = ['announcements', 'videos', 'materials'];

const getBlockContent = async (courseCode, block = '') => {
  const existing = await CourseContent.findOne({ courseCode, block });
  if (existing) return existing;

  const base = block ? await CourseContent.findOne({ courseCode, block: '' }).lean() : null;
  const copy = Object.fromEntries(KINDS.map(k => [k, (base?.[k] || []).map(({ _id, ...item }) => item)]));
  try {
    return await CourseContent.create({ courseCode, block, ...copy });
  } catch (err) {
    if (err && err.code === 11000) return CourseContent.findOne({ courseCode, block });
    throw err;
  }
};

const studentBlock = async (studentId) => (await Student.findOne({ schoolId: studentId }, 'block').lean())?.block || '';

const migrateCourseContent = async () => {
  try {
    const indexes = await CourseContent.collection.indexes().catch(() => []);
    if (indexes.some(i => i.name === 'courseCode_1')) await CourseContent.collection.dropIndex('courseCode_1');
    await CourseContent.collection.updateMany({ block: { $exists: false } }, { $set: { block: '' } });
    await CourseContent.createIndexes();
  } catch (err) {
    console.error('Course content migration failed:', err);
  }
};

module.exports = { KINDS, getBlockContent, studentBlock, migrateCourseContent };
