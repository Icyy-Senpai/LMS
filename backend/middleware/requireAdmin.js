const Admin = require('../models/Admin');

// Lightweight guard for every /api/admin/* route.
// The client sends the logged-in admin's _id in the `x-admin-id` header.
// NOTE: the app has no tokens/sessions yet, so this only proves the id belongs to an
// active Admin document. Swap this for JWT verification when real auth is added.
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
