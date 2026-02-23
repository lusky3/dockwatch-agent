const pkg = require('../package.json');
const { readLog, deleteLog, purgeGroup, appendLog } = require('../utils/logger');

const getServerPing = (req, res) => {
    const version = `v${pkg.version}`;
    res.json({
        code: 200,
        response: {
            result: `${version} - ${version}`
        }
    });
};

const getServerTime = (req, res) => {
    const now = new Date();
    res.json({
        code: 200,
        response: {
            result: {
                time: now.toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        }
    });
};

const getServerLog = (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const contents = readLog(name);
        res.json({ code: 200, response: { result: contents } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postLogDelete = (req, res) => {
    const { log } = req.body;
    if (!log) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        deleteLog(log);
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postLogPurge = (req, res) => {
    const { group } = req.body;
    if (!group) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const count = purgeGroup(group);
        res.json({ code: 200, response: { result: `Purged ${count} log(s)` } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postTaskRun = (req, res) => {
    const { task } = req.body;
    if (!task) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        appendLog('tasks', `Task triggered: ${task}`);
        res.json({ code: 200, response: { result: `Task '${task}' triggered` } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

module.exports = {
    getServerPing, getServerTime,
    getServerLog, postLogDelete, postLogPurge, postTaskRun
};
