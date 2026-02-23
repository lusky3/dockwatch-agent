const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_PATH || path.join(__dirname, '..', 'config', 'logs');

function ensureDir() {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getLogPath(name) {
    return path.join(LOG_DIR, `${name}.log`);
}

function readLog(name) {
    ensureDir();
    const fp = getLogPath(name);
    if (!fs.existsSync(fp)) return '';
    return fs.readFileSync(fp, 'utf8');
}

function deleteLog(name) {
    const fp = getLogPath(name);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

function purgeGroup(group) {
    ensureDir();
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith(group) && f.endsWith('.log'));
    for (const f of files) fs.unlinkSync(path.join(LOG_DIR, f));
    return files.length;
}

function appendLog(name, message) {
    ensureDir();
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(getLogPath(name), line, 'utf8');
}

module.exports = { readLog, deleteLog, purgeGroup, appendLog };
