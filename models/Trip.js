const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  pickup: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    }
  },
  destination: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    }
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  distance: {
    type: Number, // in kilometers
    default: 0
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 0
  },
  estimatedPrice: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  tripType: {
    type: String,
    enum: ['standard', 'premium', 'xl'],
    default: 'standard'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false 
  }
}, {
  timestamps: true
});

// Virtual for formatted date
TripSchema.virtual('formattedDate').get(function() {
  return this.scheduledDate.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for formatted time (12-hour format)
TripSchema.virtual('formattedTime').get(function() {
  const [hours, minutes] = this.scheduledTime.split(':');
  const hour12 = ((parseInt(hours, 10) + 11) % 12) + 1;
  const ampm = parseInt(hours, 10) >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
});

// Instance method to calculate estimated price based on distance
TripSchema.methods.calculatePrice = function(baseRate = 2.5, perKmRate = 1.8) {
  if (this.distance > 0) {
    this.estimatedPrice = Math.round((baseRate + (this.distance * perKmRate)) * 100) / 100;
  }
  return this.estimatedPrice;
};

// Static method to find trips by date range
TripSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    scheduledDate: {
      $gte: startDate,
      $lte: endDate
    }
  });
};

// Pre-save middleware to ensure coordinates are valid
TripSchema.pre('save', function(next) {
  const pickup = this.pickup.coordinates;
  const destination = this.destination.coordinates;
  
  if (pickup.lat < -90 || pickup.lat > 90 || pickup.lng < -180 || pickup.lng > 180) {
    return next(new Error('Invalid pickup coordinates'));
  }
  
  if (destination.lat < -90 || destination.lat > 90 || destination.lng < -180 || destination.lng > 180) {
    return next(new Error('Invalid destination coordinates'));
  }
  
  next();
});

module.exports = mongoose.model('Trip', TripSchema);