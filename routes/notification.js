const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification');

router.post('/test', notificationController.postNotificationTest);

module.exports = router;
