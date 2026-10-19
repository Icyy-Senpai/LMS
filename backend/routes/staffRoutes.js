const express = require('express');
const router = express.Router();
const staff = require('../controllers/staffController');
const admin = require('../controllers/adminController');
const { requireTeacher, requireDean } = require('../middleware/requireStaff');

// Teachers AND Deans
router.get('/staff/blocks', requireTeacher, staff.getBlocks);
router.get('/staff/my-subjects', requireTeacher, staff.getMySubjects);
router.put('/staff/students/block', requireTeacher, staff.reassignStudentBlock);

// Deans only
router.get('/dean/users', requireDean, staff.getDeanUsers);
router.get('/dean/courses', requireDean, admin.getAllCourses);
router.put('/dean/students/block', requireDean, staff.reassignStudentBlockAsDean);
router.post('/dean/blocks', requireDean, staff.createBlock);
// Subjects registered to a block, and the professor of each (Block.assignedSubjects / Block.courseProfessors)
router.post('/dean/blocks/:code/subjects', requireDean, staff.addBlockSubject);
router.delete('/dean/blocks/:code/subjects/:courseCode', requireDean, staff.removeBlockSubject);
router.put('/dean/blocks/:code/professor', requireDean, staff.setBlockProfessor);
// Course Assignments: enrol / unenrol students, assign / remove instructors (including the Dean assigning a course to themselves).
router.post('/dean/assign-course', requireDean, admin.assignUserCourse);
router.post('/dean/remove-course', requireDean, admin.removeUserCourse);
router.post('/dean/complete-course', requireDean, staff.completeCourseAsDean);

module.exports = router;
