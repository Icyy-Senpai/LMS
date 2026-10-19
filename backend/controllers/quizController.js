const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); 

// Ensure you replace the fallback string with your actual env variable in production
const genAI = new GoogleGenerativeAI(process.env.GCP_API_KEY);

const generateQuizFromPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document uploaded' });
    }

    let lessonText = '';
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Route text extraction based on file extension
    if (ext === '.pdf') {
      const parser = new PDFParse({ data: req.file.buffer });
      const pdfData = await parser.getText();
      await parser.destroy();
      lessonText = pdfData.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      lessonText = result.value;
    } else if (ext === '.pptx') {
      // Write buffer to a temporary file for officeparser
      const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}${ext}`);
      fs.writeFileSync(tempFilePath, req.file.buffer);
      
      // FIX: Wrap the older callback-based parseOffice method in a Promise
      lessonText = await new Promise((resolve, reject) => {
        officeParser.parseOffice(tempFilePath, (data, err) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath); 
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file format. Please upload PDF, DOCX, or PPTX.' });
    }

    const { mcqCount, fillBlankCount, enumCount, quizTitle, deadline, autoClose, maxGrade } = req.body;

    const prompt = `
      You are an expert educator. Read the following lesson text and generate a quiz.
      Requirements:
      - ${mcqCount} Multiple Choice questions (4 options each).
      - ${fillBlankCount} Fill-in-the-blank questions.
      - ${enumCount} Enumeration (list) questions.
      
      You MUST return ONLY a valid JSON array of objects. Do not use markdown blocks.
      
      Schema Example:
      [
        { "type": "mcq", "question": "...", "options": ["A", "B", "C", "D"], "answer": "B" },
        { "type": "fill_blank", "question": "The capital of France is ___.", "answer": "Paris" },
        { "type": "enumeration", "question": "List 3 types of...", "answer": "1. X, 2. Y, 3. Z" }
      ]

      Lesson Text:
      ${lessonText}
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text();
    
    // Clean up potential markdown formatting from the AI response
    aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const quizData = JSON.parse(aiResponse);

    res.json({ 
      success: true, 
      quiz: quizData,
      metadata: { quizTitle, deadline, autoClose: autoClose === 'true', maxGrade: Number(maxGrade) || 100 }
    });

  } catch (error) {
    console.error('AI Quiz Generation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate quiz. Ensure text is readable.' });
  }
};

module.exports = { generateQuizFromPDF };