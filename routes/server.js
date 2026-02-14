const express = require('express');
const router = express.Router();
const serverController = require('../controllers/server');

router.get('/ping', serverController.getServerPing);
router.get('/time', serverController.getServerTime);

module.exports = router;
