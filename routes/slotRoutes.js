const express = require('express');
const router = express.Router();
const {
  getSlots,
  getSlotById,
  createSlot,
  updateSlot,
  deleteSlot,
  toggleSlotStatus,
} = require('../controllers/slotController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
  .get(getSlots)
  .post(protect, admin, createSlot);

router.route('/:id')
  .get(getSlotById)
  .put(protect, admin, updateSlot)
  .delete(protect, admin, deleteSlot);

router.put('/:id/toggle', protect, admin, toggleSlotStatus);

module.exports = router;
