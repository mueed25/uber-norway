const Trip = require('../models/Trip');
const User = require('../models/user');
const HomePresenter = require('../presenters/homePresenter');

class HomeController {
  constructor() {
    this.presenter = new HomePresenter();
  }

  async index(req, res) {
    try {
      const context = this.presenter.presentHomePage();
      res.render('home', { 
        ...context, 
        user: req.oidc.user, 
        userInformation: req.oidc,
        isAuthenticated: req.oidc.isAuthenticated()
      });
    } catch (error) {
      console.error('Home Controller Error:', error);
      const errorContext = this.presenter.presentError(error);
      res.status(500).render('home', errorContext);
    }
  }

  async showProfileForm(req, res) {
    if (!req.oidc.isAuthenticated()) {
      return res.redirect('/login');
    }

    try {
      res.render('complete-profile', { 
        title: 'Complete Your Profile',
        user: req.oidc.user,
        isAuthenticated: true
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
    if (!req.oidc.isAuthenticated()) {
      return res.redirect('/login');
    }

    try {
      const { fullName, age, phone } = req.body;
      
      // Validate required fields
      if (!fullName || !age || !phone) {
        return res.render('complete-profile', {
          title: 'Complete Your Profile',
          user: req.oidc.user,
          error: 'All fields are required',
          formData: req.body
        });
      }

      // Update user profile
      const auth0Id = req.oidc.user.sub;
      await User.findOneAndUpdate(
        { auth0Id },
        {
          fullName: fullName.trim(),
          age: parseInt(age),
          phone: phone.trim(),
          profileComplete: true
        },
        { new: true }
      );

      // Update session
      req.oidc.user.profileComplete = true;

      res.redirect('/?welcome=true');
    } catch (error) {
      console.error('Complete Profile Error:', error);
      res.render('complete-profile', {
        title: 'Complete Your Profile',
        user: req.oidc.user,
        error: 'Failed to save profile. Please try again.',
        formData: req.body
      });
    }
  }

  // ... existing estimateTrip methods remain the same ...
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