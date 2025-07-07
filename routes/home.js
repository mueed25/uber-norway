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

router.get('/', requireCompleteProfile, (req, res) => {
  console.log('Home route hit');
  console.log('Query params:', req.query);
  console.log('Session form data:', req.session.formData);
  console.log('User authenticated:', req.oidc.isAuthenticated());
  
  const formData = {
    pickup: req.query.pickup || req.session.formData?.pickup || '',
    destination: req.query.destination || req.session.formData?.destination || '',
    date: req.query.date || req.session.formData?.date || '',
    time: req.query.time || req.session.formData?.time || ''
  };
  
  console.log('Final form data:', formData);
  
  if (req.session.formData) {
    delete req.session.formData;
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
    });
  }
  
  homeController.index(req, res, formData);
});

router.get('/callback', async (req, res) => {
  console.log('Callback route hit');
  console.log('User authenticated:', req.oidc.isAuthenticated());
  console.log('Session form data:', req.session.formData);
  
  if (req.oidc.isAuthenticated()) {
    try {
      const user = await User.findOne({ auth0Id: req.oidc.user.sub });
      
      if (user && !user.profileComplete) {
        return res.redirect('/complete-profile');
      }
      
      if (req.session.formData) {
        const formData = req.session.formData;
        console.log('Redirecting with form data:', formData);
        
        delete req.session.formData;
        
        return req.session.save((err) => {
          if (err) console.error('Session save error:', err);
          
          const queryParams = new URLSearchParams();
          Object.keys(formData).forEach(key => {
            if (formData[key]) queryParams.append(key, formData[key]);
          });
          
          return res.redirect(`/trip?${queryParams.toString()}`);
        });
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

router.post('/complete-profile', (req, res) => {
  console.log('Complete profile POST route hit');
  homeController.completeProfile(req, res);
});

router.get('/check-payment-methods', (req, res) => {
  console.log('/check-payment-methods route hit');
  homeController.checkUserPaymentMethods(req, res);
});

router.post('/add-payment', requireAuth, requireCompleteProfile, async (req, res) => {
  console.log('Add payment route hit');
  await homeController.addPayment(req, res);
});

router.get('/payment-setup-success', async (req, res) => {
  console.log('Payment setup success route hit');
  await homeController.paymentSetupSuccess(req, res);
});

router.get('/payment-success', async (req, res) => {
  console.log('Payment success route hit with session_id:', req.query.session_id);
  await homeController.paymentSuccess(req, res);
});

router.get('/payment-cancel', (req, res) => {
  console.log('Payment cancelled');
  res.redirect('/trip?cancelled=true&message=Payment was cancelled');
});

router.get('/account', async (req, res) => {
  console.log('Account route hit');
  await homeController.account(req, res);
});

router.get('/trip', requireAuth, (req, res) => {
  homeController.trip(req, res); 
});

router.post('/trip', async (req, res) => {
  console.log('POST /trip route hit');
  console.log('Form data:', req.body);
  console.log('User authenticated:', req.oidc.isAuthenticated());
  
  if (!req.oidc.isAuthenticated()) {
    console.log('User not authenticated, storing form data');
    
    req.session.formData = {
      pickup: req.body.pickup,
      destination: req.body.destination,
      date: req.body.date,
      time: req.body.time,
      pickup_lat: req.body.pickup_lat,
      pickup_lng: req.body.pickup_lng,
      destination_lat: req.body.destination_lat,
      destination_lng: req.body.destination_lng
    };
    
    console.log('Storing form data in session:', req.session.formData);
    
    return req.session.save((err) => {
      if (err) {
        console.error('Session save failed:', err);
        return res.status(500).send('Session error');
      }
      console.log('Session saved successfully, redirecting to login');
      
      return res.oidc.login({
        returnTo: req.protocol + '://' + req.get('host') + '/callback'
      });
    });
  }
  
  console.log('User authenticated, proceeding with trip search');
  homeController.tripSearch(req, res);
});

router.get('/login', (req, res) => {
  console.log('Manual login route hit');
  return res.oidc.login({
    returnTo: req.protocol + '://' + req.get('host') + '/callback'
  });
});


router.get('/about-us', (req, res) => {
  homeController.about(req, res); 
});

router.get('/trip/complete', requireAuth, async (req, res) => {
  console.log('Trip completion route hit');
  
  const formData = req.session.formData;
  
  if (!formData) {
    console.log('No form data found in session');
    return res.redirect('/?error=no_form_data');
  }
  
  console.log('Processing stored form data:', formData);
  
  delete req.session.formData;
  
  req.body = formData;
  homeController.tripSearch(req, res);
});

router.post('/estimate', requireCompleteProfile, (req, res) => homeController.estimateTrip(req, res));
router.post('/estimate-ajax', requireCompleteProfile, (req, res) => homeController.estimateTripAjax(req, res));

module.exports = router;