const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/login', userController.login);
router.get('/user/:schoolId', userController.getUser);
router.post('/update-profile', userController.updateProfile);
router.post('/update-todos', userController.updateTodos);
router.get('/leaderboard', userController.getLeaderboard);

module.exports = router;