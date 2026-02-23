const express = require('express');
const router = express.Router();
const dockerAPIController = require('../controllers/dockerAPI');

router.get('/container/create', dockerAPIController.getContainerCreate);

module.exports = router;
