const express = require('express');
const HomeController = require('../controllers/homeController');
const User = require('../models/User');

const router = express.Router();
const homeController = new HomeController();

const requireCompleteProfile = async (req, res, next) => {
  const skipRoutes = ['/complete-profile', '/callback', '/login', '/logout', '/payment-success'];
  if (skipRoutes.includes(req.path)) {
    return next();
  }

  if (!req.oidc.isAuthenticated()) {
    return next();
  }
  
  try {
    const user = await User.findOne({ auth0Id: req.oidc.user.sub });
    if (user && !user.profileComplete) {
      console.log('User profile incomplete, redirecting to complete-profile');
      return res.redirect('/complete-profile');
    }
    if (user) {
      req.oidc.user.profileComplete = user.profileComplete;
      req.oidc.user.appUserId = user._id.toString();
    }
    next();
  } catch (error) {
    console.error('Profile check error:', error);
    next();
  }
};

const requireAuth = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
  
    return res.oidc.login({ returnTo: req.originalUrl });
  }
  next();
};

router.get('/', requireCompleteProfile, (req, res) => homeController.index(req, res));

router.get('/callback', async (req, res) => {
  console.log('Callback route hit');
  
  if (req.oidc.isAuthenticated()) {
    try {
      const user = await User.findOne({ auth0Id: req.oidc.user.sub });
      console.log('User found after callback:', user ? 'yes' : 'no');
      console.log('Profile complete:', user ? user.profileComplete : 'N/A');
      
      if (user && !user.profileComplete) {
        console.log('Redirecting to complete profile from callback');
        return res.redirect('/complete-profile');
      }
    } catch (error) {
      console.error('Callback error:', error);
    }
  }
  
  res.redirect('/');
});

router.get('/complete-profile', (req, res) => {
  console.log('Complete profile route hit');
  homeController.showProfileForm(req, res);
});

router.get('/trip', (req, res) => {
  homeController.trip(req, res); 
});
router.post('/trip', (req, res) => {
  homeController.tripSearch(req, res);
});
router.post('/complete-profile', (req, res) => {
  console.log('Complete profile POST route hit');
  homeController.completeProfile(req, res);
});


router.post('/add-payment', requireAuth, requireCompleteProfile, async (req, res) => {
  console.log('Add payment route hit');
  await homeController.addPayment(req, res);
});


router.get('/payment-success', async (req, res) => {
  console.log('Payment success route hit with session_id:', req.query.session_id);
  await homeController.paymentSuccess(req, res);
});


router.get('/payment-cancel', (req, res) => {
  console.log('Payment cancelled');
  res.redirect('/trip?cancelled=true&message=Payment was cancelled');
});

router.post('/estimate', requireCompleteProfile, (req, res) => homeController.estimateTrip(req, res));
router.post('/estimate-ajax', requireCompleteProfile, (req, res) => homeController.estimateTripAjax(req, res));

module.exports = router;