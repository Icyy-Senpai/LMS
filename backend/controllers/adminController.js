const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Course = require('../models/Course');
const CourseContent = require('../models/CourseContent');
const Forum = require('../models/Forum');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const { getNextSchoolId } = require('../utils/schoolId');
const { markCourseComplete } = require('../utils/courseCompletion');

const fail = (res, err, fallback, code = 500) => {
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ success: false, message: `That ${field} is already in use.` });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(' ') });
  }
  console.error(fallback, err);
  return res.status(code).json({ success: false, message: fallback });
};

const modelFor = (type) => (type === 'Student' ? Student : type === 'Teacher' ? Teacher : type === 'Admin' ? Admin : null);
const pick = (obj, keys) => keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

/* ------------------------------------------------------------------ */
/*  DASHBOARD                                                          */
/* ------------------------------------------------------------------ */
const getSystemStats = async (req, res) => {
  try {
    const [students, teachers, admins, courses, forums, assignments, submissions, ungraded, sSusp, tSusp] = await Promise.all([
      Student.countDocuments(), Teacher.countDocuments(), Admin.countDocuments(),
      Course.countDocuments(), Forum.countDocuments(), Assignment.countDocuments(),
      Submission.countDocuments(), Submission.countDocuments({ grade: null }),
      Student.countDocuments({ status: 'Suspended' }), Teacher.countDocuments({ status: 'Suspended' })
    ]);
    res.json({
      success: true,
      stats: {
        users: students + teachers + admins, students, teachers, admins,
        courses, forums, assignments, submissions, ungraded, suspended: sSusp + tSusp
      }
    });
  } catch (err) { fail(res, err, 'Failed to load stats.'); }
};

/* ------------------------------------------------------------------ */
/*  USERS  (add / edit / suspend / reset password / delete)            */
/* ------------------------------------------------------------------ */
const getAllUsers = async (req, res) => {
  try {
    const [students, teachers, admins] = await Promise.all([
      Student.find({}, '-password -notifications -todos').lean(),
      Teacher.find({}, '-password -notifications').lean(),
      Admin.find({}, '-password -notifications').lean()
    ]);
    const users = [
      ...students.map(u => ({ ...u, accountType: 'Student', status: u.status || 'Active' })),
      ...teachers.map(u => ({ ...u, accountType: 'Teacher', status: u.status || 'Active' })),
      ...admins.map(u => ({ ...u, accountType: 'Admin', schoolEmail: u.email, status: u.status || 'Active' }))
    ];
    res.json({ success: true, users });
  } catch (err) { fail(res, err, 'Failed to load users.'); }
};

// Fields the admin may set on Student / Teacher records.
const COMMON_FIELDS = [
  'lastName', 'firstName', 'middleName', 'middleInitial', 'suffix', 'bithDate', 'countryOfBirth', 'birthPlace',
  'civilStatus', 'gender', 'religion', 'mobileNum', 'teleNum', 'personalEmail',
  'presentAddress', 'presentProvince', 'presentcmun', 'presentHouseNum', 'presentBrgy', 'presentPostal',
  'permanentAddress', 'permanentProvince', 'permanentCmun', 'permanentHouseNum', 'permanentBrgy', 'permanentPostal',
  'schoolEmail', 'department', 'bio'
];
const STUDENT_ONLY = ['yearLevel', 'block'];

