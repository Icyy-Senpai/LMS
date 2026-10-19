const express = require('express');
const multer = require('multer');
const { generateQuizFromPDF } = require('../controllers/quizController');
const { requireTeacher } = require('../middleware/requireStaff');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Changed field name from 'lessonPdf' to 'lessonDoc'
// AI quiz generation: Teachers and Deans only.
router.post('/quiz/generate', requireTeacher, upload.single('lessonDoc'), generateQuizFromPDF);

module.exports = router;