const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getAllBookings,
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .post(protect, createBooking)
  .get(protect, admin, getAllBookings);

router.get('/my', protect, getMyBookings);

router.route('/:id')
  .get(protect, getBookingById)
  .delete(protect, cancelBooking);

router.put('/:id/status', protect, updateBookingStatus);

module.exports = router;
