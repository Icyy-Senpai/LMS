const express = require('express');
const multer = require('multer');
const { generateQuizFromPDF } = require('../controllers/quizController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Changed field name from 'lessonPdf' to 'lessonDoc'
router.post('/quiz/generate', upload.single('lessonDoc'), generateQuizFromPDF);

module.exports = router;