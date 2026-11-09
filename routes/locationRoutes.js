const express = require('express');
const router = express.Router();
const {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
} = require('../controllers/locationController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .get(getLocations)
  .post(protect, admin, createLocation);

router.route('/:id')
  .get(getLocationById)
  .put(protect, admin, updateLocation)
  .delete(protect, admin, deleteLocation);

module.exports = router;
