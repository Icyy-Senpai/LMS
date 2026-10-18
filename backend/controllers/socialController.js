const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Friendship = require('../models/Friendship');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const searchUsers = async (req, res) => {
  const { query, currentUserId } = req.query;
  try {
    const students = await Student.find({ 
      $or: [{ firstName: new RegExp(query, 'i') }, { lastName: new RegExp(query, 'i') }, { schoolId: new RegExp(query, 'i') }] 
    }, 'firstName lastName schoolId photoUrl accountType');
    
    const teachers = await Teacher.find({ 
      $or: [{ firstName: new RegExp(query, 'i') }, { lastName: new RegExp(query, 'i') }, { schoolId: new RegExp(query, 'i') }] 
    }, 'firstName lastName schoolId photoUrl accountType');

    let allUsers = [...students, ...teachers].filter(u => u.schoolId !== currentUserId);
    res.json({ success: true, users: allUsers });
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendFriendRequest = async (req, res) => {
  const { requester, recipient } = req.body;
  try {
    const existing = await Friendship.findOne({
      $or: [{ requester, recipient }, { requester: recipient, recipient: requester }]
    });
    if (existing) return res.json({ success: false, message: 'Request already exists or users are friends.' });

    const newReq = new Friendship({ requester, recipient });
    await newReq.save();
    await new Notification({ userSchoolId: recipient, title: 'New Friend Request', message: `You have a new friend request from ${requester}.`, type: 'alert' }).save();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getFriendsAndRequests = async (req, res) => {
  const { userId } = req.params;
  try {
    const requests = await Friendship.find({ recipient: userId, status: 'pending' });
    const friends = await Friendship.find({
      $or: [{ requester: userId, status: 'accepted' }, { recipient: userId, status: 'accepted' }]
    });

    const friendIds = friends.map(f => f.requester === userId ? f.recipient : f.requester);
    const students = await Student.find({ schoolId: { $in: friendIds } }, 'firstName lastName schoolId photoUrl');
    const teachers = await Teacher.find({ schoolId: { $in: friendIds } }, 'firstName lastName schoolId photoUrl');
    
    res.json({ success: true, requests, friends: [...students, ...teachers] });
  } catch (error) { res.status(500).json({ success: false }); }
};

const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.body;
  try {
    const friendship = await Friendship.findByIdAndUpdate(requestId, { status: 'accepted' });
    await new Notification({ userSchoolId: friendship.requester, title: 'Friend Request Accepted', message: `${friendship.recipient} accepted your friend request!`, type: 'alert' }).save();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getMessages = async (req, res) => {
  const { user1, user2 } = req.query;
  try {
    const messages = await Message.find({
      $or: [{ sender: user1, receiver: user2 }, { sender: user2, receiver: user1 }]
    }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) { res.status(500).json({ success: false }); }
};

const sendMessage = async (req, res) => {
  const { sender, receiver, content } = req.body;
  try {
    const newMsg = new Message({ sender, receiver, content });
    await newMsg.save();
    await new Notification({ userSchoolId: receiver, title: 'New Message', message: `You have a new message from ${sender}.`, type: 'message' }).save();
    res.json({ success: true, message: newMsg });
  } catch (error) { res.status(500).json({ success: false }); }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userSchoolId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (error) { res.status(500).json({ success: false }); }
};

const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userSchoolId: req.body.userId, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
};

module.exports = { searchUsers, sendFriendRequest, getFriendsAndRequests, acceptFriendRequest, getMessages, sendMessage, getNotifications, markNotificationsRead };