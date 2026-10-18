const Forum = require('../models/Forum');
const Notification = require('../models/Notification');

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
    await Forum.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Thread deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting thread' });
  }
};

const upvoteForum = async (req, res) => {
  try {
    const thread = await Forum.findByIdAndUpdate(req.body.threadId, { $inc: { upvotes: 1 } }, { new: true });
    if (thread.author !== req.body.likerId) {
        await new Notification({ userSchoolId: thread.author, title: 'Post Upvoted', message: `Someone upvoted your post: "${thread.title}"`, type: 'forum' }).save();
    }
    res.json({ success: true, thread });
  } catch (error) { res.status(500).json({ success: false }); }
};

const addReply = async (req, res) => {
  try {
    const { threadId, author, content } = req.body;
    const thread = await Forum.findById(threadId);
    thread.replies.push({ author, content, createdAt: new Date() });
    await thread.save();
    
    if (thread.author !== author) {
        await new Notification({ userSchoolId: thread.author, title: 'New Reply', message: `${author} replied to your thread: "${thread.title}"`, type: 'forum' }).save();
    }
    res.json({ success: true, thread });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = { getForums, createForum, deleteForum, upvoteForum, addReply };