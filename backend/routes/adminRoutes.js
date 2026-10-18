const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/admin/stats', adminController.getSystemStats);
router.get('/admin/users', adminController.getAllUsers);
router.delete('/admin/users/:type/:id', adminController.deleteUser);
router.get('/admin/courses', adminController.getAllCourses);
router.delete('/admin/courses/:code', adminController.deleteCourse);
router.get('/admin/forums', adminController.getAllForums);
router.delete('/admin/forums/:id', adminController.deleteForum);

module.exports = router;