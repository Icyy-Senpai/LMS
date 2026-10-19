const Admin = require('../models/Admin');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const adminId = req.header('x-admin-id');
    if (!adminId) return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    const admin = await Admin.findById(adminId);
    if (!admin || admin.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Admin access denied.' });
    }
    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  }
};