// The Student/Teacher schemas mark many profile fields as required. The admin form only collects the
// essentials, so anything left blank is filled with a neutral placeholder the user can update in Settings.
const withDefaults = (data) => {
  const d = { ...data };
  ['middleName', 'countryOfBirth', 'birthPlace', 'civilStatus', 'gender', 'religion',
    'presentAddress', 'presentProvince', 'presentcmun', 'presentHouseNum',
    'permanentAddress', 'permanentProvince', 'permanentCmun', 'permanentHouseNum', 'permanentBrgy', 'permanentPostal'
  ].forEach(k => { if (d[k] === undefined || d[k] === '') d[k] = 'N/A'; });
  if (!d.bithDate) d.bithDate = 'N/A';
  if (!d.middleInitial) d.middleInitial = (d.middleName && d.middleName !== 'N/A') ? d.middleName.trim()[0].toUpperCase() : 'N';
  ['mobileNum', 'teleNum', 'presentBrgy', 'presentPostal'].forEach(k => { if (d[k] === undefined || d[k] === '' || d[k] === null) d[k] = 0; });
  if (!d.personalEmail) d.personalEmail = d.schoolEmail;
  return d;
};

const createUser = async (req, res) => {
  const { accountType, password } = req.body;
  try {
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    if (accountType === 'Admin') {
      const { username, firstName, lastName, email, phone, organization } = req.body;
      if (!username) return res.status(400).json({ success: false, message: 'Username is required.' });
      const admin = await new Admin({ username, password, role: 'Admin', firstName, lastName, email, phone, organization }).save();
      const out = admin.toObject(); delete out.password;
      return res.json({ success: true, message: 'Admin account created.', user: { ...out, accountType: 'Admin' } });
    }

    const Model = modelFor(accountType);
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid account type.' });

    const allowed = accountType === 'Student' ? [...COMMON_FIELDS, ...STUDENT_ONLY] : COMMON_FIELDS;
    const data = withDefaults(pick(req.body, allowed));

    // The School ID is always assigned by the server (next number after the highest existing ID);
    // any schoolId sent by the client is ignored. Retry if another admin grabbed the same number first.
    let created;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const schoolId = await getNextSchoolId(accountType);
        created = await new Model({ ...data, schoolId, password, accountType, status: 'Active' }).save();
        break;
      } catch (err) {
        const clash = err && err.code === 11000 && err.keyPattern && err.keyPattern.schoolId;
        if (!clash || attempt === 4) throw err;
      }
    }
    const out = created.toObject(); delete out.password;
    res.json({ success: true, message: `${accountType} account created. School ID: ${created.schoolId}`, user: out });
  } catch (err) { fail(res, err, 'Failed to create user.'); }
};

// Lets the "Add User" form show the ID that will be assigned before the admin submits.
const previewNextSchoolId = async (req, res) => {
  try {
    const { accountType } = req.query;
    if (!['Student', 'Teacher'].includes(accountType)) return res.status(400).json({ success: false, message: 'accountType must be Student or Teacher.' });
    res.json({ success: true, schoolId: await getNextSchoolId(accountType) });
  } catch (err) { fail(res, err, 'Failed to generate the next School ID.'); }
};

const updateUser = async (req, res) => {
  const { id, accountType } = req.body;
  try {
    let updated;
    if (accountType === 'Admin') {
      const data = pick(req.body, ['firstName', 'lastName', 'phone', 'organization']);
      if (req.body.schoolEmail !== undefined) data.email = req.body.schoolEmail;
      if (req.body.email !== undefined) data.email = req.body.email;
      updated = await Admin.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    } else {
      const Model = modelFor(accountType);
      if (!Model) return res.status(400).json({ success: false, message: 'Invalid account type.' });
      const allowed = accountType === 'Student' ? [...COMMON_FIELDS, ...STUDENT_ONLY] : COMMON_FIELDS;
      // schoolId is intentionally NOT editable: submissions, forum posts, friendships and
      // enrolments all reference it.
      const data = pick(req.body, allowed);
      if (data.middleName && data.middleName !== 'N/A' && data.middleInitial === undefined) data.middleInitial = data.middleName.trim()[0].toUpperCase();
      updated = await Model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    }
    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
    const out = updated.toObject(); delete out.password;
    res.json({ success: true, message: 'User updated successfully.', user: { ...out, accountType } });
  } catch (err) { fail(res, err, 'Failed to update user.'); }
};

