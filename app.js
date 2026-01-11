const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// Trust proxies
app.enable('trust proxy');

// Server-side rendering
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARE

// Implement CORS
app.use(cors());
app.options('*', cors());

// Serving static files with caching and optimization
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0', // Cache for 1 year in production
    etag: true, // Enable ETag generation
    lastModified: true, // Enable Last-Modified headers
    setHeaders: (res, path) => {
      // Set specific cache headers for different file types
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else if (path.match(/\.(jpg|jpeg|png|gif|ico|svg|webp)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.match(/\.(css|js)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Set security HTTP headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: [
        "'self'",
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:', 'https://unpkg.com'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
      objectSrc: ["'none'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://unpkg.com',
      ],
      workerSrc: ["'self'", 'blob:', 'https://m.stripe.network'],
      childSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      formAction: ["'self'"],
      connectSrc: [
        "'self'",
        'https:',
        'http:',
        'ws:',
        'wss:',
        'data:',
        'blob:',
      ],
      upgradeInsecureRequests: [],
    },
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('tiny'));

// Ensure the logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Create a write stream (in append mode) for the access log
const accessLogPath = path.join(logDir, 'access.log');
const accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });

// Production logging - only log to file, not console
if (process.env.NODE_ENV === 'production') {
  app.use(
    morgan(
      ':remote-addr :method :url :status :response-time ms - :res[content-length]',
      { stream: accessLogStream }
    )
  );
  // Removed duplicate morgan('combined') to reduce overhead
}

// Limit requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour.',
});
app.use('/api', limiter);

// Stripe webhook, BEFORE body-parser, because stripe needs the body as stream
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Compress the text sent to the clients with optimization
app.use(
  compression({
    level: 6, // Compression level (1-9, 6 is a good balance)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression for all other requests
      return compression.filter(req, res);
    },
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES
app.use('/', viewRouter);
app.use('/tour', viewRouter);
app.use('/book', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handling Unhandled Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

module.exports = app;
