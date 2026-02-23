const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'config', 'dockwatch.db');

let _db = null;

function getDb() {
    if (!_db) {
        const fs = require('fs');
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        _db = new Database(DB_PATH);
        _db.pragma('journal_mode = WAL');
        _db.pragma('foreign_keys = ON');
        runMigrations(_db);
    }
    return _db;
}

function runMigrations(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS containers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash TEXT NOT NULL UNIQUE,
            updates INTEGER DEFAULT 0,
            frequency TEXT DEFAULT '',
            restartUnhealthy INTEGER DEFAULT 0,
            disableNotifications INTEGER DEFAULT 0,
            shutdownDelay INTEGER DEFAULT 0,
            shutdownDelaySeconds INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS groups_ (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_container_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            container_id INTEGER NOT NULL,
            FOREIGN KEY (group_id) REFERENCES groups_(id) ON DELETE CASCADE,
            FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
            UNIQUE(group_id, container_id)
        );

        CREATE TABLE IF NOT EXISTS notification_platforms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notification_triggers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            enabled INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS notification_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform_id INTEGER NOT NULL,
            trigger_ids TEXT NOT NULL DEFAULT '[]',
            platform_parameters TEXT NOT NULL DEFAULT '{}',
            sender_name TEXT NOT NULL DEFAULT '',
            FOREIGN KEY (platform_id) REFERENCES notification_platforms(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            host TEXT NOT NULL,
            api_key TEXT NOT NULL
        );
    `);

    // Seed default settings if empty
    const count = db.prepare('SELECT COUNT(*) as c FROM settings').get();
    if (count.c === 0) {
        const defaults = {
            apiKey: process.env.DOCKWATCH_API_KEY || 'dockwatch',
            theme: 'dark',
            updateCheckFrequency: '*/30 * * * *',
            autoUpdate: '0',
            notificationsEnabled: '1',
            pruneImages: '0'
        };
        const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
        for (const [k, v] of Object.entries(defaults)) {
            insert.run(k, v);
        }
    }

    // Seed default notification platforms if empty
    const platCount = db.prepare('SELECT COUNT(*) as c FROM notification_platforms').get();
    if (platCount.c === 0) {
        const platforms = [
            { name: 'Discord', type: 'discord' },
            { name: 'Telegram', type: 'telegram' },
            { name: 'Slack', type: 'slack' },
            { name: 'Pushover', type: 'pushover' },
            { name: 'Email', type: 'email' },
            { name: 'Gotify', type: 'gotify' },
            { name: 'Ntfy', type: 'ntfy' },
            { name: 'Webhook', type: 'webhook' }
        ];
        const ins = db.prepare('INSERT INTO notification_platforms (name, type) VALUES (?, ?)');
        for (const p of platforms) ins.run(p.name, p.type);
    }

    // Seed default notification triggers if empty
    const trigCount = db.prepare('SELECT COUNT(*) as c FROM notification_triggers').get();
    if (trigCount.c === 0) {
        const triggers = [
            'Container Started', 'Container Stopped', 'Container Unhealthy',
            'Container Updated', 'Update Available', 'Container Error'
        ];
        const ins = db.prepare('INSERT INTO notification_triggers (name) VALUES (?)');
        for (const t of triggers) ins.run(t);
    }

    // Record migration
    db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run('001_initial_schema');
}

// For testing
getDb._setInstance = (instance) => { _db = instance; };
getDb._close = () => { if (_db) { _db.close(); _db = null; } };

module.exports = getDb;
