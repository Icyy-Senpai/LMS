const Teacher = require('../models/Teacher');

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

const requireTeacher = (req, res, next) => load(req, res, next, { dean: false });
const requireDean = (req, res, next) => load(req, res, next, { dean: true });

module.exports = { requireTeacher, requireDean };
