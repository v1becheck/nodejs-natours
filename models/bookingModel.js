const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price.'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

// Index for frequently queried user field
bookingSchema.index({ user: 1, createdAt: -1 });

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name',
  });
  next();
});

// Virtualy populate - Incomplete or Wrong
// bookingSchema.virtual('tours', {
//   ref: 'Booking',
//   localField: '_id',
//   foreignField: 'tour',
// });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
