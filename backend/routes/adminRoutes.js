const express = require('express');
const router = express.Router();
const c = require('../controllers/adminController');
const requireAdmin = require('../middleware/requireAdmin');
const { listBlocks } = require('../utils/blocks');

router.use('/admin', requireAdmin);

router.get('/admin/stats', c.getSystemStats);

router.get('/admin/users', c.getAllUsers);
router.get('/admin/next-school-id', c.previewNextSchoolId);
router.post('/admin/users', c.createUser);
router.put('/admin/users', c.updateUser);
router.put('/admin/users/status', c.setUserStatus);
router.put('/admin/users/password', c.resetUserPassword);
router.delete('/admin/users/:type/:id', c.deleteUser);

router.get('/admin/courses', c.getAllCourses);
router.post('/admin/courses', c.createCourse);
router.put('/admin/courses', c.updateCourse);
router.delete('/admin/courses/:code', c.deleteCourse);
router.get('/admin/courses/:code/roster', c.getCourseRoster);

router.get('/admin/departments', c.getDepartments);
router.get('/admin/blocks', async (req, res) => {
  try { res.json({ success: true, blocks: await listBlocks() }); }
  catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Failed to load blocks.' }); }
});
router.post('/admin/departments', c.createDepartment);
router.put('/admin/departments/:id', c.updateDepartment);
router.delete('/admin/departments/:id', c.deleteDepartment);

router.get('/admin/courses/:code/content', c.getCourseContent);
router.post('/admin/courses/:code/content/:kind', c.addContentItem);
router.put('/admin/courses/:code/content/:kind/:itemId', c.updateContentItem);
router.delete('/admin/courses/:code/content/:kind/:itemId', c.deleteContentItem);

router.get('/admin/forums', c.getAllForums);
router.post('/admin/forums', c.createForum);
router.put('/admin/forums/:id', c.updateForum);
router.delete('/admin/forums/:id', c.deleteForum);
router.post('/admin/forums/:id/replies', c.addForumReply);
router.put('/admin/forums/:id/replies/:replyId', c.updateForumReply);
router.delete('/admin/forums/:id/replies/:replyId', c.deleteForumReply);

router.post('/admin/broadcast', c.broadcast);
router.put('/admin/profile', c.updateOwnProfile);
router.put('/admin/profile/password', c.changeOwnPassword);

module.exports = router;
