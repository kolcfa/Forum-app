// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required.'],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required.'],
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Invalid email address.']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required.']
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'],
    default: 'user' 
  },
  profilePic: { 
    type: String, 
    default: '/uploads/default.png'
  },
  failedLogins: { 
    type: Number, 
    default: 0 
  },
  locked: { 
    type: Boolean, 
    default: false 
  },
  profilePicThumbnail: { 
    type: Buffer 
  }
}, { timestamps: true });

userSchema.index({ email: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
