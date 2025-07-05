const basePresenter = require('./basePresenter');

class TripPresenter extends basePresenter {
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

  formatTripList(trips) {
    return trips.map(trip => this.formatTripSummary(trip));
  }

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

  formatDriver(driver) {
    return {
      name: driver.name,
      rating: this.formatRating(driver.rating),
      vehicle: `${driver.vehicle.make} ${driver.vehicle.model}`,
      licensePlate: driver.vehicle.licensePlate,
      photo: driver.photo || '/images/default-driver.png'
    };
  }

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

  formatPrice(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatRating(rating) {
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    return `${stars} ${rating}/5`;
  }

  truncateAddress(address, maxLength = 30) {
    if (!address) return '';
    return address.length > maxLength 
      ? address.substring(0, maxLength) + '...' 
      : address;
  }

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

  formatDate(date) {
    if (!date) return '';
    
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

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

async sendConfirmationEmail(trip, userEmail) {
    try {
      const emailTemplate = this.generateEmailTemplate(trip);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Ride Confirmed - ${trip.ride.type} from ${trip.pickup.address}`,
        html: emailTemplate
      };

      await this.transporter.sendMail(mailOptions);
      
      trip.confirmationEmailSent = true;
      await trip.save();

      console.log('Confirmation email sent to:', userEmail);
    } catch (error) {
      console.error('Email sending error:', error);
    }
  }

 generateEmailTemplate(trip) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Ride Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .trip-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
            .price { font-size: 24px; font-weight: bold; color: #000; text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚗 Ride Confirmed!</h1>
            </div>
            
            <div class="content">
                <h2>Your ${trip.ride.type} ride has been confirmed</h2>
                <p>Thank you for your booking! Here are your trip details:</p>
                
                <div class="trip-details">
                    <div class="detail-row">
                        <strong>Trip ID:</strong>
                        <span>${trip._id}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Ride Type:</strong>
                        <span>${trip.ride.type}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Pickup Location:</strong>
                        <span>${trip.pickup.address}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Destination:</strong>
                        <span>${trip.destination.address}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Scheduled Date:</strong>
                        <span>${trip.formattedDate}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Scheduled Time:</strong>
                        <span>${trip.formattedTime}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Estimated Duration:</strong>
                        <span>${trip.estimatedDuration} minutes</span>
                    </div>
                    <div class="detail-row">
                        <strong>Distance:</strong>
                        <span>${trip.distance.toFixed(1)} km</span>
                    </div>
                </div>
                
                <div class="price">
                    Total Paid: ${trip.ride.price} kr
                </div>
                
                <p><strong>Status:</strong> ${trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}</p>
                
                <h3>What's Next?</h3>
                <ul>
                    <li>Your driver will be assigned shortly before your scheduled time</li>
                    <li>You'll receive SMS notifications about your driver's arrival</li>
                    <li>Make sure to be ready at your pickup location</li>
                </ul>
                
                <p>If you need to make any changes or have questions, please contact our support team.</p>
            </div>
            
            <div class="footer">
                <p>Thank you for choosing our service!</p>
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }