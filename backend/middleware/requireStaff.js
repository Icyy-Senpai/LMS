const Teacher = require('../models/Teacher');

// Guards for the teacher / dean endpoints (/api/staff/* and /api/dean/*).
// The client sends the logged-in teacher's schoolId in the `x-teacher-id` header (see lms/src/api.js).
// The Dean check is made against the database (Teacher.isDean), never against anything the client claims.
// NOTE: like the rest of the non-admin API there are no tokens/sessions yet, so this only proves the id belongs
// to an active Teacher account. Swap for JWT verification when real auth is added.
const load = async (req, res, next, { dean }) => {
  try {
    const schoolId = req.header('x-teacher-id');
    if (!schoolId) return res.status(401).json({ success: false, message: 'Teacher authentication required.' });
    const teacher = await Teacher.findOne({ schoolId });
    if (!teacher || teacher.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Teacher access denied.' });
    }
    if (dean && teacher.isDean !== true) {
      return res.status(403).json({ success: false, message: 'This action is only available to Dean accounts.' });
    }
    req.teacher = teacher;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
};

const requireTeacher = (req, res, next) => load(req, res, next, { dean: false }); // Teachers and Deans
const requireDean = (req, res, next) => load(req, res, next, { dean: true });     // Deans only

module.exports = { requireTeacher, requireDean };
