const Trip = require('../models/Trip');
const HomePresenter = require('../presenters/homePresenter');

/**
 * Home Controller - Handles home page requests
 * Part of the MCP (Model-Controller-Presenter) architecture
 */
class HomeController {
  constructor() {
    this.presenter = new HomePresenter();
  }

  /**
   * Display home page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async index(req, res) {
    try {
      const context = this.presenter.presentHomePage();
      res.render('home', context);
    } catch (error) {
      console.error('Home Controller Error:', error);
      const errorContext = this.presenter.presentError(error);
      res.status(500).render('home', errorContext);
    }
  }

  /**
   * Handle trip estimation request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async estimateTrip(req, res) {
    try {
      const { pickup, destination, date, time } = req.body;

      // Validate required fields
      if (!pickup || !destination || !date || !time) {
        throw new Error('All fields are required: pickup, destination, date, and time');
      }

      // For demo purposes, we'll use mock coordinates
      // In a real app, you'd geocode the addresses using Google Places API
      const tripData = await this.prepareTripData({
        pickup,
        destination,
        date,
        time
      });

      // Present the trip estimate
      const context = this.presenter.presentTripEstimate(tripData);
      res.render('home', context);

    } catch (error) {
      console.error('Trip Estimation Error:', error);
      const errorContext = this.presenter.presentError(error, req.body);
      res.status(400).render('home', errorContext);
    }
  }

  /**
   * Handle AJAX trip estimation for real-time updates
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
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

  /**
   * Prepare trip data with coordinates (mock implementation)
   * In production, this would use Google Places API for geocoding
   * @param {Object} tripInput - Raw trip input data
   * @returns {Object} - Trip data with coordinates
   */
  async prepareTripData(tripInput) {
    // Mock coordinates for common Norwegian locations
    const mockLocations = {
      'åslandhellinga 345, oslo': { lat: 59.8796, lng: 10.8084 },
      'gardermoen, norway': { lat: 60.1939, lng: 11.1004 },
      'oslo': { lat: 59.9139, lng: 10.7522 },
      'bergen': { lat: 60.3913, lng: 5.3221 },
      'trondheim': { lat: 63.4305, lng: 10.3951 },
      'stavanger': { lat: 58.9700, lng: 5.7331 }
    };

    // Simple geocoding simulation
    const pickupCoords = this.findMockCoordinates(tripInput.pickup, mockLocations) || 
                        { lat: 59.9139, lng: 10.7522 }; // Default to Oslo
    
    const destCoords = this.findMockCoordinates(tripInput.destination, mockLocations) || 
                      { lat: 60.1939, lng: 11.1004 }; // Default to Gardermoen

    return {
      pickup: {
        address: tripInput.pickup,
        coordinates: pickupCoords
      },
      destination: {
        address: tripInput.destination,
        coordinates: destCoords
      },
      date: tripInput.date,
      time: tripInput.time
    };
  }

  /**
   * Find mock coordinates for a location string
   * @param {String} location - Location string
   * @param {Object} mockLocations - Mock location database
   * @returns {Object|null} - Coordinates or null
   */
  findMockCoordinates(location, mockLocations) {
    const normalizedLocation = location.toLowerCase().trim();
    
    // Try exact match first
    if (mockLocations[normalizedLocation]) {
      return mockLocations[normalizedLocation];
    }

    // Try partial matches
    for (const [key, coords] of Object.entries(mockLocations)) {
      if (normalizedLocation.includes(key) || key.includes(normalizedLocation)) {
        return coords;
      }
    }

    return null;
  }
}

module.exports = HomeController;