const express = require('express');
const router = express.Router();
const sc = require('../controllers/server');

router.get('/ping', sc.getServerPing);
router.get('/time', sc.getServerTime);
router.get('/log', sc.getServerLog);
router.post('/log/delete', sc.postLogDelete);
router.post('/log/purge', sc.postLogPurge);
router.post('/task/run', sc.postTaskRun);

module.exports = router;
