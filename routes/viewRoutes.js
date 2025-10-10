const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(viewsController.alerts);

router.get(
  '/',
  // bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
router.get('/book', authController.isLoggedIn, viewsController.getBook);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/signup', authController.isLoggedIn, viewsController.getSignupForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

router.get(
  '/destinations',
  authController.isLoggedIn,
  viewsController.getDestinations
);
router.get('/about', authController.isLoggedIn, viewsController.getAbout);
router.get(
  '/download-apps',
  authController.isLoggedIn,
  viewsController.getDownloadApps
);
router.get(
  '/become-guide',
  authController.isLoggedIn,
  viewsController.getBecomeGuide
);
router.get('/careers', authController.isLoggedIn, viewsController.getCareers);
router.get('/contact', authController.isLoggedIn, viewsController.getContact);

// UPDATE USER DATA WITHOUT API
router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
