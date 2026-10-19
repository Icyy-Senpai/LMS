const express = require('express');
const router = express.Router();
const staff = require('../controllers/staffController');
const admin = require('../controllers/adminController');
const { requireTeacher, requireDean } = require('../middleware/requireStaff');

// Teachers AND Deans
router.get('/staff/blocks', requireTeacher, staff.getBlocks);
router.put('/staff/students/block', requireTeacher, staff.reassignStudentBlock);

// Deans only
router.get('/dean/users', requireDean, staff.getDeanUsers);
router.get('/dean/courses', requireDean, admin.getAllCourses);
router.put('/dean/teachers/block', requireDean, staff.reassignTeacherBlock);
// Reassigning users with courses (enrol / unenrol students, assign / remove instructors) used to be an Admin feature.
router.post('/dean/assign-course', requireDean, admin.assignUserCourse);
router.post('/dean/remove-course', requireDean, admin.removeUserCourse);
router.post('/dean/complete-course', requireDean, staff.completeCourseAsDean);

module.exports = router;
