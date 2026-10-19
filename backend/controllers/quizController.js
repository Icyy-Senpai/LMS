
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const OPENROUTER_URL =
  'https://openrouter.ai/api/v1/chat/completions';

// Set this in backend/.env to an available free model.
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || 'openrouter/free';

// Upper bound for one reply. The actual budget scales with the number of questions (see tokenBudget).
const MAX_OUTPUT_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS) || 8192;
const MAX_LESSON_CHARS = 60000;
const MAX_ATTEMPTS = 2;

// ~250 tokens per question plus headroom for models that "think" before answering.
const tokenBudget = (questionCount) =>
  Math.min(MAX_OUTPUT_TOKENS, 2048 + questionCount * 250);

const askOpenRouter = async (prompt, maxTokens) => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing from backend/.env');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'LMS Quiz Generator'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
      // Keep reasoning models from spending the whole budget thinking, and keep their thoughts out of `content`.
      reasoning: { effort: 'low', exclude: true }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message || response.statusText;

    if (response.status === 402) {
      throw new Error(
        `OpenRouter has insufficient credits for this request. ` +
        `Check the model, max_tokens, and account credits. Details: ${message}`
      );
    }

    if (response.status === 429) {
      throw new Error(
        `OpenRouter rate limit or quota reached: ${message}`
      );
    }

    throw new Error(`OpenRouter ${response.status}: ${message}`);
  }

  const choice = data?.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(
      choice?.finish_reason === 'length'
        ? 'The AI ran out of tokens before answering. Try fewer questions.'
        : 'OpenRouter returned an empty response.'
    );
  }

  return { content, truncated: choice?.finish_reason === 'length', model: data?.model };
};

// Pulls the question list out of whatever the model sent back: a bare array, an object wrapping one
// ({"questions": [...]}), JSON inside Markdown fences, or JSON preceded by <think>...</think> reasoning.
const extractJsonArray = (text) => {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .trim();

  const fromParsed = (parsed) => {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const list = parsed.questions || parsed.quiz || Object.values(parsed).find(Array.isArray);
      if (Array.isArray(list)) return list;
    }
    return null;
  };

  // 1) The whole reply is JSON.
  try {
    const list = fromParsed(JSON.parse(cleaned));
    if (list) return list;
  } catch { /* fall through */ }

  // 2) JSON array or object surrounded by other text.
  for (const [open, close] of [['[', ']'], ['{', '}']]) {
    const first = cleaned.indexOf(open);
    const last = cleaned.lastIndexOf(close);
    if (first === -1 || last <= first) continue;
    try {
      const list = fromParsed(JSON.parse(cleaned.slice(first, last + 1)));
      if (list) return list;
    } catch { /* try the next shape */ }
  }

  throw new Error('AI response did not contain a JSON array.');
};

// Asks the model for the quiz, retrying once when the reply is cut off or is not usable JSON
// (free models behind openrouter/free vary a lot from one request to the next).
const generateQuizQuestions = async (prompt, expectedCount) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { content, truncated, model } = await askOpenRouter(prompt, tokenBudget(expectedCount));
      try {
        return extractJsonArray(content);
      } catch (parseError) {
        console.warn(
          `Quiz attempt ${attempt} (${model || OPENROUTER_MODEL}) returned unusable output` +
          `${truncated ? ' (cut off at the token limit)' : ''}. First 500 chars:\n${content.slice(0, 500)}`
        );
        throw truncated
          ? new Error('The AI response was cut off before the quiz was complete. Try fewer questions.')
          : parseError;
      }
    } catch (error) {
      lastError = error;
      // Credit / rate-limit / auth errors will not fix themselves on a retry.
      if (/^OpenRouter (has insufficient|rate limit|4\d\d)/.test(error.message)) break;
    }
  }

  throw lastError;
};

const generateQuizFromPDF = async (req, res) => {
  let tempFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document uploaded.'
      });
    }

    let lessonText = '';
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.pdf') {
      const parser = new PDFParse({ data: req.file.buffer });

      try {
        const pdfData = await parser.getText();
        lessonText = pdfData.text || '';
      } finally {
        await parser.destroy();
      }
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({
        buffer: req.file.buffer
      });

      lessonText = result.value || '';
    } else if (ext === '.pptx') {
      tempFilePath = path.join(
        os.tmpdir(),
        `quiz-${Date.now()}-${Math.random()
          .toString(36).slice(2)}${ext}`
      );

      fs.writeFileSync(tempFilePath, req.file.buffer);

      lessonText = await new Promise((resolve, reject) => {
        officeParser.parseOffice(tempFilePath, (data, err) => {
          if (err) return reject(err);
          resolve(data);
        });
      });

      lessonText = String(lessonText || '');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file format. Upload PDF, DOCX, or PPTX.'
      });
    }

    if (!lessonText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No readable text was found in the document.'
      });
    }

    const {
      mcqCount,
      fillBlankCount,
      enumCount,
      quizTitle,
      deadline,
      autoClose,
      maxGrade
    } = req.body;

    const counts = [
      Number(mcqCount),
      Number(fillBlankCount),
      Number(enumCount)
    ];

    if (
      counts.some(n => !Number.isInteger(n) || n < 0) ||
      counts.reduce((sum, n) => sum + n, 0) < 1 ||
      counts.reduce((sum, n) => sum + n, 0) > 50
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide valid question counts. Generate between 1 and 50 questions.'
      });
    }

    // Limit input size to help control token usage.
    const limitedLessonText = lessonText.slice(0, MAX_LESSON_CHARS);

    const prompt = `
You are an expert educator. Generate a quiz using the lesson text below.

Create exactly:
- ${counts[0]} multiple-choice questions, each with four options.
- ${counts[1]} fill-in-the-blank questions.
- ${counts[2]} enumeration questions.

Use only information supported by the lesson. Do not invent facts.
Return ONLY a valid JSON array. Do not include Markdown or explanations.

Required schemas:
{"type":"mcq","question":"Question text","options":["A","B","C","D"],"answer":"A"}
{"type":"fill_blank","question":"Complete the sentence ___.","answer":"Correct answer"}
{"type":"enumeration","question":"List three examples of ...","answer":"1. First, 2. Second, 3. Third"}

For multiple choice, answer must exactly match one of the four options.
For enumeration, provide a complete answer list.

Lesson text:
${limitedLessonText}
`;

    const expectedCount = counts.reduce((sum, n) => sum + n, 0);
    const quizData = await generateQuizQuestions(prompt, expectedCount);

    if (quizData.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} questions, received ${quizData.length}.`
      );
    }

    const validTypes = ['mcq', 'fill_blank', 'enumeration'];

    for (const question of quizData) {
      if (
        !question ||
        !validTypes.includes(question.type) ||
        typeof question.question !== 'string' ||
        typeof question.answer !== 'string'
      ) {
        throw new Error('AI returned a question with an invalid structure.');
      }

      if (
        question.type === 'mcq' &&
        (!Array.isArray(question.options) ||
          question.options.length !== 4)
      ) {
        throw new Error('AI returned an invalid multiple-choice question.');
      }
    }

    res.json({
      success: true,
      quiz: quizData,
      metadata: {
        quizTitle,
        deadline,
        autoClose: autoClose === 'true',
        maxGrade: Number(maxGrade) || 100
      }
    });
  } catch (error) {
    console.error('AI Quiz Generation Error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate quiz.'
    });
  } finally {
    if (tempFilePath) {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error('Temporary file cleanup failed:', cleanupError);
      }
    }
  }
};

module.exports = { generateQuizFromPDF };
