const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { requireTeacher } = require('../middleware/requireStaff');

router.get('/courses', courseController.getCourses);
router.get('/instructor/course/:courseCode', courseController.getInstructorCourse);
// Posting announcements / videos / shared files: the course's professor in that block only.
router.post('/instructor/course/update', requireTeacher, courseController.updateInstructorCourse);
router.get('/instructor/course/:courseCode/roster', courseController.getTeacherCourseRoster);
router.post('/instructor/course/complete', courseController.completeCourseForStudent);

module.exports = router;