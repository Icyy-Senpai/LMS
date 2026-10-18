const Course = require('../models/Course');
const CourseContent = require('../models/CourseContent');
const Teacher = require('../models/Teacher');

const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).lean();
    for (let course of courses) {
      if (course.instructorID) {
        const teacher = await Teacher.findOne({ schoolId: course.instructorID });
        if (teacher) {
          course.instructor = `Prof. ${teacher.lastName}, ${teacher.firstName} ${teacher.middleName}`;
        }
      }
    }
    res.json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching courses' });
  }
};

const getInstructorCourse = async (req, res) => {
  try {
    let content = await CourseContent.findOne({ courseCode: req.params.courseCode });
    if (!content) {
      content = new CourseContent({ courseCode: req.params.courseCode, videos: [], materials: [], quizzes: [], enrolledStudents: [], assignments: [] });
      await content.save();
    }
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching course content' });
  }
};

const updateInstructorCourse = async (req, res) => {
  const { courseCode, videos, materials, quizzes, announcements, assignments } = req.body;
  try {
    const updated = await CourseContent.findOneAndUpdate(
      { courseCode },
      { videos, materials, quizzes, announcements, assignments },
      { new: true, upsert: true }
    );
    res.json({ success: true, content: updated, message: 'Course updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating course content' });
  }
};

module.exports = { getCourses, getInstructorCourse, updateInstructorCourse };