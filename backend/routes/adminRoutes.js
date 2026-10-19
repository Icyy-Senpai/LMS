const express = require('express');
const router = express.Router();
const c = require('../controllers/adminController');
const requireAdmin = require('../middleware/requireAdmin');

// Every /api/admin/* request must come from an active Admin account
router.use('/admin', requireAdmin);

router.get('/admin/stats', c.getSystemStats);

// Users
router.get('/admin/users', c.getAllUsers);
router.get('/admin/next-school-id', c.previewNextSchoolId);
router.post('/admin/users', c.createUser);
router.put('/admin/users', c.updateUser);
router.put('/admin/users/status', c.setUserStatus);
router.put('/admin/users/password', c.resetUserPassword);
router.delete('/admin/users/:type/:id', c.deleteUser);

// Courses
router.get('/admin/courses', c.getAllCourses);
router.post('/admin/courses', c.createCourse);
router.put('/admin/courses', c.updateCourse);
router.delete('/admin/courses/:code', c.deleteCourse);
router.get('/admin/courses/:code/roster', c.getCourseRoster);
// Enrolling / reassigning users with courses and marking courses completed are NOT admin features:
// reassigning is Dean-only and completing is Dean/Teacher-only (see routes/staffRoutes.js, routes/courseRoutes.js).

// Departments
router.get('/admin/departments', c.getDepartments);
router.post('/admin/departments', c.createDepartment);
router.put('/admin/departments/:id', c.updateDepartment);
router.delete('/admin/departments/:id', c.deleteDepartment);

// Course content (announcements | videos | materials)
router.get('/admin/courses/:code/content', c.getCourseContent);
router.post('/admin/courses/:code/content/:kind', c.addContentItem);
router.put('/admin/courses/:code/content/:kind/:itemId', c.updateContentItem);
router.delete('/admin/courses/:code/content/:kind/:itemId', c.deleteContentItem);

// Assignments / quizzes / submissions
router.get('/admin/assignments', c.getAssignments);
router.put('/admin/assignments/:id', c.updateAssignment);
router.delete('/admin/assignments/:id', c.deleteAssignment);
router.get('/admin/assignments/:id/submissions', c.getSubmissions);
// Grading is Teacher/Dean-only (POST /assignments/grade), so admins have no route to change a grade, feedback or flag.
router.delete('/admin/submissions/:id', c.deleteSubmission);

// Forums
router.get('/admin/forums', c.getAllForums);
router.post('/admin/forums', c.createForum);
router.put('/admin/forums/:id', c.updateForum);
router.delete('/admin/forums/:id', c.deleteForum);
router.post('/admin/forums/:id/replies', c.addForumReply);
router.put('/admin/forums/:id/replies/:replyId', c.updateForumReply);
router.delete('/admin/forums/:id/replies/:replyId', c.deleteForumReply);

// Notifications + own profile
router.post('/admin/broadcast', c.broadcast);
router.put('/admin/profile', c.updateOwnProfile);
router.put('/admin/profile/password', c.changeOwnPassword);

module.exports = router;