const setUserStatus = async (req, res) => {
  const { id, accountType, status } = req.body;
  try {
    if (!['Active', 'Suspended'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    if (accountType === 'Admin' && String(id) === String(req.admin._id)) {
      return res.status(400).json({ success: false, message: 'You cannot suspend your own account.' });
    }
    const Model = modelFor(accountType);
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid account type.' });
    const updated = await Model.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: `Account ${status === 'Active' ? 'reactivated' : 'suspended'}.` });
  } catch (err) { fail(res, err, 'Failed to change account status.'); }
};

const resetUserPassword = async (req, res) => {
  const { id, accountType, newPassword } = req.body;
  try {
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    const Model = modelFor(accountType);
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid account type.' });
    const updated = await Model.findByIdAndUpdate(id, { password: newPassword }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) { fail(res, err, 'Failed to reset password.'); }
};

const deleteUser = async (req, res) => {
  try {
    const { id, type } = req.params;
    if (type === 'Admin') {
      if (String(id) === String(req.admin._id)) return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
      if ((await Admin.countDocuments()) <= 1) return res.status(400).json({ success: false, message: 'Cannot delete the last admin.' });
      await Admin.findByIdAndDelete(id);
    } else if (type === 'Student') {
      const s = await Student.findByIdAndDelete(id);
      if (s) {
        await Submission.deleteMany({ studentUsername: s.schoolId });
        await Notification.deleteMany({ userSchoolId: s.schoolId });
      }
    } else if (type === 'Teacher') {
      const t = await Teacher.findByIdAndDelete(id);
      if (t) {
        await Course.updateMany({ instructorID: t.schoolId }, { instructorID: '', instructor: 'TBA' });
        await Notification.deleteMany({ userSchoolId: t.schoolId });
      }
    } else return res.status(400).json({ success: false, message: 'Invalid account type.' });
    res.json({ success: true, message: 'User deleted permanently.' });
  } catch (err) { fail(res, err, 'Failed to delete user.'); }
};

/* ------------------------------------------------------------------ */
/*  COURSES  (add / edit / delete + instructor + roster)               */
/* ------------------------------------------------------------------ */
// Keeps Course.instructor*, and every Teacher.courseSubjectHeld, consistent in one place.
const setCourseInstructor = async (courseCode, teacherSchoolId) => {
  const course = await Course.findOne({ code: courseCode });
  if (!course) return;
  if (course.instructorID && course.instructorID !== teacherSchoolId) {
    await Teacher.updateOne({ schoolId: course.instructorID }, { $pull: { courseSubjectHeld: { code: courseCode } } });
  }
  if (teacherSchoolId) {
    const t = await Teacher.findOne({ schoolId: teacherSchoolId });
    if (!t) throw Object.assign(new Error('Teacher not found'), { status: 404 });
    if (!t.courseSubjectHeld.some(c => c.code === courseCode)) {
      await Teacher.updateOne({ schoolId: teacherSchoolId }, { $push: { courseSubjectHeld: { code: courseCode } } });
    }
    course.instructorID = t.schoolId;
    course.instructor = `${t.lastName}, ${t.firstName}`;
  } else {
    course.instructorID = '';
    course.instructor = 'TBA';
  }
  await course.save();
};

const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).sort({ code: 1 }).lean();
    for (const c of courses) {
      c.studentCount = await Student.countDocuments({ 'enrolledCourseSubjects.code': c.code });
      c.assignmentCount = await Assignment.countDocuments({ courseCode: c.code });
    }
    res.json({ success: true, courses });
  } catch (err) { fail(res, err, 'Failed to load courses.'); }
};

const createCourse = async (req, res) => {
  try {
    const { code, name, targetProgram, targetYear, color, instructorID } = req.body;
    const course = await new Course({ code: (code || '').trim(), name, targetProgram, targetYear, color }).save();
    await new CourseContent({ courseCode: course.code }).save();
    if (instructorID) await setCourseInstructor(course.code, instructorID);
    res.json({ success: true, message: 'Course created successfully.', course: await Course.findById(course._id) });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, message: 'Course saved, but the selected instructor was not found.' });
    fail(res, err, 'Failed to create course.');
  }
};

