const getDb = require('../utils/database');

// --- Container Settings ---

const postContainerAdd = (req, res) => {
    const { hash, updates, frequency, restartUnhealthy, disableNotifications, shutdownDelay, shutdownDelaySeconds } = req.body;
    if (!hash) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const db = getDb();
        db.prepare(`INSERT INTO containers (hash, updates, frequency, restartUnhealthy, disableNotifications, shutdownDelay, shutdownDelaySeconds)
            VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
            hash, updates || 0, frequency || '', restartUnhealthy || 0,
            disableNotifications || 0, shutdownDelay || 0, shutdownDelaySeconds || 0
        );
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerUpdate = (req, res) => {
    const { hash, updates, frequency, restartUnhealthy, disableNotifications, shutdownDelay, shutdownDelaySeconds } = req.body;
    if (!hash) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const db = getDb();
        const fields = [];
        const values = [];
        if (updates !== undefined) { fields.push('updates = ?'); values.push(updates); }
        if (frequency !== undefined) { fields.push('frequency = ?'); values.push(frequency); }
        if (restartUnhealthy !== undefined) { fields.push('restartUnhealthy = ?'); values.push(restartUnhealthy); }
        if (disableNotifications !== undefined) { fields.push('disableNotifications = ?'); values.push(disableNotifications); }
        if (shutdownDelay !== undefined) { fields.push('shutdownDelay = ?'); values.push(shutdownDelay); }
        if (shutdownDelaySeconds !== undefined) { fields.push('shutdownDelaySeconds = ?'); values.push(shutdownDelaySeconds); }
        if (fields.length === 0) return res.json({ code: 200, response: { result: 'nothing to update' } });
        values.push(hash);
        db.prepare(`UPDATE containers SET ${fields.join(', ')} WHERE hash = ?`).run(...values);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getContainerByHash = (req, res) => {
    const { hash } = req.query;
    if (!hash) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const row = getDb().prepare('SELECT * FROM containers WHERE hash = ?').get(hash);
        res.json({ code: 200, response: { result: row || null } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getContainers = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM containers').all();
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- Groups ---

const postGroupAdd = (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const info = getDb().prepare('INSERT INTO groups_ (name) VALUES (?)').run(name);
        res.json({ code: 200, response: { result: { id: info.lastInsertRowid } } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postGroupDelete = (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        getDb().prepare('DELETE FROM groups_ WHERE id = ?').run(id);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postGroupContainerUpdate = (req, res) => {
    const { name, id } = req.body;
    if (!name || !id) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        getDb().prepare('UPDATE groups_ SET name = ? WHERE id = ?').run(name, id);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getGroupByHash = (req, res) => {
    const { hash } = req.query;
    if (!hash) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const row = getDb().prepare('SELECT * FROM groups_ WHERE id = ?').get(hash);
        res.json({ code: 200, response: { result: row || null } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getGroups = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM groups_').all();
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- Group/Container Links ---

const postGroupContainerLinkAdd = (req, res) => {
    const { groupId, containerId } = req.body;
    if (!groupId || !containerId) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        getDb().prepare('INSERT INTO group_container_links (group_id, container_id) VALUES (?, ?)').run(groupId, containerId);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postGroupContainerLinkRemove = (req, res) => {
    const { groupId, containerId } = req.body;
    if (!groupId || !containerId) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        getDb().prepare('DELETE FROM group_container_links WHERE group_id = ? AND container_id = ?').run(groupId, containerId);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getGroupContainerLinks = (req, res) => {
    const { group } = req.query;
    if (!group) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const rows = getDb().prepare(
            'SELECT c.* FROM containers c JOIN group_container_links gcl ON c.id = gcl.container_id WHERE gcl.group_id = ?'
        ).all(group);
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getGroupLinks = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM group_container_links').all();
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- Notifications ---

const getNotificationPlatforms = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM notification_platforms').all();
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getNotificationTriggers = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM notification_triggers').all();
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getNotificationTriggerEnabled = (req, res) => {
    const { trigger } = req.query;
    if (!trigger) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const row = getDb().prepare('SELECT enabled FROM notification_triggers WHERE id = ?').get(trigger);
        res.json({ code: 200, response: { result: row ? row.enabled : null } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postNotificationLinkAdd = (req, res) => {
    const { platformId, triggerIds, platformParameters, senderName } = req.body;
    if (!platformId || !triggerIds || !platformParameters || !senderName) {
        return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    }
    try {
        const info = getDb().prepare(
            'INSERT INTO notification_links (platform_id, trigger_ids, platform_parameters, sender_name) VALUES (?, ?, ?, ?)'
        ).run(platformId, JSON.stringify(triggerIds), JSON.stringify(platformParameters), senderName);
        res.json({ code: 200, response: { result: { id: info.lastInsertRowid } } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postNotificationLinkDelete = (req, res) => {
    const { linkId } = req.body;
    if (!linkId) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        getDb().prepare('DELETE FROM notification_links WHERE id = ?').run(linkId);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postNotificationLinkUpdate = (req, res) => {
    const { linkId, platformId, triggerIds, platformParameters, senderName } = req.body;
    if (!linkId || !platformId || !triggerIds || !platformParameters || !senderName) {
        return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    }
    try {
        getDb().prepare(
            'UPDATE notification_links SET platform_id = ?, trigger_ids = ?, platform_parameters = ?, sender_name = ? WHERE id = ?'
        ).run(platformId, JSON.stringify(triggerIds), JSON.stringify(platformParameters), senderName, linkId);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getNotificationLinkByName = (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const row = getDb().prepare('SELECT * FROM notification_links WHERE sender_name = ?').get(name);
        if (row) {
            row.trigger_ids = JSON.parse(row.trigger_ids);
            row.platform_parameters = JSON.parse(row.platform_parameters);
        }
        res.json({ code: 200, response: { result: row || null } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getLinks = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM notification_links').all();
        const parsed = rows.map(r => ({
            ...r,
            trigger_ids: JSON.parse(r.trigger_ids),
            platform_parameters: JSON.parse(r.platform_parameters)
        }));
        res.json({ code: 200, response: { result: parsed } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- Migrations ---

const getMigrations = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM migrations').all();
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- Servers ---

const getServers = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM servers').all();
        res.json({ code: 200, response: { result: rows } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postServers = (req, res) => {
    const { serverList } = req.body;
    if (!serverList) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const db = getDb();
        db.prepare('DELETE FROM servers').run();
        const ins = db.prepare('INSERT INTO servers (name, host, api_key) VALUES (?, ?, ?)');
        const insertMany = db.transaction((list) => {
            for (const s of list) ins.run(s.name || '', s.host || '', s.apiKey || s.api_key || '');
        });
        insertMany(Array.isArray(serverList) ? serverList : []);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- Settings ---

const getSettings = (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM settings').all();
        const obj = {};
        for (const r of rows) obj[r.key] = r.value;
        res.json({ code: 200, response: { result: obj } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postSettings = (req, res) => {
    const { newSettings } = req.body;
    if (!newSettings) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const db = getDb();
        const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
        const updateAll = db.transaction((settings) => {
            for (const [k, v] of Object.entries(settings)) upsert.run(k, String(v));
        });
        updateAll(newSettings);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postSetting = (req, res) => {
    const { setting, value } = req.body;
    if (!setting || value === undefined) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
            .run(setting, String(value));
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

module.exports = {
    postContainerAdd, postContainerUpdate, getContainerByHash, getContainers,
    postGroupAdd, postGroupDelete, postGroupContainerUpdate, getGroupByHash, getGroups,
    postGroupContainerLinkAdd, postGroupContainerLinkRemove, getGroupContainerLinks, getGroupLinks,
    getNotificationPlatforms, getNotificationTriggers, getNotificationTriggerEnabled,
    postNotificationLinkAdd, postNotificationLinkDelete, postNotificationLinkUpdate,
    getNotificationLinkByName, getLinks,
    getMigrations, getServers, postServers,
    getSettings, postSettings, postSetting
};
