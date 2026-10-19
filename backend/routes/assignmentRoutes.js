const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { requireTeacher } = require('../middleware/requireStaff');

router.get('/assignments/:courseCode', assignmentController.getAssignmentsByCourse);
router.post('/assignments/create', assignmentController.createAssignment);
// Grading: Teachers and Deans only (never Admins), and only for courses they instruct.
router.post('/assignments/grade', requireTeacher, assignmentController.gradeSubmission);
router.post('/assignments/submit', assignmentController.submitAssignment);
router.delete('/assignments/:id', assignmentController.deleteAssignment);

module.exports = router;