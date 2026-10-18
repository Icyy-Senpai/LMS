const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Student = require('../models/Student');

const getAssignmentsByCourse = async (req, res) => {
  try {
    // 1. Fetch assignments
    const assignments = await Assignment.find({ courseCode: req.params.courseCode }).sort({ createdAt: -1 }).lean();
    
    // 2. Fetch and attach submissions dynamically
    for (let i = 0; i < assignments.length; i++) {
        const subs = await Submission.find({ assignmentId: assignments[i]._id });
        assignments[i].submissions = subs;
    }
    
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching assignments' });
  }
};

const createAssignment = async (req, res) => {
  try {
    const newAssignment = new Assignment(req.body);
    await newAssignment.save();
    
    const assObj = newAssignment.toObject();
    assObj.submissions = [];
    
    res.json({ success: true, message: 'Assignment created successfully', assignment: assObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating assignment' });
  }
};

const submitAssignment = async (req, res) => {
  const { assignmentId, studentUsername, fileUrl, fileName, fileData, answers, grade, cheatingFlag } = req.body;
  
  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    if (assignment.autoClose && new Date() > new Date(assignment.deadline)) {
      return res.status(400).json({ success: false, message: 'Submissions are strictly closed for this assignment.' });
    }

    // Upsert the submission in the new model
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

    const prevGrade = submission.grade || 0;
    const newGrade = Number(grade);
    
    submission.grade = newGrade;
    submission.feedback = feedback;
    await submission.save();

    // Give EXP points to the student based on the grade change
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
    await Assignment.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ assignmentId: req.params.id });
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting assignment' });
  }
};

module.exports = { getAssignmentsByCourse, createAssignment, submitAssignment, gradeSubmission, deleteAssignment };