const express = require('express');
const HomeController = require('../controllers/homeController');

const router = express.Router();
const homeController = new HomeController();

// GET / - Home page
router.get('/', (req, res) => {
  homeController.index(req, res);
});

router.get('/callback', (req, res) => {
  homeController.index(req, res);
});

router.get('/complete-profile', (req, res) => {
  homeController.profile(req, res);
});
// POST /estimate - Trip estimation (form submission)
router.post('/estimate', (req, res) => {
  homeController.estimateTrip(req, res);
});

// POST /estimate-ajax - AJAX trip estimation
router.post('/estimate-ajax', (req, res) => {
  homeController.estimateTripAjax(req, res);
});

module.exports = router;