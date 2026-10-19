const CourseContent = require('../models/CourseContent');
const Student = require('../models/Student');

const KINDS = ['announcements', 'videos', 'materials'];

/**
 * The content (announcements, videos, shared files) of one course in ONE block. Every block has its own document,
 * so what a professor posts in IT201 is never seen by IT202.
 *
 * The block-less document (block: '') is the course's original, course-wide content from before content was
 * per block. When a block opens the course for the first time it starts with a copy of that, then the two are
 * independent. Pass block '' to read the course-wide document itself.
 */
const getBlockContent = async (courseCode, block = '') => {
  const existing = await CourseContent.findOne({ courseCode, block });
  if (existing) return existing;

  const base = block ? await CourseContent.findOne({ courseCode, block: '' }).lean() : null;
  const copy = Object.fromEntries(KINDS.map(k => [k, (base?.[k] || []).map(({ _id, ...item }) => item)]));
  try {
    return await CourseContent.create({ courseCode, block, ...copy });
  } catch (err) {
    if (err && err.code === 11000) return CourseContent.findOne({ courseCode, block }); // created by a parallel request
    throw err;
  }
};

/** The block a student's content comes from (read from the database, not trusted from the client). */
const studentBlock = async (studentId) => (await Student.findOne({ schoolId: studentId }, 'block').lean())?.block || '';

/**
 * One-off fix, safe to run at every start: course content used to be one document per course (unique courseCode).
 * Mark those documents as the course-wide ones (block '') and swap the old unique index for the per-block one.
 */
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
