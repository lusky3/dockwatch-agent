const getDb = require('../utils/database');
const { appendLog } = require('../utils/logger');

const postNotificationTest = (req, res) => {
    const { linkId, name } = req.body;
    if (!linkId || !name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const db = getDb();
        const link = db.prepare('SELECT * FROM notification_links WHERE id = ?').get(linkId);
        if (!link) return res.status(404).json({ code: 404, error: 'Notification link not found' });

        const platform = db.prepare('SELECT * FROM notification_platforms WHERE id = ?').get(link.platform_id);
        appendLog('notification', `Test notification sent to ${platform ? platform.name : 'unknown'} via link ${linkId} (${name})`);

        res.json({ code: 200, response: { result: 'Test notification queued' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

module.exports = { postNotificationTest };
