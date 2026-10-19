const express = require('express');
const router = express.Router();
const badges = require('../controllers/badgeController');
const { requireTeacher } = require('../middleware/requireStaff');

// Teachers AND Deans (a Dean is a Teacher account), for courses they instruct
router.get('/badges/course/:code', requireTeacher, badges.getCourseBadges);
router.post('/badges', requireTeacher, badges.createBadge);
router.post('/badges/generate-image', requireTeacher, badges.generateBadgeImage);
router.post('/badges/:id/assign', requireTeacher, badges.assignBadge);
router.delete('/badges/:id', requireTeacher, badges.deleteBadge);

// A student's own badges (profile)
router.get('/badges/student/:schoolId', badges.getStudentBadges);

module.exports = router;
