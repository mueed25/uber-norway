/**
 * Base Presenter - Common functionality for all presenters
 * Part of the MCP (Model-Controller-Presenter) architecture
 */
class BasePresenter {
  constructor() {
    this.defaultContext = {
      title: 'Uber Clone',
      year: new Date().getFullYear(),
      apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    };
  }

  /**
   * Merge default context with specific page context
   * @param {Object} pageContext - Specific context for the page
   * @returns {Object} - Merged context
   */
  getContext(pageContext = {}) {
    return {
      ...this.defaultContext,
      ...pageContext
    };
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @returns {String} - Formatted date string
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format time from 24-hour to 12-hour format
   * @param {String} time24 - Time in 24-hour format (HH:MM)
   * @returns {String} - Time in 12-hour format
   */
  formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour12 = ((parseInt(hours, 10) + 11) % 12) + 1;
    const ampm = parseInt(hours, 10) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }

  /**
   * Format currency
   * @param {Number} amount - Amount to format
   * @param {String} currency - Currency code (default: USD)
   * @returns {String} - Formatted currency string
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {Object} coord1 - First coordinate {lat, lng}
   * @param {Object} coord2 - Second coordinate {lat, lng}
   * @returns {Number} - Distance in kilometers
   */
  calculateDistance(coord1, coord2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(coord2.lat - coord1.lat);
    const dLon = this.deg2rad(coord2.lng - coord1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.lat)) * Math.cos(this.deg2rad(coord2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Convert degrees to radians
   * @param {Number} deg - Degrees
   * @returns {Number} - Radians
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Validate coordinates
   * @param {Object} coordinates - {lat, lng}
   * @returns {Boolean} - True if valid
   */
  isValidCoordinates(coordinates) {
    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return false;
    }
    
    return coordinates.lat >= -90 && 
           coordinates.lat <= 90 && 
           coordinates.lng >= -180 && 
           coordinates.lng <= 180;
  }

  /**
   * Handle errors and format them for display
   * @param {Error} error - Error object
   * @returns {Object} - Formatted error context
   */
  handleError(error) {
    console.error('Presenter Error:', error);
    
    return {
      error: {
        status: error.status || 500,
        message: process.env.NODE_ENV === 'production' 
          ? 'Something went wrong. Please try again.' 
          : error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    };
  }
}

module.exports = BasePresenter;