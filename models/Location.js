const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide location name'],
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please provide address'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Please provide city'],
      trim: true,
      default: 'Hyderabad',
    },
    coordinates: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
      },
    },
    totalSlots: {
      type: Number,
      default: 0,
    },
    baseRate: {
      type: Number,
      required: [true, 'Base hourly rate is required'],
      default: 40,
    },
    operatingHours: {
      type: String,
      default: '24/7 Open',
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    },
    description: {
      type: String,
      default: 'Multi-level smart parking facility with automated sensor monitoring.',
    },
    amenities: {
      type: [String],
      default: ['CCTV Surveillance', 'Covered Parking', 'EV Fast Charging', 'Security Guards'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Location', locationSchema);
