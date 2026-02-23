import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import Database from 'better-sqlite3';

const require = createRequire(import.meta.url);

let testDb;
function setupTestDb() {
    testDb = new Database(':memory:');
    testDb.exec(`
        CREATE TABLE notification_platforms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL);
        CREATE TABLE notification_links (id INTEGER PRIMARY KEY AUTOINCREMENT, platform_id INTEGER NOT NULL,
            trigger_ids TEXT NOT NULL DEFAULT '[]', platform_parameters TEXT NOT NULL DEFAULT '{}', sender_name TEXT NOT NULL DEFAULT '');
    `);
    testDb.prepare('INSERT INTO notification_platforms (name, type) VALUES (?, ?)').run('Discord', 'discord');
    testDb.prepare('INSERT INTO notification_links (platform_id, trigger_ids, platform_parameters, sender_name) VALUES (?, ?, ?, ?)')
        .run(1, '[1]', '{}', 'bot');
    return testDb;
}

const dbPath = require.resolve('../../utils/database.js');
delete require.cache[dbPath];
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: Object.assign(() => testDb, { _setInstance: () => {}, _close: () => {} }),
};

// Mock logger to avoid file system writes
const loggerPath = require.resolve('../../utils/logger.js');
delete require.cache[loggerPath];
require.cache[loggerPath] = {
    id: loggerPath, filename: loggerPath, loaded: true,
    exports: { readLog: () => '', deleteLog: () => {}, purgeGroup: () => 0, appendLog: () => {} },
};

const ctrlPath = require.resolve('../../controllers/notification.js');
delete require.cache[ctrlPath];
const { postNotificationTest } = await import('../../controllers/notification.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('Notification Controller', () => {
    beforeEach(() => { setupTestDb(); });

    it('postNotificationTest success', () => {
        const r = res();
        postNotificationTest(req({ body: { linkId: 1, name: 'test' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toContain('queued');
    });

    it('postNotificationTest 400 missing params', () => {
        const r = res();
        postNotificationTest(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postNotificationTest 404 link not found', () => {
        const r = res();
        postNotificationTest(req({ body: { linkId: 999, name: 'test' } }), r);
        expect(r.statusCode).toBe(404);
    });
});