const updateCourse = async (req, res) => {
  const { code, name, targetProgram, targetYear, color, instructorID } = req.body;
  try {
    const updated = await Course.findOneAndUpdate({ code }, { name, targetProgram, targetYear, color }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Course not found.' });
    if (instructorID !== undefined) await setCourseInstructor(code, instructorID || '');
    res.json({ success: true, message: 'Course updated successfully.', course: await Course.findOne({ code }) });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, message: 'Instructor not found.' });
    fail(res, err, 'Failed to update course.');
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { code } = req.params;
    await Course.findOneAndDelete({ code });
    await CourseContent.findOneAndDelete({ courseCode: code });
    await Forum.deleteMany({ courseCode: code });
    await Submission.deleteMany({ courseCode: code });
    await Assignment.deleteMany({ courseCode: code });
    // Remove the dangling course code from every enrolled student / assigned teacher
    await Student.updateMany({}, { $pull: { enrolledCourseSubjects: { code } } });
    await Teacher.updateMany({}, { $pull: { courseSubjectHeld: { code } } });
    res.json({ success: true, message: 'Course and all associated data deleted.' });
  } catch (err) { fail(res, err, 'Failed to delete course.'); }
};

const getCourseRoster = async (req, res) => {
  try {
    const { code } = req.params;
    const students = await Student.find({ 'enrolledCourseSubjects.code': code }, 'schoolId firstName lastName department yearLevel block status').lean();
    const teachers = await Teacher.find({ 'courseSubjectHeld.code': code }, 'schoolId firstName lastName department status').lean();
    const completedRaw = await Student.find({ 'completedCourses.code': code }, 'schoolId firstName lastName department yearLevel block completedCourses').lean();
    const completedStudents = completedRaw.map(({ completedCourses, ...s }) => ({ ...s, completion: completedCourses.find(c => c.code === code) }));
    res.json({ success: true, students, teachers, completedStudents });
  } catch (err) { fail(res, err, 'Failed to load roster.'); }
};

// Enrol / unenrol / (re)assign instructor
const assignUserCourse = async (req, res) => {
  const { schoolId, accountType, courseCode } = req.body;
  try {
    const course = await Course.findOne({ code: courseCode });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    if (accountType === 'Student') {
      const student = await Student.findOne({ schoolId });
      if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
      if (student.enrolledCourseSubjects.some(c => c.code === courseCode)) {
        return res.status(400).json({ success: false, message: 'Student is already enrolled in this course.' });
      }
      if ((student.completedCourses || []).some(c => c.code === courseCode)) {
        return res.status(400).json({ success: false, message: 'Student has already completed this course.' });
      }
      student.enrolledCourseSubjects.push({ code: courseCode });
      await student.save();
    } else if (accountType === 'Teacher') {
      const teacher = await Teacher.findOne({ schoolId });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
      if (course.instructorID === schoolId) return res.status(400).json({ success: false, message: 'Teacher already holds this course.' });
      await setCourseInstructor(courseCode, schoolId);
    } else return res.status(400).json({ success: false, message: 'Invalid account type.' });
    res.json({ success: true, message: 'Course assigned successfully!' });
  } catch (err) { fail(res, err, 'Failed to assign course.'); }
};

const removeUserCourse = async (req, res) => {
  const { schoolId, accountType, courseCode } = req.body;
  try {
    if (accountType === 'Student') {
      await Student.updateOne({ schoolId }, { $pull: { enrolledCourseSubjects: { code: courseCode } } });
    } else if (accountType === 'Teacher') {
      const course = await Course.findOne({ code: courseCode });
      if (course && course.instructorID === schoolId) await setCourseInstructor(courseCode, '');
      else await Teacher.updateOne({ schoolId }, { $pull: { courseSubjectHeld: { code: courseCode } } });
    } else return res.status(400).json({ success: false, message: 'Invalid account type.' });
    res.json({ success: true, message: 'Course removed from user successfully!' });
  } catch (err) { fail(res, err, 'Failed to remove course.'); }
};

