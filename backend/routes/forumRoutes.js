const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');

router.get('/forums/:courseCode', forumController.getForums);
router.post('/forums/create', forumController.createForum);
router.post('/forums/delete', forumController.deleteForum);

module.exports = router;