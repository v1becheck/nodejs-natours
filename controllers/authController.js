const crypto = require('crypto');
// const { promisify } = require('util');
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (req.secure || process.env.NODE_ENV === 'production')
    cookieOptions.secure = true;

  // Remove password from the output
  user.password = undefined;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = '/me';
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  // 2. Check if the user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password'), 401);
  }

  // 3. If everything is ok, send the token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', null, {
    expires: new Date(Date.now() - 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Getting token and checking if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    //Check if jwt is present in the cookies on the client-side
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError('Please log in to get access.', 401));

  // 2. Verifying token
  const decoded = await jwt.verify(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The user whom used this token no longer exists', 401)
    );

  // 4. Check if user changed password after the token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('Recently changed password! Please log in again.', 401)
    );
  }

  // Grant access to protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return next();

    // 1. Verify the token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // 2. Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) return next();

    // 3. Check if user changed password after the token was issued
    if (currentUser.changePasswordAfter(decoded.iat)) {
      return next();
    }

    // There is a logged in user; Each template has access to res.locals
    res.locals.user = currentUser;
    return next();
  } catch (err) {
    // If token is invalid or expired, just continue without setting user
    return next();
  }
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // req.user.role gets value from middleware executed before this one
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perfom this action!', 403)
      );
    }

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('There is no user with that email address', 404));

  // 2. Generate the random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3. Send it back as an email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.createPasswordResetToken = undefined;
    user.createPasswordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending email. Please try again!', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2. If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3. Update changedPasswordAt property for the user

  // 4. Log user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from the collection

  const user = await User.findById(req.user.id).select('+password');
  if (!user) return next(new AppError('User does not exist', 400));

  // 2. Check if the posted password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password)))
    return next(new AppError('Wrong password. Please try again.', 401));

  // 3. If the password is correct, update it
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will not work as intended

  // 4. Log in user, send JWT
  createSendToken(user, 200, req, res);
});

// Auto-login middleware
exports.autoLogin = catchAsync(async (req, res, next) => {
  console.log('Auto-login middleware called'); // Log for debugging
  const user = await User.findOne({ email: process.env.AUTO_LOGIN_EMAIL });
  if (!user) {
    return next(new AppError('Auto-login user does not exist', 500));
  }

  console.log(`Auto-logging in user: ${user.email}`); // Log for debugging

  // Log the user in
  const token = signToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || process.env.NODE_ENV === 'production',
  });

  req.user = user;
  res.locals.user = user;

  next();
});
