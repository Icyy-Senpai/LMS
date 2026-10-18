const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');

router.get('/social/search', socialController.searchUsers);
router.post('/social/friend-request', socialController.sendFriendRequest);
router.post('/social/friend-accept', socialController.acceptFriendRequest);
router.get('/social/friends/:userId', socialController.getFriendsAndRequests);
router.get('/social/messages', socialController.getMessages);
router.post('/social/messages', socialController.sendMessage);
router.get('/notifications/:userId', socialController.getNotifications);
router.post('/notifications/read', socialController.markNotificationsRead);

module.exports = router;