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
  },
  // New payment-related fields
  stripeCustomerId: {
    type: String,
    default: null
  },
  defaultPaymentMethodId: {
    type: String,
    default: null
  },
  savedPaymentMethods: [{
    paymentMethodId: String,
    cardBrand: String,
    cardLast4: String,
    isDefault: Boolean,
    createdAt: Date
  }],
  hasPaymentMethod: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

UserSchema.methods.hasValidPaymentMethod = function() {
  return this.stripeCustomerId && this.defaultPaymentMethodId && this.hasPaymentMethod;
};

UserSchema.methods.getDefaultPaymentMethodInfo = function() {
  const defaultMethod = this.savedPaymentMethods.find(method => method.isDefault);
  return defaultMethod || null;
};

module.exports = mongoose.model('User', UserSchema);