const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  auth0Id: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  fullName: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    min: 0
  },
  phone: {
    type: String,
    trim: true,
    match: /^[0-9()+\-\s]+$/
  },
  profileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);