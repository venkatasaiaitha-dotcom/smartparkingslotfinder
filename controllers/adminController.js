const Location = require('../models/Location');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Get system-wide metrics and dashboard KPIs
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getAdminStats = async (req, res, next) => {
  try {
    const totalLocations = await Location.countDocuments();
    const totalSlots = await Slot.countDocuments();
    const availableSlots = await Slot.countDocuments({ status: 'available' });
    const occupiedSlots = await Slot.countDocuments({ status: 'occupied' });
    const reservedSlots = await Slot.countDocuments({ status: 'reserved' });
    const maintenanceSlots = await Slot.countDocuments({ status: 'maintenance' });

    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({
      status: { $in: ['confirmed', 'checked_in'] },
    });

    // Calculate total revenue from non-cancelled bookings
    const revenueResult = await Booking.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Slot distribution by vehicle type
    const slotsByType = await Slot.aggregate([
      { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
    ]);

    // Recent 5 bookings
    const recentBookings = await Booking.find()
      .populate('user', 'name email')
      .populate('slot', 'slotNumber')
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const occupancyRate = totalSlots > 0 ? Math.round(((occupiedSlots + reservedSlots) / totalSlots) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalLocations,
        totalSlots,
        availableSlots,
        occupiedSlots,
        reservedSlots,
        maintenanceSlots,
        totalUsers,
        totalBookings,
        activeBookings,
        totalRevenue,
        occupancyRate,
        slotsByType,
        recentBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate smart parking sensor hardware trigger (IoT sensor toggle)
// @route   POST /api/admin/simulate-sensor
// @access  Private (Admin only)
const simulateSensor = async (req, res, next) => {
  try {
    const { slotId, event } = req.body; // event: 'car_arrived' | 'car_departed'

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    if (event === 'car_arrived') {
      slot.sensorStatus = 'detected';
      slot.status = 'occupied';
    } else {
      slot.sensorStatus = 'empty';
      slot.status = 'available';
      slot.currentBooking = null;
    }

    await slot.save();

    res.json({
      success: true,
      message: `Hardware Sensor event '${event}' simulated for slot ${slot.slotNumber}`,
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  simulateSensor,
};
