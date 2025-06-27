const Trip = require('../models/Trip');
const User = require('../models/User');
const HomePresenter = require('../presenters/homePresenter');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const basePrice = Math.max(50, 1* 12); 
const rides = [
            {
                id: 'uberx-' + Date.now(),
                type: 'UberX',
                category: 'Affordable, everyday rides',
                price: `${Math.round(basePrice)} kr`,
                eta: Math.floor(Math.random() * 8) + 2, 
                arrivalTime: Math.floor(Math.random() * 8) + 2,
                rating: '4.8',
                icon: 'car'
            },
            {
                id: 'comfort-' + Date.now(),
                type: 'Comfort',
                category: 'Newer cars with extra legroom',
                price: `${Math.round(basePrice * 1.3)} kr`,
                eta: Math.floor(Math.random() * 6) + 3,
                arrivalTime:Math.floor(Math.random() * 6) + 3,
                rating: '4.9',
                icon: 'car-luxury'
            },
            {
                id: 'xl-' + Date.now(),
                type: 'UberXL',
                category: 'Larger cars for up to 6 passengers',
                price: `${Math.round(basePrice * 1.6)} kr`,
                eta: Math.floor(Math.random() * 10) + 4,
                arrivalTime: Math.floor(Math.random() * 10) + 4,
                rating: '4.7',
                icon: 'car-suv'
            }
        ];

class HomeController {
  constructor() {
    this.presenter = new HomePresenter();
    this.initializeEmailTransporter();
  }

  initializeEmailTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async tripSearch(req, res) {
  try {
    const { pickup, dropoff, pickupTime, rideFor } = req.body;
    
    console.log('Trip search data:', { pickup, dropoff, pickupTime, rideFor });
    
    const context = this.presenter.presentHomePage(); 
    res.render('ride', { 
      ...context, 
      user: req.oidc.user, 
      userInformation: req.oidc,
      isAuthenticated: req.oidc.isAuthenticated(),
      ride: rides,
      pickup: pickup || '',
      dropoff: dropoff || '',
      pickupTime: pickupTime || 'now',
      rideFor: rideFor || 'me'
    });
  } catch (error) {
    console.error('Trip Search Error:', error);
    const errorContext = this.presenter.presentError(error);
    res.status(500).render('ride', errorContext);
  }
}
  async index(req, res) {
    try {
      const context = this.presenter.presentHomePage();
      res.render('home', { 
        ...context, 
        user: req.oidc.user, 
        userInformation: req.oidc,
        isAuthenticated: req.oidc.isAuthenticated(),
        
      });
    } catch (error) {
      console.error('Home Controller Error:', error);
      const errorContext = this.presenter.presentError(error);
      res.status(500).render('home', errorContext);
    }
  }

   async trip(req, res) {
    try {
      const context = this.presenter.presentHomePage();
      res.render('ride', { 
        ...context, 
        user: req.oidc.user, 
        userInformation: req.oidc,
        isAuthenticated: req.oidc.isAuthenticated(),
        ride:rides,
        pickup: req.query.pickup || req.body.pickup || '',
      dropoff: req.query.dropoff || req.body.dropoff || ''
      });
    } catch (error) {
      console.error('Home Controller Error:', error);
      const errorContext = this.presenter.presentError(error);
      res.status(500).render('ride', errorContext);
    }
  }

  /**
   * Handle payment initiation - Create trip and Stripe checkout session
   */
async addPayment(req, res) {
  try {
    console.log('Add payment route hit');
    console.log('Add payment request received:', req.body);

    if (!req.oidc.isAuthenticated()) {
      if (req.accepts('html')) {
        return res.oidc.login({ returnTo: req.originalUrl });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          redirectTo: '/login'
        });
      }
    }

    const { rideId, rideType, ridePrice,  } = req.body;
    const pickup = 'oslo central'
    const dropoff = 'oslo airport'

    console.log('Received payment data:', { rideId, rideType, ridePrice, pickup, dropoff });

