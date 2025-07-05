const Trip = require('../models/Trip');
const User = require('../models/User');
const HomePresenter = require('../presenters/homePresenter');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');



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

  calculateTripPrice(distance, rideType) {
  const pricingConfig = {
    uberx: {
      baseFare: 100,      
      perKm: 1,         
      perMinute: 2.5,    
      minimumFare: 50    
    },
    comfort: {
      baseFare: 1000,
      perKm: 1,
      perMinute: 3,
      minimumFare: 65
    },
    uberxl: {
      baseFare: 10000,
      perKm: 1,
      perMinute: 3.5,
      minimumFare: 80
    }
  };

  const rideKey = rideType.toLowerCase().replace('uber', 'uber');
  const config = pricingConfig[rideKey] || pricingConfig.uberx;
  
  const estimatedMinutes = Math.max(5, Math.round((distance / 30) * 60));
  
  const distancePrice = distance * config.perKm;
  const timePrice = estimatedMinutes * config.perMinute;
  const totalPrice = config.baseFare + distancePrice + timePrice;
  
  return {
    price: Math.max(config.minimumFare, Math.round(totalPrice)),
    estimatedMinutes: estimatedMinutes
  };
}

calculateDriverETA(pickupCoords, rideType) {
  const mockDriverLocations = {
    uberx: [
      { lat: 59.9139 + (Math.random() - 0.5) * 0.02, lng: 10.7522 + (Math.random() - 0.5) * 0.02 },
      { lat: 59.9139 + (Math.random() - 0.5) * 0.02, lng: 10.7522 + (Math.random() - 0.5) * 0.02 },
      { lat: 59.9139 + (Math.random() - 0.5) * 0.02, lng: 10.7522 + (Math.random() - 0.5) * 0.02 }
    ],
    comfort: [
      { lat: 59.9139 + (Math.random() - 0.5) * 0.02, lng: 10.7522 + (Math.random() - 0.5) * 0.02 },
      { lat: 59.9139 + (Math.random() - 0.5) * 0.02, lng: 10.7522 + (Math.random() - 0.5) * 0.02 }
    ],
    uberxl: [
      { lat: 59.9139 + (Math.random() - 0.5) * 0.02, lng: 10.7522 + (Math.random() - 0.5) * 0.02 },
      { lat: 59.9139 + (Math.random() - 0.5) * 0.02, lng: 10.7522 + (Math.random() - 0.5) * 0.02 }
    ]
  };

  const rideKey = rideType.toLowerCase().replace('uber', 'uber');
  const drivers = mockDriverLocations[rideKey] || mockDriverLocations.uberx;
  
  let closestDistance = Infinity;
  drivers.forEach(driverLocation => {
    const distance = this.calculateDistance(pickupCoords, driverLocation);
    if (distance < closestDistance) {
      closestDistance = distance;
    }
  });
  
  const etaMinutes = Math.max(2, Math.round((closestDistance / 25) * 60));
  
  return etaMinutes;
}
// Add this method to your HomeController class

