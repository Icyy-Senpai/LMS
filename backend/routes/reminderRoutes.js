const express = require('express');
const router = express.Router();
const reminders = require('../controllers/reminderController');

// Personal calendar reminders (students, teachers, deans). Always scoped to the owner's schoolId.
router.get('/reminders/:ownerId', reminders.listReminders);
router.post('/reminders', reminders.createReminder);
router.put('/reminders/:id', reminders.updateReminder);
router.delete('/reminders/:id', reminders.deleteReminder);

module.exports = router;