    const missingFields = [];
    if (!rideId || rideId.trim() === '') missingFields.push('rideId');
    if (!rideType || rideType.trim() === '') missingFields.push('rideType');
    if (!ridePrice || ridePrice.trim() === '') missingFields.push('ridePrice');
    if (!pickup || pickup.trim() === '') missingFields.push('pickup location');
    if (!dropoff || dropoff.trim() === '') missingFields.push('dropoff location');

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields: missingFields
        });
      }
      
      return res.redirect('/trip?error=missing_fields&fields=' + encodeURIComponent(missingFields.join(',')));
    }

    if (pickup.trim().toLowerCase() === dropoff.trim().toLowerCase()) {
      const errorMsg = 'Pickup and dropoff locations must be different';
      console.log('Validation error:', errorMsg);
      
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({
          success: false,
          message: errorMsg
        });
      }
      
      return res.redirect('/trip?error=same_locations');
    }

    const userId = req.oidc.user.appUserId;
    const userEmail = req.oidc.user.email;

    const priceValue = parseFloat(ridePrice.replace(/[^\d.]/g, ''));
    const stripeAmount = Math.round(priceValue * 100); 

    console.log('Price calculation:', { ridePrice, priceValue, stripeAmount });

    const pickupCoords = this.findMockCoordinates(pickup, this.getMockLocations()) || 
                        { lat: 59.9139, lng: 10.7522 };
    const destCoords = this.findMockCoordinates(dropoff, this.getMockLocations()) || 
                      { lat: 60.1939, lng: 11.1004 };

    const distance = this.calculateDistance(pickupCoords, destCoords);
    const estimatedDuration = Math.round(distance * 2); 

    const newTrip = new Trip({
      pickup: {
        address: pickup.trim(),
        coordinates: pickupCoords
      },
      destination: {
        address: dropoff.trim(),
        coordinates: destCoords
      },
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), 
      scheduledTime: '12:00', // Default time
      distance: distance,
      estimatedDuration: estimatedDuration,
      estimatedPrice: priceValue,
      status: 'pending',
      paymentStatus: 'unpaid',
      confirmationEmailSent: false,
      ride: {
        type: rideType,
        price: priceValue
      },
      tripType: rideType.toLowerCase().includes('xl') ? 'xl' : 
               rideType.toLowerCase().includes('comfort') ? 'premium' : 'standard',
      userId: userId || null
    });

    const savedTrip = await newTrip.save();
    console.log('Trip saved to database:', savedTrip._id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'nok',
          product_data: {
            name: `${rideType} Ride`,
            description: `From ${pickup} to ${dropoff}`,
          },
          unit_amount: stripeAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/trip?cancelled=true`,
      metadata: {
        tripId: savedTrip._id.toString(),
        userId: userId || 'guest',
        userEmail: userEmail
      }
    });
    savedTrip.stripeSessionId = session.id;
    await savedTrip.save();

    console.log('Stripe session created:', session.id);
    console.log('Stripe checkout URL:', session.url);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id
      });
    }

    res.send(`
      <html>
        <head>
          <title>Redirecting to payment...</title>
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2>Redirecting to payment...</h2>
            <p>If you are not redirected automatically, <a href="${session.url}" id="manual-link">click here</a>.</p>
          </div>
          <script>
            // Multiple redirect attempts
            try {
              window.location.href = '${session.url}';
            } catch (e) {
              console.error('Redirect failed:', e);
              document.getElementById('manual-link').click();
            }
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Add Payment Error:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: 'Payment initialization failed',
        error: error.message
      });
    }
    
    res.redirect('/trip?error=payment_failed&message=' + encodeURIComponent(error.message));
  }
}

  /**
   * Handle successful payment callback from Stripe
   */
  async paymentSuccess(req, res) {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).render('error', {
          title: 'Payment Error',
          error: { message: 'No session ID provided' }
        });
      }

      console.log('Processing payment success for session:', session_id);

      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (!session) {
        return res.status(404).render('error', {
          title: 'Payment Error',
          error: { message: 'Session not found' }
        });
      }

      const tripId = session.metadata.tripId;
      const userEmail = session.metadata.userEmail;

      const trip = await Trip.findById(tripId);

      if (!trip) {
        return res.status(404).render('error', {
          title: 'Trip Not Found',
          error: { message: 'Trip not found' }
        });
      }

      if (session.payment_status === 'paid') {
        trip.status = 'confirmed';
        trip.paymentStatus = 'paid';
        await trip.save();

        console.log('Trip updated to confirmed status:', trip._id);

        await this.sendConfirmationEmail(trip, userEmail);

        res.render('payment-success', {
          title: 'Payment Successful',
          trip: {
            id: trip._id,
            pickup: trip.pickup.address,
            dropoff: trip.destination.address,
            rideType: trip.ride.type,
            price: trip.ride.price,
            scheduledDate: trip.formattedDate,
            scheduledTime: trip.formattedTime,
            status: trip.status
          },
          user: req.oidc.user,
          isAuthenticated: req.oidc.isAuthenticated()
        });

      } else {
        trip.paymentStatus = 'failed';
        await trip.save();

        res.render('error', {
          title: 'Payment Failed',
          error: { message: 'Payment was not completed successfully' }
        });
      }

    } catch (error) {
      console.error('Payment Success Error:', error);
      res.status(500).render('error', {
        title: 'Payment Processing Error',
        error: { message: 'An error occurred while processing your payment' }
      });
    }
  }

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

  
  getMockLocations() {
    return {
      'åslandhellinga 345, oslo': { lat: 59.8796, lng: 10.8084 },
      'gardermoen, norway': { lat: 60.1939, lng: 11.1004 },
      'oslo': { lat: 59.9139, lng: 10.7522 },
      'bergen': { lat: 60.3913, lng: 5.3221 },
      'trondheim': { lat: 63.4305, lng: 10.3951 },
      'stavanger': { lat: 58.9700, lng: 5.7331 }
    };
  }

  calculateDistance(coord1, coord2) {
    const R = 6371; 
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async showProfileForm(req, res) {
    console.log('showProfileForm called');
    console.log('Authenticated:', req.oidc.isAuthenticated());
    
    if (!req.oidc.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      return res.oidc.login({ returnTo: '/complete-profile' });
    }

    try {
      console.log('Rendering complete-profile form');
      res.render('complete-profile', { 
        title: 'Complete Your Profile',
        user: req.oidc.user,
        isAuthenticated: true,
        layout: 'main' 
      });
    } catch (error) {
      console.error('Profile Form Error:', error);
      res.status(500).render('error', {
        title: 'Error',
        error: { status: 500, message: 'Failed to load profile form' }
      });
    }
  }

  async completeProfile(req, res) {
    console.log('completeProfile called with data:', req.body);
    
    if (!req.oidc.isAuthenticated()) {
      console.log('Not authenticated in completeProfile');
      return res.oidc.login({ returnTo: '/complete-profile' });
    }

    try {
      const { fullName, age, phone } = req.body;
      
      if (!fullName || !age || !phone) {
        console.log('Missing required fields');
        return res.render('complete-profile', {
          title: 'Complete Your Profile',
          user: req.oidc.user,
          isAuthenticated: true,
          error: 'All fields are required',
          formData: req.body
        });
      }

      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
        console.log('Invalid age:', age);
        return res.render('complete-profile', {
          title: 'Complete Your Profile',
          user: req.oidc.user,
          isAuthenticated: true,
          error: 'Age must be between 18 and 120',
          formData: req.body
        });
      }

      const phoneRegex = /^[0-9()+\-\s]+$/;
      if (!phoneRegex.test(phone.trim())) {
        console.log('Invalid phone format:', phone);
        return res.render('complete-profile', {
          title: 'Complete Your Profile',
          user: req.oidc.user,
          isAuthenticated: true,
          error: 'Please enter a valid phone number',
          formData: req.body
        });
      }

      const auth0Id = req.oidc.user.sub;
      console.log('Updating user profile for:', auth0Id);
      
      const updatedUser = await User.findOneAndUpdate(
        { auth0Id },
        {
          fullName: fullName.trim(),
          age: ageNum,
          phone: phone.trim(),
          profileComplete: true
        },
        { new: true, upsert: true }
      );

      console.log('User profile updated:', updatedUser);

      req.oidc.user.profileComplete = true;
      req.oidc.user.appUserId = updatedUser._id.toString();

      console.log('Redirecting to home page');
      res.redirect('/?welcome=true');
    } catch (error) {
      console.error('Complete Profile Error:', error);
      res.render('complete-profile', {
        title: 'Complete Your Profile',
        user: req.oidc.user,
        isAuthenticated: true,
        error: 'Failed to save profile. Please try again.',
        formData: req.body
      });
    }
  }

  async estimateTrip(req, res) {
    try {
      console.log('Received request body:', req.body);
      
      const { pickup, destination, date, time } = req.body;
      const errors = [];
      
      if (!pickup?.trim()) errors.push('pickup');
      if (!destination?.trim()) errors.push('destination');
      if (!date?.trim()) errors.push('date');
      if (!time?.trim()) errors.push('time');

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing fields: ${errors.join(', ')}`
        });
      }

      if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Pickup and destination must be different'
        });
      }

      const tripData = await this.prepareTripData({
        pickup: pickup.trim(),
        destination: destination.trim(),
        date: date.trim(),
        time: time.trim()
      });

      const context = this.presenter.presentTripEstimate(tripData);
      
      res.json({
        success: true,
        data: context,
        message: 'Trip estimate calculated successfully'
      });
    } catch (error) {
      console.error('Trip Estimation Error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to calculate trip estimate'
      });
    }
  }

  async estimateTripAjax(req, res) {
    try {
      const { pickup, destination, date, time } = req.body;

      if (!pickup || !destination) {
        return res.status(400).json({
          success: false,
          error: 'Pickup and destination are required'
        });
      }

      const tripData = await this.prepareTripData({
        pickup,
        destination,
        date: date || new Date().toISOString().split('T')[0],
        time: time || '12:00'
      });

      const context = this.presenter.presentTripEstimate(tripData);

      res.json({
        success: true,
        estimate: context.tripEstimate,
        mapConfig: context.mapConfig
      });
    } catch (error) {
      console.error('AJAX Trip Estimation Error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async prepareTripData(tripInput) {
    const mockLocations = {
      'åslandhellinga 345, oslo': { lat: 59.8796, lng: 10.8084 },
      'gardermoen, norway': { lat: 60.1939, lng: 11.1004 },
      'oslo': { lat: 59.9139, lng: 10.7522 },
      'bergen': { lat: 60.3913, lng: 5.3221 },
      'trondheim': { lat: 63.4305, lng: 10.3951 },
      'stavanger': { lat: 58.9700, lng: 5.7331 }
    };

    const pickupCoords = this.findMockCoordinates(tripInput.pickup, mockLocations) || 
                        { lat: 59.9139, lng: 10.7522 };
    
    const destCoords = this.findMockCoordinates(tripInput.destination, mockLocations) || 
                      { lat: 60.1939, lng: 11.1004 };

    return {
      pickup: { address: tripInput.pickup, coordinates: pickupCoords },
      destination: { address: tripInput.destination, coordinates: destCoords },
      date: tripInput.date,
      time: tripInput.time
    };
  }

  findMockCoordinates(location, mockLocations) {
    const normalizedLocation = location.toLowerCase().trim();
    
    if (mockLocations[normalizedLocation]) {
      return mockLocations[normalizedLocation];
    }

    for (const [key, coords] of Object.entries(mockLocations)) {
      if (normalizedLocation.includes(key) || key.includes(normalizedLocation)) {
        return coords;
      }
    }
    return null;
  }
}

module.exports = HomeController;