async account(req, res) {
  try {
    // Check if user is authenticated
    if (!req.oidc.isAuthenticated()) {
      return res.oidc.login({ returnTo: '/account' });
    }

    const userId = req.oidc.user.sub;
    const user = await User.findOne({ auth0Id: userId });
    
    // Get user's trips
    const trips = await Trip.find({ userId: user?._id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 trips

    // Check payment method status
    let hasPaymentMethod = false;
    let paymentInfo = null;
    
    if (user?.hasValidPaymentMethod()) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(user.defaultPaymentMethodId);
        if (paymentMethod && paymentMethod.customer === user.stripeCustomerId) {
          hasPaymentMethod = true;
          paymentInfo = {
            cardBrand: paymentMethod.card.brand.toUpperCase(),
            cardLast4: paymentMethod.card.last4
          };
        }
      } catch (stripeError) {
        console.log('Payment method verification failed:', stripeError.message);
        // Clean up invalid payment method
        if (user) {
          user.hasPaymentMethod = false;
          user.defaultPaymentMethodId = null;
          await user.save();
        }
      }
    }

    // Format trips for display
    const formattedTrips = trips.map(trip => ({
      ...trip.toObject(),
      formattedDate: trip.scheduledDate ? 
        new Date(trip.scheduledDate).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'N/A',
      formattedTime: trip.scheduledTime || 'N/A',
      distance: trip.distance ? trip.distance.toFixed(1) : '0.0'
    }));

    const context = this.presenter.presentHomePage();
    res.render('account', {
      ...context,
      title: 'My Account',
      user: req.oidc.user,
      userProfile: user,
      userInformation: req.oidc,
      isAuthenticated: req.oidc.isAuthenticated(),
      rides: formattedTrips,
      hasPaymentMethod,
      paymentInfo
    });

  } catch (error) {
    console.error('Account Controller Error:', error);
    const errorContext = this.presenter.presentError(error);
    res.status(500).render('account', {
      ...errorContext,
      title: 'Account Error',
      user: req.oidc.user,
      userInformation: req.oidc,
      isAuthenticated: req.oidc.isAuthenticated(),
      rides: [],
      hasPaymentMethod: false,
      paymentInfo: null
    });
  }
}
generateDynamicRides(pickupCoords, dropoffCoords) {
  if (!pickupCoords || !dropoffCoords) {
    console.log('Missing coordinates for ride calculation');
    return this.getDefaultRides(); 
  }

  const tripDistance = this.calculateDistance(pickupCoords, dropoffCoords);
  console.log(`Calculated trip distance: ${tripDistance.toFixed(2)} km`);

  const rideTypes = [
    {
      type: 'UberX',
      category: 'Affordable, everyday rides',
      rating: '4.8',
      icon: 'car'
    },
    {
      type: 'Comfort',
      category: 'Newer cars with extra legroom',
      rating: '4.9',
      icon: 'car-luxury'
    },
    {
      type: 'UberXL',
      category: 'Larger cars for up to 6 passengers',
      rating: '4.7',
      icon: 'car-suv'
    }
  ];

  return rideTypes.map(ride => {
    const pricing = this.calculateTripPrice(tripDistance, ride.type);
    const eta = this.calculateDriverETA(pickupCoords, ride.type);
    
    return {
      id: `${ride.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ride.type,
      category: ride.category,
      price: `${pricing.price} kr`,
      eta: eta,
      arrivalTime: eta, 
      estimatedTripTime: pricing.estimatedMinutes, 
      rating: ride.rating,
      icon: ride.icon,
      distance: tripDistance.toFixed(1)
    };
  });
}

getDefaultRides() {
  const basePrice = 50;
  return [
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
      arrivalTime: Math.floor(Math.random() * 6) + 3,
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
}

async checkUserPaymentMethods(req, res) {
  try {
    if (!req.oidc.isAuthenticated()) {
      return res.json({ hasPaymentMethod: false });
    }

    const userId = req.oidc.user.sub;
    const user = await User.findOne({ auth0Id: userId });
    
    if (!user) {
      return res.json({ hasPaymentMethod: false });
    }

    // Verify payment method is still valid in Stripe
    if (user.hasValidPaymentMethod()) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(user.defaultPaymentMethodId);
        if (paymentMethod && paymentMethod.customer === user.stripeCustomerId) {
          const paymentInfo = user.getDefaultPaymentMethodInfo();
          return res.json({
            hasPaymentMethod: true,
            paymentInfo: paymentInfo
          });
        }
      } catch (stripeError) {
        console.log('Stripe payment method verification failed:', stripeError.message);
        // Clean up invalid payment method
        user.hasPaymentMethod = false;
        user.defaultPaymentMethodId = null;
        user.savedPaymentMethods = user.savedPaymentMethods.filter(pm => pm.paymentMethodId !== user.defaultPaymentMethodId);
        await user.save();
      }
    }
    
    res.json({ hasPaymentMethod: false });
  } catch (error) {
    console.error('Check Payment Methods Error:', error);
    res.status(500).json({ hasPaymentMethod: false, error: error.message });
  }
}

async tripSearch(req, res) {
  try {
    const { pickup, dropoff, pickupTime, rideFor } = req.body;
    
    console.log('Trip search data:', { pickup, dropoff, pickupTime, rideFor });
    
    let dynamicRides = [];
    
    if (pickup && dropoff && pickup.trim() !== '' && dropoff.trim() !== '') {
      const pickupCoords = this.findMockCoordinates(pickup, this.getMockLocations());
      const dropoffCoords = this.findMockCoordinates(dropoff, this.getMockLocations());
      
      if (pickupCoords && dropoffCoords) {
        console.log('Using dynamic ride calculation with real coordinates');
        dynamicRides = this.generateDynamicRides(pickupCoords, dropoffCoords);
      } else {
        console.log('Coordinates not found, using default rides');
        dynamicRides = this.getDefaultRides();
      }
    } else {
      console.log('Missing pickup/dropoff, using default rides');
      dynamicRides = this.getDefaultRides();
    }
    
    const context = this.presenter.presentHomePage();
    res.render('ride', { 
      ...context, 
      user: req.oidc.user, 
      userInformation: req.oidc,
      isAuthenticated: req.oidc.isAuthenticated(),
      ride: dynamicRides, 
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
  async about(req, res) {
    try {
      const context = this.presenter.presentHomePage();
      res.render('about-us', { 
        ...context, 
        user: req.oidc.user, 
        userInformation: req.oidc,
        isAuthenticated: req.oidc.isAuthenticated(),
        
      });
    } catch (error) {
      console.error('About-us Controller Error:', error);
      const errorContext = this.presenter.presentError(error);
      res.status(500).render('home', errorContext);
    }
  }


async trip(req, res) {
  try {
    const pickup = req.query.pickup || req.body.pickup || '';
    const dropoff = req.query.dropoff || req.body.dropoff || '';
    
    let dynamicRides = [];
    
    if (pickup.trim() !== '' && dropoff.trim() !== '') {
      const pickupCoords = this.findMockCoordinates(pickup, this.getMockLocations());
      const dropoffCoords = this.findMockCoordinates(dropoff, this.getMockLocations());
      
      if (pickupCoords && dropoffCoords) {
        console.log('Generating dynamic rides for trip page');
        dynamicRides = this.generateDynamicRides(pickupCoords, dropoffCoords);
      } else {
        console.log('Using default rides for trip page');
        dynamicRides = this.getDefaultRides();
      }
    } else {
      dynamicRides = this.getDefaultRides();
    }
    
    const context = this.presenter.presentHomePage();
    res.render('ride', { 
      ...context, 
      user: req.oidc.user, 
      userInformation: req.oidc,
      isAuthenticated: req.oidc.isAuthenticated(),
      ride: dynamicRides,
      pickup: pickup,
      dropoff: dropoff
    });
  } catch (error) {
    console.error('Trip Method Error:', error);
    const errorContext = this.presenter.presentError(error);
    res.status(500).render('ride', errorContext);
  }
}
  
async addPayment(req, res) {
  try {
    console.log('Add payment route hit');
    
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

    const { rideId, rideType, ridePrice, pickup, dropoff, scheduleDate, scheduleTime, useExistingCard } = req.body;
    
    // Validation
    const missingFields = [];
    if (!rideId?.trim()) missingFields.push('rideId');
    if (!rideType?.trim()) missingFields.push('rideType');
    if (!ridePrice?.toString().trim()) missingFields.push('ridePrice');
    if (!pickup?.trim()) missingFields.push('pickup location');
    if (!dropoff?.trim()) missingFields.push('dropoff location');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    const userId = req.oidc.user.sub;
    const userEmail = req.oidc.user.email;
    const user = await User.findOne({ auth0Id: userId });
    
    const priceValue = parseFloat(ridePrice.toString().replace(/[^\d.]/g, ''));
    const stripeAmount = Math.round(priceValue * 100);

    // Create trip first
    const pickupCoords = this.findMockCoordinates(pickup, this.getMockLocations()) || { lat: 59.9139, lng: 10.7522 };
    const destCoords = this.findMockCoordinates(dropoff, this.getMockLocations()) || { lat: 60.1939, lng: 11.1004 };
    const distance = this.calculateDistance(pickupCoords, destCoords);
    const estimatedDuration = Math.round(distance * 2);

    let scheduledDateTime;
    let isScheduled = false;
    
    if (scheduleDate && scheduleTime) {
      scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      isScheduled = true;
    } else {
      scheduledDateTime = new Date(Date.now() + 15 * 60 * 1000);
    }

    const newTrip = new Trip({
      pickup: { address: pickup.trim(), coordinates: pickupCoords },
      destination: { address: dropoff.trim(), coordinates: destCoords },
      scheduledDate: scheduledDateTime,
      scheduledTime: scheduleTime || scheduledDateTime.toTimeString().slice(0, 5),
      distance,
      estimatedDuration,
      estimatedPrice: priceValue,
      status: 'pending',
      paymentStatus: 'unpaid',
      confirmationEmailSent: false,
      ride: { type: rideType, price: priceValue },
      tripType: rideType.toLowerCase().includes('xl') ? 'xl' : 
               rideType.toLowerCase().includes('comfort') ? 'premium' : 'standard',
      userId: user?._id || null,
      isScheduled
    });

    const savedTrip = await newTrip.save();

    // Check if user wants to use existing card and has valid one
    if (useExistingCard === 'true' && user?.hasValidPaymentMethod()) {
      console.log('Processing payment with saved card');
      return await this.processExistingCardPayment(savedTrip, user, req, res);
    }

    // Create new payment method flow with setup mode
    console.log('Creating new payment method with setup mode');
    return await this.createNewPaymentMethodSetup(savedTrip, user, userEmail, stripeAmount, req, res);

  } catch (error) {
    console.error('Add Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initialization failed',
      error: error.message
    });
  }
}

async processExistingCardPayment(trip, user, req, res) {
  try {
    const stripeAmount = Math.round(trip.estimatedPrice * 100);
    
    const paymentMethod = await stripe.paymentMethods.retrieve(user.defaultPaymentMethodId);
    if (!paymentMethod || paymentMethod.customer !== user.stripeCustomerId) {
      throw new Error('Payment method no longer valid');
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: 'nok',
      customer: user.stripeCustomerId,
      payment_method: user.defaultPaymentMethodId,
      confirm: true,
      return_url: `${req.protocol}://${req.get('host')}/payment-success`,
      metadata: {
        tripId: trip._id.toString(),
        userId: user.auth0Id,
        userEmail: req.oidc.user.email,
        pickup: trip.pickup.address,
        dropoff: trip.destination.address,
      }
    });

    console.log('Payment Intent Created:', paymentIntent.id, 'Status:', paymentIntent.status);

    if (paymentIntent.status === 'succeeded') {
      trip.status = 'confirmed';
      trip.paymentStatus = 'paid';
      trip.stripeSessionId = paymentIntent.id;
      trip.stripePaymentIntentId = paymentIntent.id; 
      await trip.save();

      await this.sendConfirmationEmail(trip, req.oidc.user.email);

      return res.json({
        success: true,
        message: 'Payment successful',
        paymentStatus: 'completed',
        tripId: trip._id.toString(),
        paymentIntentId: paymentIntent.id,
        redirectTo: `/payment-success?payment_intent=${paymentIntent.id}&trip_id=${trip._id}`
      });
    } else if (paymentIntent.status === 'requires_action') {
      return res.json({
        success: false,
        requiresAction: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        tripId: trip._id.toString()
      });
    } else {
      console.log('Payment requires confirmation or failed:', paymentIntent.status);
      return res.json({
        success: false,
        message: 'Payment requires confirmation',
        paymentStatus: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
      });
    }
  } catch (error) {
    console.error('Existing Card Payment Error:', error);
    
    if (error.code === 'card_declined') {
      return res.json({
        success: false,
        cardDeclined: true,
        message: 'Your card was declined. Please try a different payment method.',
        fallbackToNewCard: true
      });
    } else if (error.code === 'expired_card') {
      return res.json({
        success: false,
        cardExpired: true,
        message: 'Your saved card has expired. Please add a new payment method.',
        fallbackToNewCard: true
      });
    } else if (error.message.includes('no longer valid')) {
      return res.json({
        success: false,
        cardInvalid: true,
        message: 'Your saved card is no longer valid. Please add a new payment method.',
        fallbackToNewCard: true
      });
    } else {
      return res.json({
        success: false,
        message: 'Payment processing failed. Please try again.',
        error: error.message
      });
    }
  }
}

