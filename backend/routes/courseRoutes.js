const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

router.get('/courses', courseController.getCourses);
router.get('/instructor/course/:courseCode', courseController.getInstructorCourse);
router.post('/instructor/course/update', courseController.updateInstructorCourse);

module.exports = router;