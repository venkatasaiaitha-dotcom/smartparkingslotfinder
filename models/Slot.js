const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    slotNumber: {
      type: String,
      required: [true, 'Slot number is required (e.g., A-01)'],
      trim: true,
      uppercase: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Parking location reference is required'],
    },
    floor: {
      type: String,
      required: [true, 'Floor or zone is required'],
      default: 'Ground Level',
    },
    vehicleType: {
      type: String,
      enum: ['car', 'bike', 'suv', 'ev', 'accessible'],
      default: 'car',
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      default: 40,
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'occupied', 'maintenance'],
      default: 'available',
    },
    hasCharging: {
      type: Boolean,
      default: false,
    },
    isAccessible: {
      type: Boolean,
      default: false,
    },
    sensorStatus: {
      type: String,
      enum: ['empty', 'detected'],
      default: 'empty',
    },
    currentBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a slotNumber is unique per location
slotSchema.index({ location: 1, slotNumber: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);
