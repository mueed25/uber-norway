const express = require('express');
const TripController = require('../controllers/tripController');

const router = express.Router();
const tripController = new TripController();

// POST /trip/book - Book a new trip
router.post('/book', (req, res) => {
  tripController.bookTrip(req, res);
});

// GET /trip/:id - Get trip details
router.get('/:id', (req, res) => {
  tripController.getTripDetails(req, res);
});

// PUT /trip/:id - Update trip
router.put('/:id', (req, res) => {
  tripController.updateTrip(req, res);
});

// DELETE /trip/:id - Cancel trip
router.delete('/:id', (req, res) => {
  tripController.cancelTrip(req, res);
});

module.exports = router;