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
  // 1. Get Tour data from collection with optimized field selection
  const tours = await Tour.find().select('name price ratingsAverage summary difficulty duration imageCover slug');

  // 2. Build template

  // 3. Render that template using the tour data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getDestinations = catchAsync(async (req, res, next) => {
  // 1. Optimize: Get all needed data in parallel with field selection
  const [featuredTours, allTours] = await Promise.all([
    Tour.find({
      ratingsAverage: { $gte: 4.5 },
    })
      .select('name price ratingsAverage summary difficulty duration imageCover slug startLocation maxGroupSize')
      .limit(6)
      .lean(), // Use lean() for read-only operations to improve performance
    Tour.find()
      .select('difficulty')
      .lean(), // Only select difficulty field for counting
  ]);

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
  // Note: Cannot use lean() with virtual populate - virtual populate requires Mongoose documents
  const toursWithReviews = await Tour.find({ ratingsQuantity: { $gte: 5 } })
    .select('name imageCover slug startLocation duration')
    .populate({
      path: 'reviews',
      select: 'review rating createdAt user',
      options: { sort: { createdAt: -1 }, limit: 1 }, // Only get the most recent review
      populate: {
        path: 'user',
        select: 'name photo',
      },
    })
    .limit(8);

  // 2. Create travel stories from reviews - filter out tours without valid reviews
  const travelStories = toursWithReviews
    .map((tour) => {
      // Convert to plain object if needed
      const tourObj = tour.toObject ? tour.toObject() : tour;
      
      // Strict validation - ensure reviews exist and are valid
      if (!tourObj.reviews || !Array.isArray(tourObj.reviews) || tourObj.reviews.length === 0) {
        return null;
      }
      
      const recentReview = tourObj.reviews[tourObj.reviews.length - 1];
      
      // Additional safety check - ensure review has all required fields
      if (!recentReview || !recentReview.review || !recentReview.user || !recentReview.user.name) {
        return null;
      }
      
      return {
        id: tourObj._id,
        tourName: tourObj.name,
        tourImage: tourObj.imageCover,
        tourSlug: tourObj.slug,
        story: recentReview.review,
        author: recentReview.user.name,
        authorPhoto: recentReview.user.photo || 'default.jpg',
        rating: recentReview.rating || 0,
        date: recentReview.createdAt || new Date(),
        location: tourObj.startLocation?.description || 'Location not specified',
        duration: tourObj.duration || 0,
      };
    })
    .filter((story) => story !== null); // Remove null entries

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
  // Optimized: Use lean() for better performance and select specific fields
  const tour = await Tour.findOne({ slug: req.params.slug })
    .populate({
      path: 'reviews',
      select: 'review rating createdAt user',
      populate: {
        path: 'user',
        select: 'name photo',
      },
    })
    .populate({
      path: 'guides',
      select: 'name photo role',
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
  // 1. Find all bookings with optimized field selection
  const bookings = await Booking.find({ user: req.user.id })
    .select('tour')
    .lean();

  // 2. Find tours with the returned IDs - optimized with field selection
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } })
    .select('name price ratingsAverage summary difficulty duration imageCover slug')
    .lean();

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
