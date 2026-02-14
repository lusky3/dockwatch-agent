const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats');

router.get('/containers', statsController.getStatsContainers);
router.get('/metrics', statsController.getStatsMetrics);
router.get('/overview', statsController.getStatsOverview);

module.exports = router;
