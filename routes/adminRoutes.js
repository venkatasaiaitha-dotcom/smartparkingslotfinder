const express = require('express');
const router = express.Router();
const { getAdminStats, simulateSensor } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.get('/stats', protect, admin, getAdminStats);
router.post('/simulate-sensor', protect, admin, simulateSensor);

module.exports = router;
