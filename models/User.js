const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 0
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: /^[0-9()+\-\s]+$/  // basic phone number validation
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
