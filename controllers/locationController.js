const Location = require('../models/Location');
const Slot = require('../models/Slot');

// @desc    Get all parking locations with real-time slot statistics
// @route   GET /api/locations
// @access  Public
const getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });

    // Aggregate real-time slot counts for each location
    const locationsWithStats = await Promise.all(
      locations.map(async (loc) => {
        const slots = await Slot.find({ location: loc._id });
        const total = slots.length;
        const available = slots.filter((s) => s.status === 'available').length;
        const occupied = slots.filter((s) => s.status === 'occupied').length;
        const reserved = slots.filter((s) => s.status === 'reserved').length;
        const maintenance = slots.filter((s) => s.status === 'maintenance').length;

        return {
          ...loc.toObject(),
          totalSlots: total,
          availableSlots: available,
          occupiedSlots: occupied,
          reservedSlots: reserved,
          maintenanceSlots: maintenance,
          occupancyRate: total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0,
        };
      })
    );

    res.json({
      success: true,
      count: locationsWithStats.length,
      data: locationsWithStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single location by ID with its slots
// @route   GET /api/locations/:id
// @access  Public
const getLocationById = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Parking location not found',
      });
    }

    const slots = await Slot.find({ location: location._id }).sort({ slotNumber: 1 });

    const total = slots.length;
    const available = slots.filter((s) => s.status === 'available').length;
    const occupied = slots.filter((s) => s.status === 'occupied').length;
    const reserved = slots.filter((s) => s.status === 'reserved').length;

    res.json({
      success: true,
      data: {
        ...location.toObject(),
        totalSlots: total,
        availableSlots: available,
        occupiedSlots: occupied,
        reservedSlots: reserved,
        slots,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new parking location
// @route   POST /api/locations
// @access  Private (Admin only)
const createLocation = async (req, res, next) => {
  try {
    const { name, code, address, city, coordinates, baseRate, operatingHours, description, amenities, image } = req.body;

    if (!name || !code || !address || !coordinates || coordinates.lat === undefined || coordinates.lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, address, and coordinates (lat, lng) are required.',
      });
    }

    const location = await Location.create({
      name,
      code,
      address,
      city: city || 'Hyderabad',
      coordinates: {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng),
      },
      baseRate: baseRate || 40,
      operatingHours: operatingHours || '24/7 Open',
      description: description || 'Smart monitored parking facility.',
      amenities: amenities || ['CCTV Surveillance', 'Covered Parking', 'EV Fast Charging'],
      image: image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    });

    res.status(201).json({
      success: true,
      message: 'Parking location created successfully!',
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a parking location
// @route   PUT /api/locations/:id
// @access  Private (Admin only)
const updateLocation = async (req, res, next) => {
  try {
    let location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Parking location not found',
      });
    }

    location = await Location.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Parking location updated successfully!',
      data: location,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a parking location and its slots
// @route   DELETE /api/locations/:id
// @access  Private (Admin only)
const deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Parking location not found',
      });
    }

    // Delete associated slots
    await Slot.deleteMany({ location: location._id });
    await location.deleteOne();

    res.json({
      success: true,
      message: 'Parking location and associated slots deleted successfully!',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
};
