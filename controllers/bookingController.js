const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Location = require('../models/Location');

// Helper to generate a unique readable booking code
const generateBookingCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'PRK-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @desc    Create a new parking reservation / booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res, next) => {
  try {
    const {
      slotId,
      driverName,
      driverPhone,
      vehicleNumber,
      vehicleType,
      startTime,
      durationHours,
      paymentMethod,
    } = req.body;

    if (!slotId || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID and Vehicle Registration Number are required.',
      });
    }

    const slot = await Slot.findById(slotId).populate('location');
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Selected parking slot does not exist.',
      });
    }

    if (slot.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `Slot ${slot.slotNumber} is currently ${slot.status}. Please choose another available slot.`,
      });
    }

    const hours = Number(durationHours) || 2;
    const start = startTime ? new Date(startTime) : new Date();
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    const hourlyRate = slot.hourlyRate || 40;
    const totalAmount = hourlyRate * hours;
    const bookingCode = generateBookingCode();

    // Data payload for QR code simulation
    const qrData = JSON.stringify({
      code: bookingCode,
      slot: slot.slotNumber,
      location: slot.location.name,
      vehicle: vehicleNumber.toUpperCase(),
      start: start.toISOString(),
      end: end.toISOString(),
      amount: totalAmount,
    });

    const booking = await Booking.create({
      bookingCode,
      user: req.user._id,
      slot: slot._id,
      location: slot.location._id,
      driverName: driverName || req.user.name,
      driverPhone: driverPhone || req.user.phone || '9876543210',
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      vehicleType: vehicleType || slot.vehicleType,
      startTime: start,
      endTime: end,
      durationHours: hours,
      hourlyRate,
      totalAmount,
      paymentStatus: 'paid',
      paymentMethod: paymentMethod || 'UPI',
      status: 'confirmed',
      qrCodeData: qrData,
    });

    // Mark slot as reserved
    slot.status = 'reserved';
    slot.currentBooking = booking._id;
    await slot.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('slot', 'slotNumber floor vehicleType hourlyRate hasCharging')
      .populate('location', 'name code address city coordinates')
      .populate('user', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Parking slot booked successfully!',
      data: populatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user's bookings
// @route   GET /api/bookings/my
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('slot', 'slotNumber floor vehicleType')
      .populate('location', 'name code address city')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('slot')
      .populate('location')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Ensure only the owner or an admin can access this booking
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this booking.',
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (check-in, complete/check-out)
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'checked_in', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to modify this booking.',
      });
    }

    booking.status = status;

    if (status === 'checked_in') {
      booking.checkInTime = new Date();
      // Slot becomes occupied
      await Slot.findByIdAndUpdate(booking.slot, {
        status: 'occupied',
        sensorStatus: 'detected',
      });
    } else if (status === 'completed' || status === 'cancelled') {
      if (status === 'completed') {
        booking.checkOutTime = new Date();
      }
      // Free the slot
      await Slot.findByIdAndUpdate(booking.slot, {
        status: 'available',
        sensorStatus: 'empty',
        currentBooking: null,
      });
    }

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('slot')
      .populate('location');

    res.json({
      success: true,
      message: `Booking status updated to '${status}' successfully!`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a booking (DELETE method)
// @route   DELETE /api/bookings/:id
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this booking.',
      });
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is already ${booking.status}.`,
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'Cancelled by user';
    await booking.save();

    // Free the slot
    await Slot.findByIdAndUpdate(booking.slot, {
      status: 'available',
      sensorStatus: 'empty',
      currentBooking: null,
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully and parking slot has been released!',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings across the system
// @route   GET /api/bookings
// @access  Private (Admin only)
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate('slot', 'slotNumber floor vehicleType')
      .populate('location', 'name code city address')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getAllBookings,
};
