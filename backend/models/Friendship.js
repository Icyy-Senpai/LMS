const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: { type: String, required: true }, 
  recipient: { type: String, required: true }, 
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Friendship', friendshipSchema);