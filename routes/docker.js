const express = require('express');
const router = express.Router();
const dockerController = require('../controllers/docker');

router.get('/processList', dockerController.getProcessList);
router.get('/container/inspect', dockerController.getContainerInspect);
router.get('/container/logs', dockerController.getContainerLogs);
router.post('/container/start', dockerController.postContainerStart);
router.post('/container/stop', dockerController.postContainerStop);
router.post('/container/restart', dockerController.postContainerRestart);

module.exports = router;
