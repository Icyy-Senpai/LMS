const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/admin/stats', adminController.getSystemStats);

// User endpoints
router.get('/admin/users', adminController.getAllUsers);
router.put('/admin/users', adminController.updateUser);
router.delete('/admin/users/:type/:id', adminController.deleteUser);

// Course endpoints
router.get('/admin/courses', adminController.getAllCourses);
router.post('/admin/courses', adminController.createCourse);
router.put('/admin/courses', adminController.updateCourse);
router.delete('/admin/courses/:code', adminController.deleteCourse);

// Forum endpoints
router.get('/admin/forums', adminController.getAllForums);
router.delete('/admin/forums/:id', adminController.deleteForum);

// Course Assignment & Removal endpoints
router.post('/admin/assign-course', adminController.assignUserCourse);
router.post('/admin/remove-course', adminController.removeUserCourse);

module.exports = router;