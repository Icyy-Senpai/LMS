const express = require('express');
const router = express.Router();
const badges = require('../controllers/badgeController');
const { requireTeacher } = require('../middleware/requireStaff');

router.get('/badges/course/:code', requireTeacher, badges.getCourseBadges);
router.post('/badges', requireTeacher, badges.createBadge);
router.post('/badges/:id/assign', requireTeacher, badges.assignBadge);
router.delete('/badges/:id', requireTeacher, badges.deleteBadge);

router.get('/badges/student/:schoolId', badges.getStudentBadges);

module.exports = router;
