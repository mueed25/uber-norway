const BasePresenter = require('./basePresenter');

/**
 * Home Presenter - Handles data presentation for the home page
 * Part of the MCP (Model-Controller-Presenter) architecture
 */
class HomePresenter extends BasePresenter {
  constructor() {
    super();
  }

  /**
   * Present home page data with default trip booking form
   * @param {Object} data - Optional data to populate form
   * @returns {Object} - Context for home page rendering
   */
  presentHomePage(data = {}) {
    const context = this.getContext({
      title: 'Go anywhere with Uber',
      page: 'home',
      bodyClass: 'home-page',
      
      // Form data
      formData: {
        pickup: data.pickup || '',
        destination: data.destination || '',
        date: data.date || this.getTodayDate(),
        time: data.time || this.getCurrentTime()
      },

      // Default map configuration for Norway (Oslo area)
      mapConfig: {
        center: {
          lat: 59.9139,
          lng: 10.7522
        },
        zoom: 10,
        defaultPickup: {
          address: 'Åslandhellinga 345, Oslo',
          lat: 59.8796,
          lng: 10.8084
        },
        defaultDestination: {
          address: 'Gardermoen, Norway, Ullensaker Municipality',
          lat: 60.1939,
          lng: 11.1004
        }
      },

      // UI configuration
      ui: {
        showMap: true,
        showPricing: false,
        enableAutocomplete: true
      }
    });

    return context;
  }

  /**
   * Present trip estimation results
   * @param {Object} tripData - Trip data with estimates
   * @returns {Object} - Context with trip estimates
   */
  presentTripEstimate(tripData) {
    const distance = this.calculateDistance(
      tripData.pickup.coordinates,
      tripData.destination.coordinates
    );

    const estimatedDuration = this.estimateDuration(distance);
    const estimatedPrice = this.estimatePrice(distance);

    const context = this.getContext({
      title: 'Trip Estimate - Uber Clone',
      page: 'home',
      bodyClass: 'home-page estimate-view',
      
      formData: {
        pickup: tripData.pickup.address,
        destination: tripData.destination.address,
        date: tripData.date,
        time: tripData.time
      },

      tripEstimate: {
        distance: distance,
        duration: estimatedDuration,
        price: this.formatCurrency(estimatedPrice),
        priceRaw: estimatedPrice,
        pickup: tripData.pickup,
        destination: tripData.destination
      },

      mapConfig: {
        center: this.calculateCenter(
          tripData.pickup.coordinates,
          tripData.destination.coordinates
        ),
        zoom: this.calculateZoom(distance),
        pickup: tripData.pickup,
        destination: tripData.destination,
        showRoute: true
      },

      ui: {
        showMap: true,
        showPricing: true,
        enableAutocomplete: true
      }
    });

    return context;
  }

  /**
   * Present error state for home page
   * @param {Error} error - Error object
   * @param {Object} formData - Form data to preserve
   * @returns {Object} - Context with error information
   */
  presentError(error, formData = {}) {
    const errorContext = this.handleError(error);
    
    return this.getContext({
      title: 'Error - Uber Clone',
      page: 'home',
      bodyClass: 'home-page error-state',
      
      formData: {
        pickup: formData.pickup || '',
        destination: formData.destination || '',
        date: formData.date || this.getTodayDate(),
        time: formData.time || this.getCurrentTime()
      },

      mapConfig: {
        center: { lat: 59.9139, lng: 10.7522 },
        zoom: 10
      },

      ui: {
        showMap: true,
        showPricing: false,
        enableAutocomplete: true
      },

      ...errorContext
    });
  }

  /**
   * Get today's date in YYYY-MM-DD format
   * @returns {String} - Today's date
   */
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get current time in HH:MM format
   * @returns {String} - Current time
   */
  getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Estimate trip duration based on distance
   * @param {Number} distance - Distance in kilometers
   * @returns {Number} - Estimated duration in minutes
   */
  estimateDuration(distance) {
    // Basic estimation: 1 km = 2 minutes (city driving with traffic)
    const baseMinutes = distance * 2;
    // Add buffer time for stops, traffic, etc.
    const bufferTime = Math.min(distance * 0.5, 15);
    return Math.round(baseMinutes + bufferTime);
  }

  /**
   * Estimate trip price based on distance
   * @param {Number} distance - Distance in kilometers
   * @returns {Number} - Estimated price
   */
  estimatePrice(distance) {
    const baseRate = 2.5; // Base fare
    const perKmRate = 1.8; // Per kilometer rate
    const price = baseRate + (distance * perKmRate);
    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate map center point between pickup and destination
   * @param {Object} pickup - Pickup coordinates
   * @param {Object} destination - Destination coordinates
   * @returns {Object} - Center coordinates
   */
  calculateCenter(pickup, destination) {
    return {
      lat: (pickup.lat + destination.lat) / 2,
      lng: (pickup.lng + destination.lng) / 2
    };
  }

  /**
   * Calculate appropriate zoom level based on distance
   * @param {Number} distance - Distance in kilometers
   * @returns {Number} - Zoom level
   */
  calculateZoom(distance) {
    if (distance < 5) return 13;
    if (distance < 15) return 11;
    if (distance < 50) return 9;
    if (distance < 100) return 8;
    return 7;
  }
}

module.exports = HomePresenter;