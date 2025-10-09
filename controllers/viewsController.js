const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert = `Your booking was successfull! Please check your email for confirmation. If your booking doesn't show here immediately, please come back later.`;
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1. Get Tour data from collection
  const tours = await Tour.find();

  // 2. Build template

  // 3. Render that template using the tour data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1. Get the data, for the requested tour (including reviews and tour-guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.'));
  }

  // 2. Build template

  // 3. Render template using the data from step 1.
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getSignupForm = catchAsync(async (req, res) => {
  res.status(200).render('signup', {
    title: `Sign up your account`,
  });
});

exports.getBook = catchAsync(async (req, res) => {
  res.status(200).render('book', {
    title: `Book your first tour`,
  });
});

exports.getLoginForm = catchAsync(async (req, res) => {
  res.status(200).render('login', {
    title: `Log into your account`,
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: `Your account`,
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1. Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2. Find tours with the returened IDs
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    url: req.url,
    title: 'My Tours',
    tours,
  });
});

// UPDATE USER DATA WITHOUT API
exports.updateUserData = catchAsync(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).render('account', {
    title: `Your account`,
    user: updatedUser,
  });
});

exports.getAbout = catchAsync(async (req, res) => {
  res.status(200).render('about', {
    title: 'About Us',
  });
});

exports.getDownloadApps = catchAsync(async (req, res) => {
  res.status(200).render('downloadApps', {
    title: 'Download Apps',
  });
});

exports.getBecomeGuide = catchAsync(async (req, res) => {
  res.status(200).render('becomeGuide', {
    title: 'Become a Guide',
  });
});

exports.getCareers = catchAsync(async (req, res) => {
  res.status(200).render('careers', {
    title: 'Careers',
  });
});

exports.getContact = catchAsync(async (req, res) => {
  res.status(200).render('contact', {
    title: 'Contact Us',
  });
});
