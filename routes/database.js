const express = require('express');
const router = express.Router();
const db = require('../controllers/database');

// Container settings
router.post('/container/add', db.postContainerAdd);
router.post('/container/update', db.postContainerUpdate);
router.get('/container/hash', db.getContainerByHash);
router.get('/containers', db.getContainers);

// Groups
router.post('/container/group/add', db.postGroupAdd);
router.post('/container/group/delete', db.postGroupDelete);
router.post('/group/container/update', db.postGroupContainerUpdate);
router.get('/group/hash', db.getGroupByHash);
router.get('/groups', db.getGroups);

// Group/Container links
router.post('/group/container/link/add', db.postGroupContainerLinkAdd);
router.post('/group/container/link/remove', db.postGroupContainerLinkRemove);
router.get('/group/container/links', db.getGroupContainerLinks);
router.get('/group/links', db.getGroupLinks);

// Notifications
router.get('/notification/platforms', db.getNotificationPlatforms);
router.get('/notification/triggers', db.getNotificationTriggers);
router.get('/notification/trigger/enabled', db.getNotificationTriggerEnabled);
router.post('/notification/link/add', db.postNotificationLinkAdd);
router.post('/notification/link/delete', db.postNotificationLinkDelete);
router.post('/notification/link/update', db.postNotificationLinkUpdate);
router.get('/notification/link/platform/name', db.getNotificationLinkByName);
router.get('/links', db.getLinks);

// Migrations
router.get('/migrations', db.getMigrations);

// Servers
router.get('/servers', db.getServers);
router.post('/servers', db.postServers);

// Settings
router.get('/settings', db.getSettings);
router.post('/settings', db.postSettings);
router.post('/setting', db.postSetting);

module.exports = router;
