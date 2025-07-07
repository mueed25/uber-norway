

module.exports = {
  TRIP_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  VEHICLE_TYPES: {
    UBER_X: 'uberx',
    UBER_XL: 'uberxl',
    UBER_BLACK: 'uberblack',
    UBER_POOL: 'uberpool'
  },
  VEHICLE_TYPE_NAMES: {
    uberx: 'UberX',
    uberxl: 'UberXL',
    uberblack: 'Uber Black',
    uberpool: 'Uber Pool'
  },

  PRICING: {
    BASE_FARE: {
      uberx: 2.50,
      uberxl: 3.50,
      uberblack: 5.00,
      uberpool: 2.00
    },
    PRICE_PER_KM: {
      uberx: 1.20,
      uberxl: 1.50,
      uberblack: 2.00,
      uberpool: 1.00
    },
    PRICE_PER_MINUTE: {
      uberx: 0.25,
      uberxl: 0.30,
      uberblack: 0.40,
      uberpool: 0.20
    },
    SURGE_MULTIPLIER: {
      LOW: 1.0,
      MEDIUM: 1.5,
      HIGH: 2.0,
      EXTREME: 3.0
    }
  },

  TIME: {
    BOOKING_TIMEOUT: 5 * 60 * 1000,
    DRIVER_ARRIVAL_WINDOW: 15 * 60 * 1000, 
    TRIP_COMPLETION_TIMEOUT: 4 * 60 * 60 * 1000 
  },

  DISTANCE: {
    MAX_PICKUP_RADIUS: 50, 
    MIN_TRIP_DISTANCE: 0.5, 
    MAX_TRIP_DISTANCE: 200 
  },

  PAYMENT_METHODS: {
    CASH: 'cash',
    CARD: 'card',
    DIGITAL_WALLET: 'digital_wallet'
  },

  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  USER_ROLES: {
    RIDER: 'rider',
    DRIVER: 'driver',
    ADMIN: 'admin'
  },

  DRIVER_STATUS: {
    OFFLINE: 'offline',
    ONLINE: 'online',
    BUSY: 'busy',
    BREAK: 'break'
  },

  NOTIFICATION_TYPES: {
    TRIP_REQUEST: 'trip_request',
    TRIP_CONFIRMED: 'trip_confirmed',
    DRIVER_ARRIVED: 'driver_arrived',
    TRIP_STARTED: 'trip_started',
    TRIP_COMPLETED: 'trip_completed',
    PAYMENT_COMPLETED: 'payment_completed'
  },

  RESPONSE_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
  },

  RESPONSE_MESSAGES: {
    SUCCESS: 'Operation completed successfully',
    TRIP_CREATED: 'Trip booked successfully',
    TRIP_NOT_FOUND: 'Trip not found',
    INVALID_LOCATION: 'Invalid pickup or destination location',
    DRIVER_NOT_AVAILABLE: 'No drivers available in your area',
    PAYMENT_FAILED: 'Payment processing failed',
    INVALID_INPUT: 'Invalid input data provided'
  },

  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    PHONE_REGEX: /^\+?[\d\s\-\(\)]{10,15}$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  MAP_CONFIG: {
    DEFAULT_ZOOM: 13,
    DEFAULT_CENTER: {
      lat: 6.5244,
      lng: 3.3792 
    },
    MARKER_COLORS: {
      PICKUP: '#00ff00',
      DESTINATION: '#ff0000',
      DRIVER: '#0000ff'
    }
  },

  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png']
  },

  RATE_LIMITS: {
    TRIP_REQUESTS_PER_HOUR: 20,
    API_REQUESTS_PER_MINUTE: 100,
    LOGIN_ATTEMPTS_PER_HOUR: 5
  },

  CACHE_TTL: {
    USER_SESSION: 24 * 60 * 60, 
    TRIP_DATA: 60 * 60,
    PRICING_DATA: 30 * 60, 
    LOCATION_DATA: 5 * 60 
  }
};