const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');

router.get('/assignments/:courseCode', assignmentController.getAssignmentsByCourse);
router.post('/assignments/create', assignmentController.createAssignment);
router.post('/assignments/grade', assignmentController.gradeSubmission);
router.post('/assignments/submit', assignmentController.submitAssignment);
router.delete('/assignments/:id', assignmentController.deleteAssignment);

module.exports = router;