/* ------------------------------------------------------------------ */
/*  COURSE CONTENT  (announcements / videos / materials)               */
/* ------------------------------------------------------------------ */
const getCourseContent = async (req, res) => {
  try {
    const { code } = req.params;
    let content = await CourseContent.findOne({ courseCode: code }).lean();
    if (!content) content = (await new CourseContent({ courseCode: code }).save()).toObject();
    // Strip base64 blobs so the payload stays small
    content.materials = (content.materials || []).map(m => ({ _id: m._id, title: m.title, fileUrl: m.fileUrl, fileName: m.fileName, hasFile: !!m.fileData }));
    res.json({ success: true, content });
  } catch (err) { fail(res, err, 'Failed to load course content.'); }
};

// Add / edit / delete a single item in one of the content arrays.
const ARRAYS = { announcements: ['title', 'content'], videos: ['title', 'url'], materials: ['title', 'fileUrl'] };

const addContentItem = async (req, res) => {
  const { code, kind } = req.params;
  try {
    if (!ARRAYS[kind]) return res.status(400).json({ success: false, message: 'Invalid content type.' });
    const item = pick(req.body, ARRAYS[kind]);
    if (!item.title) return res.status(400).json({ success: false, message: 'Title is required.' });
    const updated = await CourseContent.findOneAndUpdate({ courseCode: code }, { $push: { [kind]: item } }, { new: true, upsert: true });
    res.json({ success: true, message: 'Added.', item: updated[kind][updated[kind].length - 1] });
  } catch (err) { fail(res, err, 'Failed to add item.'); }
};

const updateContentItem = async (req, res) => {
  const { code, kind, itemId } = req.params;
  try {
    if (!ARRAYS[kind]) return res.status(400).json({ success: false, message: 'Invalid content type.' });
    const set = {};
    Object.entries(pick(req.body, ARRAYS[kind])).forEach(([k, v]) => { set[`${kind}.$.${k}`] = v; });
    const updated = await CourseContent.findOneAndUpdate({ courseCode: code, [`${kind}._id`]: itemId }, { $set: set }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, message: 'Saved.' });
  } catch (err) { fail(res, err, 'Failed to update item.'); }
};

const deleteContentItem = async (req, res) => {
  const { code, kind, itemId } = req.params;
  try {
    if (!ARRAYS[kind]) return res.status(400).json({ success: false, message: 'Invalid content type.' });
    await CourseContent.updateOne({ courseCode: code }, { $pull: { [kind]: { _id: itemId } } });
    res.json({ success: true, message: 'Removed.' });
  } catch (err) { fail(res, err, 'Failed to remove item.'); }
};

/* ------------------------------------------------------------------ */
/*  ASSIGNMENTS / QUIZZES & SUBMISSIONS                                */
/* ------------------------------------------------------------------ */
const getAssignments = async (req, res) => {
  try {
    const query = req.query.courseCode ? { courseCode: req.query.courseCode } : {};
    const list = await Assignment.find(query, '-attachedFiles.fileData').sort({ deadline: -1 }).lean();
    for (const a of list) {
      a.submissionCount = await Submission.countDocuments({ assignmentId: a._id });
      a.ungradedCount = await Submission.countDocuments({ assignmentId: a._id, grade: null });
      a.questionCount = (a.questions || []).length;
      delete a.questions;
    }
    res.json({ success: true, assignments: list });
  } catch (err) { fail(res, err, 'Failed to load assignments.'); }
};

const updateAssignment = async (req, res) => {
  try {
    const data = pick(req.body, ['title', 'instructions', 'deadline', 'autoClose', 'maxGrade']);
    const updated = await Assignment.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true, message: 'Assignment updated.' });
  } catch (err) { fail(res, err, 'Failed to update assignment.'); }
};

