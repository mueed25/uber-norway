const express = require('express');
const HomeController = require('../controllers/homeController');

const router = express.Router();
const homeController = new HomeController();

// Profile completion check middleware
const requireCompleteProfile = (req, res, next) => {
  if (req.oidc.isAuthenticated() && req.oidc.user && !req.oidc.user.profileComplete) {
    return res.redirect('/complete-profile');
  }
  next();
};

router.get('/', requireCompleteProfile, (req, res) => homeController.index(req, res));
router.get('/callback', (req, res) => res.redirect('/'));
router.get('/complete-profile', (req, res) => homeController.showProfileForm(req, res));
router.post('/complete-profile', (req, res) => homeController.completeProfile(req, res));
router.post('/estimate', requireCompleteProfile, (req, res) => homeController.estimateTrip(req, res));
router.post('/estimate-ajax', requireCompleteProfile, (req, res) => homeController.estimateTripAjax(req, res));

module.exports = router;
