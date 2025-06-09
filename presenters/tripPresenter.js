const basePresenter = require('./basePresenter');

class TripPresenter extends basePresenter {
  // Format trip estimate data for frontend
  formatEstimate(estimateData) {
    return {
      distance: `${estimateData.distance}`,
      duration: estimateData.duration,
      price: this.formatPrice(estimateData.estimatedPrice, estimateData.currency),
      rawPrice: estimateData.estimatedPrice,
      pickup: estimateData.pickup,
      destination: estimateData.destination,
      scheduledTime: this.formatDateTime(estimateData.scheduledTime),
      route: estimateData.route,
      priceBreakdown: this.calculatePriceBreakdown(estimateData)
    };
  }

  // Format trip data for display
  formatTrip(trip) {
    return {
      id: trip._id,
      pickup: trip.pickup,
      destination: trip.destination,
      scheduledDate: this.formatDateTime(trip.scheduledDate),
      status: this.formatStatus(trip.status),
      estimatedPrice: this.formatPrice(trip.estimatedPrice),
      actualPrice: trip.actualPrice ? this.formatPrice(trip.actualPrice) : null,
      driver: trip.driver ? this.formatDriver(trip.driver) : null,
      createdAt: this.formatRelativeTime(trip.createdAt),
      estimatedDuration: trip.estimatedDuration,
      distance: trip.distance
    };
  }

  // Format multiple trips for listing
  formatTripList(trips) {
    return trips.map(trip => this.formatTripSummary(trip));
  }

  // Format trip summary for listings
  formatTripSummary(trip) {
    return {
      id: trip._id,
      pickup: this.truncateAddress(trip.pickup),
      destination: this.truncateAddress(trip.destination),
      date: this.formatDate(trip.scheduledDate),
      status: this.formatStatus(trip.status),
      price: this.formatPrice(trip.estimatedPrice),
      duration: `${trip.estimatedDuration} min`
    };
  }

  // Format trip status with styling classes
  formatStatus(status) {
    const statusMap = {
      pending: { text: 'Pending', class: 'status-pending' },
      confirmed: { text: 'Confirmed', class: 'status-confirmed' },
      in_progress: { text: 'In Progress', class: 'status-active' },
      completed: { text: 'Completed', class: 'status-success' },
      cancelled: { text: 'Cancelled', class: 'status-error' }
    };
    
    return statusMap[status] || { text: 'Unknown', class: 'status-default' };
  }

  // Format driver information
  formatDriver(driver) {
    return {
      name: driver.name,
      rating: this.formatRating(driver.rating),
      vehicle: `${driver.vehicle.make} ${driver.vehicle.model}`,
      licensePlate: driver.vehicle.licensePlate,
      photo: driver.photo || '/images/default-driver.png'
    };
  }

  // Calculate price breakdown
  calculatePriceBreakdown(estimateData) {
    const baseRate = 2.50;
    const perKmRate = 1.20;
    const distance = estimateData.distance;
    const subtotal = baseRate + (distance * perKmRate);
    const surge = estimateData.estimatedPrice - subtotal;
    
    return {
      baseFare: this.formatPrice(baseRate),
      distanceFare: this.formatPrice(distance * perKmRate),
      surgePricing: surge > 0 ? this.formatPrice(surge) : null,
      subtotal: this.formatPrice(subtotal),
      total: this.formatPrice(estimateData.estimatedPrice)
    };
  }

  // Format price with currency
  formatPrice(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Format rating with stars
  formatRating(rating) {
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    return `${stars} ${rating}/5`;
  }

  // Truncate long addresses for display
  truncateAddress(address, maxLength = 30) {
    if (!address) return '';
    return address.length > maxLength 
      ? address.substring(0, maxLength) + '...' 
      : address;
  }

  // Format date and time for display
  formatDateTime(dateTime) {
    if (!dateTime) return '';
    
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format date only
  formatDate(date) {
    if (!date) return '';
    
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  // Format relative time (e.g., "2 hours ago")
  formatRelativeTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }
}

module.exports = new TripPresenter();