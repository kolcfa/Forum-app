// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Title is required.'],
    trim: true 
  },
  content: { 
    type: String, 
    required: [true, 'Content is required.']
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  // One-to-many: One post can have many comments.
  comments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment' 
  }],
  tags: [{ 
    type: String 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create a text index on title and content for full-text search.
postSchema.index({ title: 'text', content: 'text' });

// Create a multi-key index on the tags array field.
postSchema.index({ tags: 1 });

// Create an index on the author field to support the shard key.
postSchema.index({ author: 1 });

module.exports = mongoose.model('Post', postSchema);
