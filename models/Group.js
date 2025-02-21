// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Group name is required.']
  },
  description: { 
    type: String 
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

groupSchema.index({ name: 1 });

module.exports = mongoose.model('Group', groupSchema);
