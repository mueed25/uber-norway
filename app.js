// ==================== app.js (Updated) ====================
const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
const { auth } = require('express-openid-connect');

// Import User model BEFORE using it
const User = require('./models/user');

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
      const auth0Id = session.user.sub;
      let user = await User.findOne({ auth0Id });
      
      if (!user) {
        // Create minimal user record
        user = await User.create({
          auth0Id,
          email: session.user.email,
          profileComplete: false
        });
      }
      
      // Store user info in session
      session.user.appUserId = user._id.toString();
      session.user.profileComplete = user.profileComplete;
      
      return session;
    } catch (error) {
      console.error('afterCallback error:', error);
      return session;
    }
  }
};

// Database and routes
const connectDatabase = require('./config/database');
const homeRoutes = require('./routes/home');
const tripRoutes = require('./routes/trip');
const helpers = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

connectDatabase();

// Middleware setup
app.use(auth(config));
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

// Handlebars setup
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: helpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Profile completion middleware
const requireCompleteProfile = (req, res, next) => {
  if (req.oidc.isAuthenticated() && req.oidc.user && !req.oidc.user.profileComplete) {
    return res.redirect('/complete-profile');
  }
  next();
};

// Routes
app.use('/', homeRoutes);
app.use('/trip', requireCompleteProfile, tripRoutes);

// Error handlers
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