const Badge = require('../models/Badge');
const { BADGE_SHAPES } = require('../models/Badge');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { assertTeaches } = require('../utils/blocks');

const fail = (status, message) => Object.assign(new Error(message), { status });
const sendErr = (res, err, fallback) => {
  if (err && err.status) return res.status(err.status).json({ success: false, message: err.message });
  if (err && err.code === 11000) return res.status(409).json({ success: false, message: 'A badge with that name already exists for this course and block.' });
  if (err && err.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(' ') });
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};

const teacherName = (t) => `Prof. ${t.lastName}, ${t.firstName}`;
const MAX_IMAGE_CHARS = 1500000; // ~1.1 MB of image data once base64-decoded

// Badges belong to a course + block, and a teacher (or Dean, who is also a teacher) may only manage the badges of
// the blocks they teach that course in (Block.courseProfessors).
const ownedCourse = async (teacher, courseCode, blockCode) => (await assertTeaches(teacher, courseCode, blockCode)).course;

const getCourseBadges = async (req, res) => {
  try {
    const block = typeof req.query.block === 'string' ? req.query.block : '';
    if (!block) throw fail(400, 'block is required.');
    await ownedCourse(req.teacher, req.params.code, block);
    const badges = await Badge.find({ course: req.params.code, block }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, badges });
  } catch (err) { sendErr(res, err, 'Failed to load badges.'); }
};

const createBadge = async (req, res) => {
  const { name, photoUrl, shape, courseCode, block } = req.body;
  try {
    const blockCode = typeof block === 'string' ? block.trim() : '';
    if (!blockCode) throw fail(400, 'Please choose a block.');
    const course = await ownedCourse(req.teacher, courseCode, blockCode);

    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName) throw fail(400, 'Badge name is required.');
    if (cleanName.length > 60) throw fail(400, 'Badge name is too long (max 60 characters).');
    if (!BADGE_SHAPES.includes(shape)) throw fail(400, 'Please choose a badge shape.');
    if (typeof photoUrl !== 'string' || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(photoUrl)) throw fail(400, 'Please upload an image for the badge.');
    if (photoUrl.length > MAX_IMAGE_CHARS) throw fail(400, 'The badge image is too large.');

    const badge = await new Badge({
      name: cleanName, photoUrl, shape,
      course: course.code, block: blockCode, department: course.targetProgram,
      createdBy: req.teacher.schoolId, createdByName: teacherName(req.teacher)
    }).save();
    res.json({ success: true, message: 'Badge created.', badge });
  } catch (err) { sendErr(res, err, 'Failed to create the badge.'); }
};

const deleteBadge = async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) throw fail(404, 'Badge not found.');
    await ownedCourse(req.teacher, badge.course, badge.block);
    await badge.deleteOne(); // students lose it from their profile too: profiles read badges straight from this collection
    res.json({ success: true, message: 'Badge deleted.' });
  } catch (err) { sendErr(res, err, 'Failed to delete the badge.'); }
};

const assignBadge = async (req, res) => {
  const { studentId } = req.body;
  try {
    if (!studentId) throw fail(400, 'studentId is required.');
    const badge = await Badge.findById(req.params.id);
    if (!badge) throw fail(404, 'Badge not found.');
    await ownedCourse(req.teacher, badge.course, badge.block);

    const student = await Student.findOne({ schoolId: studentId });
    if (!student) throw fail(404, 'Student not found.');
    const inCourse = [...(student.enrolledCourseSubjects || []), ...(student.completedCourses || [])].some(c => c.code === badge.course);
    if (!inCourse) throw fail(400, 'That student is not in this course.');
    if (student.block !== badge.block) throw fail(400, `This badge is for block ${badge.block}, but the student is in block ${student.block || '(none)'}.`);

    // One atomic update guarded on "not already awarded", so a double click can never award it twice.
    const result = await Badge.updateOne(
      { _id: badge._id, 'studentsWithBadge.schoolId': { $ne: studentId } },
      { $push: { studentsWithBadge: {
        name: `${student.lastName}, ${student.firstName}`, schoolId: student.schoolId, department: student.department,
        awardedAt: new Date(), awardedBy: teacherName(req.teacher)
      } } }
    );
    if (result.modifiedCount === 0) throw fail(409, 'That student already has this badge.');

    await new Notification({
      userSchoolId: student.schoolId, title: 'New Badge Earned', type: 'badge',
      message: `${teacherName(req.teacher)} awarded you the "${badge.name}" badge for ${badge.course}. It now appears in your profile.`
    }).save();

    res.json({ success: true, message: `"${badge.name}" assigned to ${student.firstName} ${student.lastName}.` });
  } catch (err) { sendErr(res, err, 'Failed to assign the badge.'); }
};

// The badges one student has earned (shown in their profile).
const getStudentBadges = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const badges = await Badge.find({ 'studentsWithBadge.schoolId': schoolId }, '-studentsWithBadge.name').lean();
    const courses = await Course.find({ code: { $in: badges.map(b => b.course) } }, 'code name').lean();
    const nameOf = Object.fromEntries(courses.map(c => [c.code, c.name]));
    const out = badges.map(b => {
      const mine = b.studentsWithBadge.find(s => s.schoolId === schoolId);
      return {
        _id: b._id, name: b.name, photoUrl: b.photoUrl, shape: b.shape,
        course: b.course, courseName: nameOf[b.course] || '', awardedAt: mine?.awardedAt, awardedBy: mine?.awardedBy || ''
      };
    }).sort((a, b) => new Date(b.awardedAt || 0) - new Date(a.awardedAt || 0));
    res.json({ success: true, badges: out });
  } catch (err) { sendErr(res, err, 'Failed to load badges.'); }
};

module.exports = { getCourseBadges, createBadge, deleteBadge, assignBadge, getStudentBadges };
