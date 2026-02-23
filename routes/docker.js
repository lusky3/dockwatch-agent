const express = require('express');
const router = express.Router();
const dc = require('../controllers/docker');

// Existing
router.get('/processList', dc.getProcessList);
router.get('/container/inspect', dc.getContainerInspect);
router.get('/container/logs', dc.getContainerLogs);
router.post('/container/start', dc.postContainerStart);
router.post('/container/stop', dc.postContainerStop);
router.post('/container/restart', dc.postContainerRestart);

// New
router.post('/container/kill', dc.postContainerKill);
router.post('/container/pull', dc.postContainerPull);
router.post('/container/remove', dc.postContainerRemove);
router.post('/container/create', dc.postContainerCreate);
router.get('/container/ports', dc.getContainerPorts);
router.get('/create/compose', dc.getCreateCompose);
router.get('/create/run', dc.getCreateRun);
router.post('/image/remove', dc.postImageRemove);
router.get('/images/sizes', dc.getImagesSizes);
router.get('/networks', dc.getNetworks);
router.post('/network/remove', dc.postNetworkRemove);
router.get('/orphans/containers', dc.getOrphansContainers);
router.get('/orphans/networks', dc.getOrphansNetworks);
router.get('/orphans/volumes', dc.getOrphansVolumes);
router.get('/permissions', dc.getPermissions);
router.get('/stats', dc.getStats);
router.get('/unused/containers', dc.getUnusedContainers);
router.post('/volume/remove', dc.postVolumeRemove);

module.exports = router;
