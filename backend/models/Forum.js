const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: { type: String, required: true },
  content: { type: String, required: true },
  upvotes: { type: Number, default: 0 },
  flags: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const forumSchema = new mongoose.Schema({
  courseCode: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  upvotes: { type: Number, default: 0 },
  flags: { type: Number, default: 0 },
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Forum', forumSchema);