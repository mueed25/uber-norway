
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
const { auth } = require('express-openid-connect');

const User = require('./models/User');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code',
    scope: 'openid profile email'
  },
  routes: {
    callback: '/callback'
  },
  afterCallback: async (req, res, session) => {
    try {
      console.log('AfterCallback triggered');
      console.log('Full session object:', JSON.stringify(session, null, 2));
      console.log('Session keys:', Object.keys(session));
      
      let userData = session.user || session;
      
      console.log('User data:', userData);
      console.log('User sub/id:', userData.sub);
      console.log('User email:', userData.email);

      if (!userData || !userData.sub) {
        console.log('No user data found in session');
        console.log('Available session data:', session);
        return session;
      }
      
      const auth0Id = userData.sub;
      let user = await User.findOne({ auth0Id });
      
      if (!user) {
        console.log('Creating new user for:', userData.email);
        user = await User.create({
          auth0Id,
          email: userData.email,
          profileComplete: false
        });
        console.log('New user created:', user._id);
      } else {
        console.log('Existing user found:', user._id);
      }
      
      if (!session.user) {
        session.user = userData;
      }
      
      session.user.appUserId = user._id.toString();
      session.user.profileComplete = user.profileComplete;
      
      console.log('Session updated - profileComplete:', user.profileComplete);
      console.log('Final session.user:', session.user);
      
      return session;
    } catch (error) {
      console.error('afterCallback error:', error);
      console.error('Error stack:', error.stack);
      return session;
    }
  }
};

const connectDatabase = require('./config/database');
const homeRoutes = require('./routes/home');
const tripRoutes = require('./routes/trip');
const helpers = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

connectDatabase();

app.use(auth(config));

app.use((req, res, next) => {
  if (req.oidc.isAuthenticated()) {
  }
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com"]
    }
  }
}));

app.use(compression());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: helpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(async (req, res, next) => {
  if (req.oidc.isAuthenticated() && req.oidc.user && req.oidc.user.sub) {
    try {
      const user = await User.findOne({ auth0Id: req.oidc.user.sub });
      if (user) {
        req.oidc.user.profileComplete = user.profileComplete;
        req.oidc.user.appUserId = user._id.toString();
        console.log('Synced user data - profileComplete:', user.profileComplete);
      } else {
        console.log('No user found in database for:', req.oidc.user.sub);
        const newUser = await User.create({
          auth0Id: req.oidc.user.sub,
          email: req.oidc.user.email,
          profileComplete: false
        });
        req.oidc.user.profileComplete = false;
        req.oidc.user.appUserId = newUser._id.toString();
        console.log('Created new user:', newUser._id);
      }
    } catch (error) {
      console.error('User sync error:', error);
    }
  }
  next();
});

const requireCompleteProfile = (req, res, next) => {
  console.log('Checking profile completion...');
  console.log('Authenticated:', req.oidc.isAuthenticated());
  
  if (req.oidc.isAuthenticated() && req.oidc.user) {
    console.log('Profile complete status:', req.oidc.user.profileComplete);
    
    if (req.path === '/complete-profile' || req.path === '/logout') {
      return next();
    }
    
    if (!req.oidc.user.profileComplete) {
      console.log('Redirecting to complete profile');
      return res.redirect('/complete-profile');
    }
  }
  next();
};

app.use('/', homeRoutes);
app.use('/trip', requireCompleteProfile, tripRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    error: { status: 404, message: 'The page you are looking for does not exist.' }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    title: 'Server Error',
    error: {
      status: err.status || 500,
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚗 Uber Norway running on http://localhost:${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});