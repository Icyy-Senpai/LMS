const Forum = require('../models/Forum');

const getForums = async (req, res) => {
  try {
    const threads = await Forum.find({ courseCode: req.params.courseCode }).sort({ updatedAt: -1 });
    res.json({ success: true, threads });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching forums' });
  }
};

const createForum = async (req, res) => {
  try {
    const newThread = new Forum(req.body);
    await newThread.save();
    res.json({ success: true, message: 'Thread created successfully', thread: newThread });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating thread' });
  }
};

const deleteForum = async (req, res) => {
  try {
    await Forum.findByIdAndDelete(req.body.threadId);
    res.json({ success: true, message: 'Thread deleted by moderator' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting thread' });
  }
};

module.exports = { getForums, createForum, deleteForum };