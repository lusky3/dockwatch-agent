const fs = require('node:fs');
const path = require('node:path');

const LOG_DIR = process.env.LOG_PATH || path.join(__dirname, '..', 'config', 'logs');

function ensureDir() {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function safeName(name) {
    const base = path.basename(String(name)).replaceAll(/[^a-zA-Z0-9_-]/g, '');
    if (!base) throw new Error('Invalid name');
    return base;
}

function getLogPath(name) {
    const sanitized = safeName(name);
    const fp = path.join(LOG_DIR, `${sanitized}.log`);
    const resolved = path.resolve(fp);
    if (!resolved.startsWith(path.resolve(LOG_DIR))) throw new Error('Invalid path');
    return resolved;
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
    const prefix = safeName(group);
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith(prefix) && f.endsWith('.log'));
    for (const f of files) fs.unlinkSync(path.join(LOG_DIR, f));
    return files.length;
}

function appendLog(name, message) {
    ensureDir();
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(getLogPath(name), line, 'utf8');
}

module.exports = { readLog, deleteLog, purgeGroup, appendLog };
