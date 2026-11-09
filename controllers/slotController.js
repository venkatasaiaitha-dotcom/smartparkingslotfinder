const Slot = require('../models/Slot');
const Location = require('../models/Location');

// @desc    Get all slots (with filtering by location, floor, vehicleType, status)
// @route   GET /api/slots
// @access  Public
const getSlots = async (req, res, next) => {
  try {
    const { location, floor, vehicleType, status, hasCharging } = req.query;
    const filter = {};

    if (location) filter.location = location;
    if (floor) filter.floor = floor;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;
    if (hasCharging !== undefined) filter.hasCharging = hasCharging === 'true';

    const slots = await Slot.find(filter)
      .populate('location', 'name code city address')
      .populate({
        path: 'currentBooking',
        select: 'bookingCode vehicleNumber startTime endTime driverName',
      })
      .sort({ slotNumber: 1 });

    res.json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single slot by ID
// @route   GET /api/slots/:id
// @access  Public
const getSlotById = async (req, res, next) => {
  try {
    const slot = await Slot.findById(req.params.id)
      .populate('location', 'name code city address baseRate')
      .populate('currentBooking');

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found',
      });
    }

    res.json({
      success: true,
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new parking slot
// @route   POST /api/slots
// @access  Private (Admin only)
const createSlot = async (req, res, next) => {
  try {
    const { slotNumber, location, floor, vehicleType, hourlyRate, hasCharging, isAccessible } = req.body;

    if (!slotNumber || !location) {
      return res.status(400).json({
        success: false,
        message: 'Slot number and Location ID are required.',
      });
    }

    const locationDoc = await Location.findById(location);
    if (!locationDoc) {
      return res.status(404).json({
        success: false,
        message: 'Location does not exist.',
      });
    }

    // Check if slot with same number already exists in this location
    const existingSlot = await Slot.findOne({ location, slotNumber: slotNumber.toUpperCase() });
    if (existingSlot) {
      return res.status(400).json({
        success: false,
        message: `Slot '${slotNumber}' already exists at this location.`,
      });
    }

    const slot = await Slot.create({
      slotNumber: slotNumber.toUpperCase(),
      location,
      floor: floor || 'Ground Level',
      vehicleType: vehicleType || 'car',
      hourlyRate: hourlyRate !== undefined ? hourlyRate : locationDoc.baseRate,
      hasCharging: !!hasCharging,
      isAccessible: !!isAccessible,
      status: 'available',
    });

    // Update location totalSlots count
    const total = await Slot.countDocuments({ location });
    locationDoc.totalSlots = total;
    await locationDoc.save();

    res.status(201).json({
      success: true,
      message: 'Parking slot created successfully!',
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a parking slot
// @route   PUT /api/slots/:id
// @access  Private (Admin only)
const updateSlot = async (req, res, next) => {
  try {
    let slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found',
      });
    }

    slot = await Slot.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('location', 'name code');

    res.json({
      success: true,
      message: 'Parking slot updated successfully!',
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a parking slot
// @route   DELETE /api/slots/:id
// @access  Private (Admin only)
const deleteSlot = async (req, res, next) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found',
      });
    }

    const locationId = slot.location;
    await slot.deleteOne();

    // Update location slot count
    const total = await Slot.countDocuments({ location: locationId });
    await Location.findByIdAndUpdate(locationId, { totalSlots: total });

    res.json({
      success: true,
      message: 'Parking slot deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle slot status (e.g. quick admin override / sensor trigger)
// @route   PUT /api/slots/:id/toggle
// @access  Private (Admin only)
const toggleSlotStatus = async (req, res, next) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    // Toggle cycle: available -> occupied -> maintenance -> available
    if (slot.status === 'available') {
      slot.status = 'occupied';
      slot.sensorStatus = 'detected';
    } else if (slot.status === 'occupied') {
      slot.status = 'maintenance';
      slot.sensorStatus = 'empty';
    } else {
      slot.status = 'available';
      slot.sensorStatus = 'empty';
      slot.currentBooking = null;
    }

    await slot.save();

    res.json({
      success: true,
      message: `Slot status updated to '${slot.status}'`,
      data: slot,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSlots,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
  toggleSlotStatus,
};
