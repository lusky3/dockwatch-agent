const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file');

router.get('/dependency', fileController.dependency.get);
router.post('/dependency', fileController.dependency.post);
router.get('/pull', fileController.pull.get);
router.post('/pull', fileController.pull.post);
router.get('/sse', fileController.sse.get);
router.post('/sse', fileController.sse.post);
router.get('/state', fileController.state.get);
router.post('/state', fileController.state.post);
router.get('/stats', fileController.stats.get);
router.post('/stats', fileController.stats.post);

module.exports = router;