async createNewPaymentMethodSetup(trip, user, userEmail, stripeAmount, req, res) {
  try {
   
    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: req.oidc.user.name || user?.fullName || '',
        metadata: { userId: user?.auth0Id || 'guest' }
      });
      customerId = customer.id;
      
      if (user) {
        user.stripeCustomerId = customerId;
        await user.save();
      }
    }

   
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: customerId,
      setup_intent_data: {
        metadata: {
          tripId: trip._id.toString(),
          userId: user?.auth0Id || 'guest',
          userEmail: userEmail,
          pickup: trip.pickup.address,
          dropoff: trip.destination.address,
          amount: stripeAmount.toString(),
          saveAndCharge: 'true'
        }
      },
      success_url: `${req.protocol}://${req.get('host')}/payment-setup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/trip?cancelled=true`
    });

    trip.stripeSessionId = session.id;
    await trip.save();

    return res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      isSetupMode: true
    });
  } catch (error) {
    console.error('Setup Payment Method Error:', error);
    throw error;
  }
}

async paymentSetupSuccess(req, res) {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).render('error', {
        title: 'Setup Error',
        error: { message: 'No session ID provided' }
      });
    }

    console.log('Processing setup success for session:', session_id);

 
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session retrieved:', session.id, 'Status:', session.status);

    if (session.status !== 'complete') {
      return res.status(400).render('error', {
        title: 'Setup Incomplete',
        error: { message: 'Payment method setup was not completed' }
      });
    }


    const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent);
    console.log('Setup intent status:', setupIntent.status);
    
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).render('error', {
        title: 'Setup Failed',
        error: { message: 'Payment method setup failed' }
      });
    }

    const tripId = setupIntent.metadata.tripId;
    console.log('Looking for trip:', tripId);
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).render('error', {
        title: 'Trip Not Found',
        error: { message: 'Trip not found' }
      });
    }

    console.log('Trip found:', trip._id);


    const user = await this.savePaymentMethodToUserFromSetup(setupIntent, req.oidc.user);
    console.log('Payment method saved to user');

    const amount = parseInt(setupIntent.metadata.amount);
    console.log('Charging amount:', amount);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'nok',
      customer: user.stripeCustomerId,
      payment_method: setupIntent.payment_method,
      confirm: true,
      return_url: `${req.protocol}://${req.get('host')}/payment-success`,
      metadata: {
        tripId: trip._id.toString(),
        userId: user.auth0Id,
        userEmail: setupIntent.metadata.userEmail,
        pickup: setupIntent.metadata.pickup,
        dropoff: setupIntent.metadata.dropoff
      }
    });

    console.log('Payment intent created:', paymentIntent.id, 'Status:', paymentIntent.status);

    if (paymentIntent.status === 'succeeded') {
    
      trip.status = 'confirmed';
      trip.paymentStatus = 'paid';
      trip.stripeSessionId = paymentIntent.id;
      await trip.save();

      console.log('Trip updated successfully');

      await this.sendConfirmationEmail(trip, setupIntent.metadata.userEmail);

    
      return res.redirect(`/payment-success?payment_intent=${paymentIntent.id}`);
    } else if (paymentIntent.status === 'requires_action') {
      
      return res.render('payment-action-required', {
        title: 'Payment Action Required',
        clientSecret: paymentIntent.client_secret,
        user: req.oidc.user,
        isAuthenticated: req.oidc.isAuthenticated()
      });
    } else {
      
      console.error('Payment failed with status:', paymentIntent.status);
      return res.status(400).render('error', {
        title: 'Payment Failed',
        error: { message: 'Payment could not be processed. Please try again.' }
      });
    }

  } catch (error) {
    console.error('Payment Setup Success Error:', error);
    

    if (error.type === 'StripeCardError') {
      return res.status(400).render('error', {
        title: 'Payment Failed',
        error: { message: `Card Error: ${error.message}` }
      });
    } else if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).render('error', {
        title: 'Payment Error',
        error: { message: 'Invalid payment request. Please try again.' }
      });
    } else {
      return res.status(500).render('error', {
        title: 'Payment Processing Error',
        error: { message: 'An error occurred while processing your payment. Please contact support.' }
      });
    }
  }
}