const deleteAssignment = async (req, res) => {
  try {
    await Submission.deleteMany({ assignmentId: req.params.id });
    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Assignment and its submissions deleted.' });
  } catch (err) { fail(res, err, 'Failed to delete assignment.'); }
};

const getSubmissions = async (req, res) => {
  try {
    const subs = await Submission.find({ assignmentId: req.params.id }, '-fileData -answers').sort({ submittedAt: -1 }).lean();
    const ids = subs.map(s => s.studentUsername);
    const students = await Student.find({ schoolId: { $in: ids } }, 'schoolId firstName lastName').lean();
    const byId = Object.fromEntries(students.map(s => [s.schoolId, `${s.lastName}, ${s.firstName}`]));
    res.json({ success: true, submissions: subs.map(s => ({ ...s, studentName: byId[s.studentUsername] || s.studentUsername })) });
  } catch (err) { fail(res, err, 'Failed to load submissions.'); }
};

const updateSubmission = async (req, res) => {
  const { grade, feedback, cheatingFlag } = req.body;
  try {
    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found.' });
    if (grade !== undefined && grade !== null && grade !== '') {
      const prev = sub.grade || 0;
      sub.grade = Number(grade);
      // same EXP rule teachers trigger in assignmentController.gradeSubmission
      const diff = sub.grade - prev;
      if (diff !== 0) await Student.updateOne({ schoolId: sub.studentUsername }, { $inc: { points: diff } });
    }
    if (feedback !== undefined) sub.feedback = feedback;
    if (cheatingFlag !== undefined) sub.cheatingFlag = !!cheatingFlag;
    await sub.save();
    res.json({ success: true, message: 'Submission updated.' });
  } catch (err) { fail(res, err, 'Failed to update submission.'); }
};

const deleteSubmission = async (req, res) => {
  try {
    await Submission.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Submission deleted (the student can resubmit).' });
  } catch (err) { fail(res, err, 'Failed to delete submission.'); }
};

/* ------------------------------------------------------------------ */
/*  FORUMS  (add / edit / delete threads + replies)                    */
/* ------------------------------------------------------------------ */
const getAllForums = async (req, res) => {
  try {
    res.json({ success: true, forums: await Forum.find({}).sort({ createdAt: -1 }) });
  } catch (err) { fail(res, err, 'Failed to load forums.'); }
};

const createForum = async (req, res) => {
  try {
    const { courseCode, title, content } = req.body;
    const thread = await new Forum({ courseCode, title, content, author: 'Admin' }).save();
    res.json({ success: true, message: 'Thread created.', thread });
  } catch (err) { fail(res, err, 'Failed to create thread.'); }
};

const updateForum = async (req, res) => {
  try {
    const data = { ...pick(req.body, ['title', 'content', 'courseCode']), updatedAt: new Date() };
    const thread = await Forum.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found.' });
    res.json({ success: true, message: 'Thread updated.', thread });
  } catch (err) { fail(res, err, 'Failed to update thread.'); }
};

const deleteForum = async (req, res) => {
  try {
    await Forum.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Forum thread deleted.' });
  } catch (err) { fail(res, err, 'Failed to delete thread.'); }
};

const addForumReply = async (req, res) => {
  try {
    const thread = await Forum.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found.' });
    thread.replies.push({ author: 'Admin', content: req.body.content });
    thread.updatedAt = new Date();
    await thread.save();
    res.json({ success: true, thread });
  } catch (err) { fail(res, err, 'Failed to add reply.'); }
};

const updateForumReply = async (req, res) => {
  try {
    const thread = await Forum.findById(req.params.id);
    const reply = thread && thread.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found.' });
    reply.content = req.body.content;
    await thread.save();
    res.json({ success: true, thread });
  } catch (err) { fail(res, err, 'Failed to update reply.'); }
};

