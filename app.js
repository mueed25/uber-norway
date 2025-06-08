const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Import database configuration
const connectDatabase = require('./config/database');

// Import routes
const homeRoutes = require('./routes/home');
const tripRoutes = require('./routes/trip');

// Import utilities
const helpers = require('./utils/helpers');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDatabase();

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      connectSrc: ["'self'", "https://maps.googleapis.com"]
    }
  }
}));
app.use(compression());
app.use(cors());

// Body parsing middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars engine configuration
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: helpers
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', homeRoutes);
app.use('/trip', tripRoutes);

// 404 Error handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    error: {
      status: 404,
      message: 'The page you are looking for does not exist.'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    title: 'Server Error',
    error: {
      status: err.status || 500,
      message: process.env.NODE_ENV === 'production' 
        ? 'Something went wrong!' 
        : err.message
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚗 Uber Clone MCP Server running on http://localhost:${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});