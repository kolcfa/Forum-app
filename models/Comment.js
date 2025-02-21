// models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { 
    type: String, 
    required: [true, 'Content is required.']
  },
  post: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Post',
    required: true 
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: { expireAfterSeconds: 2592000 }  // TTL: expires after 30 days
  }
});

module.exports = mongoose.model('Comment', commentSchema);
