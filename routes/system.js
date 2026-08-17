const express = require('express');
const router = express.Router();
const sc = require('../controllers/system');

router.get('/memcache/get', sc.getMemcache);
router.post('/memcache/set', sc.postMemcacheSet);

module.exports = router;