async savePaymentMethodToUserFromSetup(setupIntent, authUser) {
  try {
    if (!authUser) {
      throw new Error('No authenticated user provided');
    }

    const userId = authUser.sub;
    let user = await User.findOne({ auth0Id: userId });
    
    if (!user) {
      user = new User({
        auth0Id: userId,
        email: authUser.email,
        fullName: authUser.name || '',
        profileComplete: false
      });
    }

    const paymentMethodId = setupIntent.payment_method;
    
    if (!paymentMethodId) {
      throw new Error('No payment method ID found in setup intent');
    }

   
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    console.log('Payment method retrieved:', paymentMethod.id, 'Customer:', paymentMethod.customer);
    
   
    if (paymentMethod.customer !== user.stripeCustomerId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId
      });
      console.log('Payment method attached to customer');
    }

    
    user.defaultPaymentMethodId = paymentMethodId;
    user.hasPaymentMethod = true;
    
    
    const cardInfo = {
      paymentMethodId: paymentMethodId,
      cardBrand: paymentMethod.card.brand,
      cardLast4: paymentMethod.card.last4,
      isDefault: true,
      createdAt: new Date()
    };
    
    user.savedPaymentMethods = user.savedPaymentMethods || [];
  
    user.savedPaymentMethods.forEach(pm => pm.isDefault = false);
    user.savedPaymentMethods.push(cardInfo);

    await user.save();
    console.log('User payment method info saved');
    
    return user;
  } catch (error) {
    console.error('Save Payment Method Error:', error);
    throw error; 
  }
}

async paymentSuccess(req, res) {
  try {
    const { session_id, payment_intent } = req.query;

    if (!session_id && !payment_intent) {
      return res.status(400).render('error', {
        title: 'Payment Error',
        error: { message: 'No session or payment intent ID provided' }
      });
    }

    let trip, metadata;

    if (session_id) {
      
      const session = await stripe.checkout.sessions.retrieve(session_id);
      trip = await Trip.findById(session.metadata.tripId);
      metadata = session.metadata;

      if (session.payment_status === 'paid') {
        trip.status = 'confirmed';
        trip.paymentStatus = 'paid';
        await trip.save();


        await this.savePaymentMethodToUser(session, req.oidc.user);
      }
    } else {
  
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
      trip = await Trip.findById(paymentIntent.metadata.tripId);
      metadata = paymentIntent.metadata;
    }

    if (!trip) {
      return res.status(404).render('error', {
        title: 'Trip Not Found',
        error: { message: 'Trip not found' }
      });
    }

    await this.sendConfirmationEmail(trip, metadata.userEmail);

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

