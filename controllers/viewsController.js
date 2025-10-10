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

exports.getDestinations = catchAsync(async (req, res, next) => {
  // 1. Get featured tours data from collection
  const featuredTours = await Tour.find({
    ratingsAverage: { $gte: 4.5 },
  }).limit(6);
  const allTours = await Tour.find();

  // 2. Create destination categories
  const destinations = [
    {
      name: 'Mountain Adventures',
      description: "Conquer the world's most breathtaking peaks",
      image: 'tour-1-cover.jpg',
      tourCount: allTours.filter((tour) => tour.difficulty === 'difficult')
        .length,
      featuredTours: featuredTours
        .filter((tour) => tour.difficulty === 'difficult')
        .slice(0, 2),
    },
    {
      name: 'Coastal Escapes',
      description: 'Discover pristine beaches and coastal wonders',
      image: 'tour-2-cover.jpg',
      tourCount: allTours.filter((tour) => tour.difficulty === 'easy').length,
      featuredTours: featuredTours
        .filter((tour) => tour.difficulty === 'easy')
        .slice(0, 2),
    },
    {
      name: 'Cultural Journeys',
      description: 'Immerse yourself in rich traditions and history',
      image: 'tour-3-cover.jpg',
      tourCount: allTours.filter((tour) => tour.difficulty === 'medium').length,
      featuredTours: featuredTours
        .filter((tour) => tour.difficulty === 'medium')
        .slice(0, 2),
    },
  ];

  // 3. Render the destinations template
  res.status(200).render('destinations', {
    title: 'Featured Destinations',
    destinations,
    featuredTours,
  });
});

exports.getStories = catchAsync(async (req, res, next) => {
  // 1. Get tours with reviews for stories
  const toursWithReviews = await Tour.find({ ratingsQuantity: { $gte: 5 } })
    .populate({
      path: 'reviews',
      populate: {
        path: 'user',
        select: 'name photo',
      },
    })
    .limit(8);

  // 2. Create travel stories from reviews
  const travelStories = toursWithReviews.map((tour) => {
    const recentReview = tour.reviews[tour.reviews.length - 1];
    return {
      id: tour._id,
      tourName: tour.name,
      tourImage: tour.imageCover,
      tourSlug: tour.slug,
      story: recentReview.review,
      author: recentReview.user.name,
      authorPhoto: recentReview.user.photo,
      rating: recentReview.rating,
      date: recentReview.createdAt,
      location: tour.startLocation.description,
      duration: tour.duration,
    };
  });

  // 3. Create featured stories (top rated)
  const featuredStories = travelStories.slice(0, 3);

  // 4. Create story categories
  const storyCategories = [
    {
      name: 'Adventure Stories',
      description: "Epic tales from the world's most challenging adventures",
      icon: 'icon-trending-up',
      stories: travelStories.filter((story) => story.rating >= 4.5).slice(0, 2),
    },
    {
      name: 'Cultural Experiences',
      description: 'Heartwarming stories of cultural discovery and connection',
      icon: 'icon-users',
      stories: travelStories.filter((story) => story.rating >= 4.0).slice(0, 2),
    },
    {
      name: 'Hidden Gems',
      description: 'Discoveries of secret places and unexpected adventures',
      icon: 'icon-map-pin',
      stories: travelStories.filter((story) => story.rating >= 4.2).slice(0, 2),
    },
  ];

  // 5. Render the stories template
  res.status(200).render('stories', {
    title: 'Travel Stories',
    travelStories,
    featuredStories,
    storyCategories,
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
