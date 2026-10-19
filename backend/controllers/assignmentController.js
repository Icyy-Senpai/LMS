const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { blocksTaughtBy, assertTeaches } = require('../utils/blocks');

const getAssignmentsByCourse = async (req, res) => {
  try {
    let blocks = null;
    if (req.query.studentId) {
      const student = await Student.findOne({ schoolId: req.query.studentId }, 'block').lean();
      blocks = student?.block ? [student.block] : [];
    } else if (req.query.block) {
      blocks = String(req.query.block).split(',').map(b => b.trim()).filter(Boolean);
    }

    const query = { courseCode: req.params.courseCode };
    if (blocks) query.block = { $in: [...blocks, '', null] };
    const assignments = await Assignment.find(query).sort({ createdAt: -1 }).lean();

    const blockStudents = blocks ? new Set(await Student.distinct('schoolId', { block: { $in: blocks } })) : null;
    for (let i = 0; i < assignments.length; i++) {
        let subs = await Submission.find({ assignmentId: assignments[i]._id }).lean();
        if (blockStudents && !assignments[i].block) subs = subs.filter(s => blockStudents.has(s.studentUsername));
        assignments[i].submissions = subs;
    }
        
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching assignments' });
  }
};

const createAssignment = async (req, res) => {
  try {
    const block = typeof req.body.block === 'string' ? req.body.block.trim() : '';
    if (!block) return res.status(400).json({ success: false, message: 'Open the block you want to post this in first.' });
    await assertTeaches(req.teacher, req.body.courseCode, block);
    const newAssignment = new Assignment({ ...req.body, block });
    await newAssignment.save();
    
    const assObj = newAssignment.toObject();
    assObj.submissions = [];
    
    res.json({ success: true, message: 'Assignment created successfully', assignment: assObj });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Server error creating assignment' });
  }
};

const submitAssignment = async (req, res) => {
  const { assignmentId, studentUsername, fileUrl, fileName, fileData, answers, grade, cheatingFlag } = req.body;
  
  try {
    if (req.header('x-admin-id') || req.header('x-teacher-id')) {
      return res.status(403).json({ success: false, message: 'Only students can submit work.' });
    }
    if (!studentUsername || !(await Student.exists({ schoolId: studentUsername }))) {
      return res.status(403).json({ success: false, message: 'Only students can submit work.' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.block) {
      const student = await Student.findOne({ schoolId: studentUsername }, 'block').lean();
      if (student?.block !== assignment.block) {
        return res.status(403).json({ success: false, message: `This ${assignment.type === 'Quiz' ? 'quiz' : 'assignment'} is only for block ${assignment.block}.` });
      }
    }

    if (assignment.autoClose && new Date() > new Date(assignment.deadline)) {
      return res.status(400).json({ success: false, message: 'Submissions are strictly closed for this assignment.' });
    }

    let submission = await Submission.findOne({ assignmentId, studentUsername });
    
    if (submission) {
      submission.fileUrl = fileUrl !== undefined ? fileUrl : submission.fileUrl;
      submission.fileName = fileName !== undefined ? fileName : submission.fileName;
      submission.fileData = fileData !== undefined ? fileData : submission.fileData;
      submission.answers = answers !== undefined ? answers : submission.answers;
      submission.grade = grade !== undefined ? grade : submission.grade;
      submission.cheatingFlag = cheatingFlag !== undefined ? cheatingFlag : submission.cheatingFlag;
      submission.submittedAt = new Date();
      await submission.save();
    } else {
      submission = new Submission({
        assignmentId, 
        courseCode: assignment.courseCode, 
        studentUsername, 
        fileUrl, 
        fileName, 
        fileData, 
        answers, 
        grade, 
        cheatingFlag
      });
      await submission.save();
    }

    res.json({ success: true, message: 'Submitted successfully', submission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting assignment' });
  }
};

const gradeSubmission = async (req, res) => {
  const { submissionId, grade, feedback } = req.body;
  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    const course = await Course.findOne({ code: submission.courseCode });
    const assignment = await Assignment.findById(submission.assignmentId, 'block').lean();
    const blocks = course ? await blocksTaughtBy(req.teacher, course) : [];
    let allowed;
    if (assignment?.block) {
      allowed = blocks.includes(assignment.block);
    } else {
      const student = await Student.findOne({ schoolId: submission.studentUsername }, 'block').lean();
      allowed = course && (course.instructorID === req.teacher.schoolId || (student?.block && blocks.includes(student.block)));
    }
    if (!allowed) {
      return res.status(403).json({ success: false, message: assignment?.block
        ? `Only the professor of ${submission.courseCode} in block ${assignment.block} can grade this.`
        : 'You can only grade submissions of students in the blocks you teach this course in.' });
    }

    const prevGrade = submission.grade || 0;
    const newGrade = Number(grade);
    
    submission.grade = newGrade;
    submission.feedback = feedback;
    await submission.save();

    const expDifference = newGrade - prevGrade;
    if (expDifference !== 0) {
      await Student.findOneAndUpdate(
        { schoolId: submission.studentUsername },
        { $inc: { points: expDifference } }
      );
    }
    
    res.json({ success: true, message: 'Grade saved successfully', submission });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error saving grade' });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.block) {
      await assertTeaches(req.teacher, assignment.courseCode, assignment.block);
    } else {
      const course = await Course.findOne({ code: assignment.courseCode }, 'instructorID').lean();
      if (course?.instructorID !== req.teacher.schoolId) {
        return res.status(403).json({ success: false, message: 'This older assignment is shared by every block; only the course lead instructor can delete it.' });
      }
    }
    await Assignment.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ assignmentId: req.params.id });
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: 'Error deleting assignment' });
  }
};

module.exports = { getAssignmentsByCourse, createAssignment, submitAssignment, gradeSubmission, deleteAssignment };