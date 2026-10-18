const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');

router.get('/forums/:courseCode', forumController.getForums);
router.post('/forums/create', forumController.createForum);
router.delete('/forums/:id', forumController.deleteForum);
router.post('/forums/upvote', forumController.upvoteForum);
router.post('/forums/reply', forumController.addReply);

module.exports = router;