const deleteForumReply = async (req, res) => {
  try {
    const thread = await Forum.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found.' });
    thread.replies.pull({ _id: req.params.replyId });
    await thread.save();
    res.json({ success: true, thread });
  } catch (err) { fail(res, err, 'Failed to delete reply.'); }
};

/* ------------------------------------------------------------------ */
/*  COURSE COMPLETION  (admin side; teachers use courseController)     */
/* ------------------------------------------------------------------ */
const completeStudentCourse = async (req, res) => {
  const { schoolId, courseCode } = req.body;
  try {
    if (!schoolId || !courseCode) return res.status(400).json({ success: false, message: 'schoolId and courseCode are required.' });
    const student = await markCourseComplete({
      studentSchoolId: schoolId, courseCode,
      byName: `${req.admin.firstName || ''} ${req.admin.lastName || ''}`.trim() || req.admin.username,
      byRole: 'Admin'
    });
    res.json({ success: true, message: `${courseCode} marked as completed.`, student });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    fail(res, err, 'Failed to mark course as completed.');
  }
};

/* ------------------------------------------------------------------ */
/*  DEPARTMENTS                                                        */
/* ------------------------------------------------------------------ */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Departments used to exist only as free-text strings on users and courses. Register any such value
// that has no Department document yet, so existing data shows up (and is editable) right away.
const syncLegacyDepartments = async () => {
  const [sDeps, tDeps, cDeps] = await Promise.all([
    Student.distinct('department'), Teacher.distinct('department'), Course.distinct('targetProgram')
  ]);
  const wanted = [...new Set([...sDeps, ...tDeps, ...cDeps].map(v => (v || '').trim()).filter(Boolean))];
  if (!wanted.length) return;
  const existing = new Set((await Department.find({}, 'name').lean()).map(d => d.name.toLowerCase()));
  const missing = wanted.filter(n => !existing.has(n.toLowerCase()));
  if (missing.length) await Department.insertMany(missing.map(name => ({ name })), { ordered: false }).catch(() => {});
};

const getDepartments = async (req, res) => {
  try {
    await syncLegacyDepartments();
    const departments = await Department.find({}).sort({ name: 1 }).lean();
    for (const d of departments) {
      [d.studentCount, d.teacherCount, d.courseCount] = await Promise.all([
        Student.countDocuments({ department: d.name }),
        Teacher.countDocuments({ department: d.name }),
        Course.countDocuments({ targetProgram: d.name })
      ]);
    }
    res.json({ success: true, departments });
  } catch (err) { fail(res, err, 'Failed to load departments.'); }
};

const nameTaken = (name, exceptId) => Department.findOne({
  name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  ...(exceptId ? { _id: { $ne: exceptId } } : {})
});

const createDepartment = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });
    if (await nameTaken(name)) return res.status(409).json({ success: false, message: 'A department with that name already exists.' });
    const department = await new Department({ name, code: req.body.code, description: req.body.description }).save();
    res.json({ success: true, message: 'Department created.', department });
  } catch (err) { fail(res, err, 'Failed to create department.'); }
};

const updateDepartment = async (req, res) => {
  try {
    const dep = await Department.findById(req.params.id);
    if (!dep) return res.status(404).json({ success: false, message: 'Department not found.' });
    const oldName = dep.name;
    const name = req.body.name !== undefined ? (req.body.name || '').trim() : oldName;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });
    if (name !== oldName && await nameTaken(name, dep._id)) return res.status(409).json({ success: false, message: 'A department with that name already exists.' });

    dep.name = name;
    if (req.body.code !== undefined) dep.code = req.body.code;
    if (req.body.description !== undefined) dep.description = req.body.description;
    await dep.save();

    // Users and courses reference the department by name, so keep them in step with a rename.
    if (name !== oldName) {
      await Promise.all([
        Student.updateMany({ department: oldName }, { department: name }),
        Teacher.updateMany({ department: oldName }, { department: name }),
        Course.updateMany({ targetProgram: oldName }, { targetProgram: name })
      ]);
    }
    res.json({ success: true, message: 'Department updated.', department: dep });
  } catch (err) { fail(res, err, 'Failed to update department.'); }
};

