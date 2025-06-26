const express = require('express');
const TripController = require('../controllers/tripController');

const router = express.Router();
const tripController = new TripController();

router.post('/book', (req, res) => {
  tripController.bookTrip(req, res);
});

router.get('/:id', (req, res) => {
  tripController.getTripDetails(req, res);
});

router.put('/:id', (req, res) => {
  tripController.updateTrip(req, res);
});

router.delete('/:id', (req, res) => {
  tripController.cancelTrip(req, res);
});

module.exports = router;