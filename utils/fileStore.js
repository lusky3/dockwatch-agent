const fs = require('node:fs');
const path = require('node:path');

const CONFIG_DIR = process.env.CONFIG_PATH || path.join(__dirname, '..', 'config');

const FILES = ['dependency', 'pull', 'sse', 'state', 'stats'];

function ensureDir() {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function filePath(name) {
    if (!FILES.includes(name)) throw new Error('Invalid file name');
    const fp = path.join(CONFIG_DIR, `${path.basename(name)}.json`);
    const resolved = path.resolve(fp);
    if (!resolved.startsWith(path.resolve(CONFIG_DIR))) throw new Error('Invalid path');
    return resolved;
}

function readJsonFile(name) {
    ensureDir();
    const fp = filePath(name);
    if (!fs.existsSync(fp)) return {};
    try {
        return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch {
        return {};
    }
}

function writeJsonFile(name, contents) {
    ensureDir();
    fs.writeFileSync(filePath(name), JSON.stringify(contents, null, 2), 'utf8');
}

module.exports = { readJsonFile, writeJsonFile, FILES };