const deleteDepartment = async (req, res) => {
  try {
    const dep = await Department.findById(req.params.id);
    if (!dep) return res.status(404).json({ success: false, message: 'Department not found.' });
    const [s, t, c] = await Promise.all([
      Student.countDocuments({ department: dep.name }),
      Teacher.countDocuments({ department: dep.name }),
      Course.countDocuments({ targetProgram: dep.name })
    ]);
    if (s + t + c > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete "${dep.name}" while it is in use (${s} student(s), ${t} teacher(s), ${c} course(s)). Reassign them first.` });
    }
    await dep.deleteOne();
    res.json({ success: true, message: 'Department deleted.' });
  } catch (err) { fail(res, err, 'Failed to delete department.'); }
};

/* ------------------------------------------------------------------ */
/*  BROADCAST NOTIFICATIONS                                            */
/* ------------------------------------------------------------------ */
const broadcast = async (req, res) => {
  const { title, message, audience, courseCode } = req.body;
  try {
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message are required.' });
    let ids = [];
    if (audience === 'Student' || audience === 'All') ids.push(...(await Student.find({}, 'schoolId').lean()).map(s => s.schoolId));
    if (audience === 'Teacher' || audience === 'All') ids.push(...(await Teacher.find({}, 'schoolId').lean()).map(t => t.schoolId));
    if (audience === 'Course') {
      if (!courseCode) return res.status(400).json({ success: false, message: 'Select a course.' });
      ids.push(...(await Student.find({ 'enrolledCourseSubjects.code': courseCode }, 'schoolId').lean()).map(s => s.schoolId));
      const c = await Course.findOne({ code: courseCode });
      if (c && c.instructorID) ids.push(c.instructorID);
    }
    ids = [...new Set(ids)];
    if (!ids.length) return res.status(400).json({ success: false, message: 'No recipients found for that audience.' });
    await Notification.insertMany(ids.map(id => ({ userSchoolId: id, title, message, type: 'admin' })));
    res.json({ success: true, message: `Notification sent to ${ids.length} user(s).`, count: ids.length });
  } catch (err) { fail(res, err, 'Failed to send notification.'); }
};

/* ------------------------------------------------------------------ */
/*  ADMIN'S OWN PROFILE                                                */
/* ------------------------------------------------------------------ */
const updateOwnProfile = async (req, res) => {
  try {
    const data = pick(req.body, ['firstName', 'lastName', 'email', 'phone', 'organization', 'photoUrl']);
    const updated = await Admin.findByIdAndUpdate(req.admin._id, data, { new: true, runValidators: true });
    const out = updated.toObject(); delete out.password;
    res.json({ success: true, message: 'Profile updated.', user: { ...out, accountType: 'Admin' } });
  } catch (err) { fail(res, err, 'Failed to update profile.'); }
};

const changeOwnPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    if (req.admin.password !== currentPassword) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    req.admin.password = newPassword;
    await req.admin.save();
    res.json({ success: true, message: 'Password changed.' });
  } catch (err) { fail(res, err, 'Failed to change password.'); }
};

module.exports = {
  getSystemStats,
  getAllUsers, createUser, previewNextSchoolId, updateUser, setUserStatus, resetUserPassword, deleteUser,
  completeStudentCourse, getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getAllCourses, createCourse, updateCourse, deleteCourse, getCourseRoster, assignUserCourse, removeUserCourse,
  getCourseContent, addContentItem, updateContentItem, deleteContentItem,
  getAssignments, updateAssignment, deleteAssignment, getSubmissions, updateSubmission, deleteSubmission,
  getAllForums, createForum, updateForum, deleteForum, addForumReply, updateForumReply, deleteForumReply,
  broadcast, updateOwnProfile, changeOwnPassword
};
