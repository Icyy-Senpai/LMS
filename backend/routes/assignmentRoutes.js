const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { requireTeacher } = require('../middleware/requireStaff');

router.get('/assignments/:courseCode', assignmentController.getAssignmentsByCourse);
// Creating / deleting assignments and quizzes: Teachers and Deans only, for courses they teach.
router.post('/assignments/create', requireTeacher, assignmentController.createAssignment);
// Grading: Teachers and Deans only (never Admins), and only for courses they instruct.
router.post('/assignments/grade', requireTeacher, assignmentController.gradeSubmission);
router.post('/assignments/submit', assignmentController.submitAssignment);
router.delete('/assignments/:id', requireTeacher, assignmentController.deleteAssignment);

module.exports = router;