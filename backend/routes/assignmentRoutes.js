const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { requireTeacher } = require('../middleware/requireStaff');

router.get('/assignments/:courseCode', assignmentController.getAssignmentsByCourse);
router.post('/assignments/create', requireTeacher, assignmentController.createAssignment);
router.post('/assignments/grade', requireTeacher, assignmentController.gradeSubmission);
router.post('/assignments/submit', assignmentController.submitAssignment);
router.delete('/assignments/:id', requireTeacher, assignmentController.deleteAssignment);

module.exports = router;