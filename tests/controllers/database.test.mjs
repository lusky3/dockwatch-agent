import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
import Database from 'better-sqlite3';

const require = createRequire(import.meta.url);

// Create in-memory SQLite database for testing
let testDb;

function setupTestDb() {
    testDb = new Database(':memory:');
    testDb.pragma('journal_mode = WAL');
    testDb.pragma('foreign_keys = ON');
    testDb.exec(`
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE containers (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL UNIQUE,
            updates INTEGER DEFAULT 0, frequency TEXT DEFAULT '', restartUnhealthy INTEGER DEFAULT 0,
            disableNotifications INTEGER DEFAULT 0, shutdownDelay INTEGER DEFAULT 0, shutdownDelaySeconds INTEGER DEFAULT 0);
        CREATE TABLE groups_ (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
        CREATE TABLE group_container_links (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL,
            container_id INTEGER NOT NULL, UNIQUE(group_id, container_id));
        CREATE TABLE notification_platforms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL);
        CREATE TABLE notification_triggers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, enabled INTEGER DEFAULT 1);
        CREATE TABLE notification_links (id INTEGER PRIMARY KEY AUTOINCREMENT, platform_id INTEGER NOT NULL,
            trigger_ids TEXT NOT NULL DEFAULT '[]', platform_parameters TEXT NOT NULL DEFAULT '{}', sender_name TEXT NOT NULL DEFAULT '');
        CREATE TABLE servers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, host TEXT NOT NULL, api_key TEXT NOT NULL);
        CREATE TABLE migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')));
    `);
    testDb.prepare('INSERT INTO notification_platforms (name, type) VALUES (?, ?)').run('Discord', 'discord');
    testDb.prepare('INSERT INTO notification_triggers (name) VALUES (?)').run('Container Started');
    return testDb;
}

// Patch the database module
const dbPath = require.resolve('../../utils/database.js');
delete require.cache[dbPath];
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: Object.assign(() => testDb, { _setInstance: () => {}, _close: () => {} }),
};

const ctrlPath = require.resolve('../../controllers/database.js');
delete require.cache[ctrlPath];
const ctrl = await import('../../controllers/database.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('Database Controller', () => {
    beforeEach(() => { setupTestDb(); });
    afterAll(() => { if (testDb) testDb.close(); });

    // --- Container Settings ---
    it('postContainerAdd success', () => {
        const r = res();
        ctrl.postContainerAdd(req({ body: { hash: 'abc123' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toBe('success');
    });

    it('postContainerAdd 400 missing hash', () => {
        const r = res();
        ctrl.postContainerAdd(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postContainerUpdate success', () => {
        testDb.prepare('INSERT INTO containers (hash) VALUES (?)').run('abc');
        const r = res();
        ctrl.postContainerUpdate(req({ body: { hash: 'abc', updates: 1, frequency: 'daily' } }), r);
        expect(r.body.code).toBe(200);
    });

    it('postContainerUpdate 400 missing hash', () => {
        const r = res();
        ctrl.postContainerUpdate(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postContainerUpdate nothing to update', () => {
        testDb.prepare('INSERT INTO containers (hash) VALUES (?)').run('abc');
        const r = res();
        ctrl.postContainerUpdate(req({ body: { hash: 'abc' } }), r);
        expect(r.body.response.result).toBe('nothing to update');
    });

    it('getContainerByHash returns container', () => {
        testDb.prepare('INSERT INTO containers (hash) VALUES (?)').run('abc');
        const r = res();
        ctrl.getContainerByHash(req({ query: { hash: 'abc' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result.hash).toBe('abc');
    });

    it('getContainerByHash 400 missing hash', () => {
        const r = res();
        ctrl.getContainerByHash(req(), r);
        expect(r.statusCode).toBe(400);
    });

    it('getContainerByHash returns null for missing', () => {
        const r = res();
        ctrl.getContainerByHash(req({ query: { hash: 'nope' } }), r);
        expect(r.body.response.result).toBeNull();
    });

    it('getContainers returns all', () => {
        testDb.prepare('INSERT INTO containers (hash) VALUES (?)').run('a');
        testDb.prepare('INSERT INTO containers (hash) VALUES (?)').run('b');
        const r = res();
        ctrl.getContainers(req(), r);
        expect(r.body.response.result).toHaveLength(2);
    });

    // --- Groups ---
    it('postGroupAdd success', () => {
        const r = res();
        ctrl.postGroupAdd(req({ body: { name: 'web' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toHaveProperty('id');
    });

    it('postGroupAdd 400 missing name', () => {
        const r = res();
        ctrl.postGroupAdd(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postGroupDelete success', () => {
        const info = testDb.prepare('INSERT INTO groups_ (name) VALUES (?)').run('web');
        const r = res();
        ctrl.postGroupDelete(req({ body: { id: info.lastInsertRowid } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postGroupDelete 400 missing id', () => {
        const r = res();
        ctrl.postGroupDelete(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postGroupContainerUpdate success', () => {
        testDb.prepare('INSERT INTO groups_ (name) VALUES (?)').run('old');
        const r = res();
        ctrl.postGroupContainerUpdate(req({ body: { name: 'new', id: 1 } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postGroupContainerUpdate 400 missing params', () => {
        const r = res();
        ctrl.postGroupContainerUpdate(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('getGroupByHash returns group', () => {
        testDb.prepare('INSERT INTO groups_ (name) VALUES (?)').run('web');
        const r = res();
        ctrl.getGroupByHash(req({ query: { hash: '1' } }), r);
        expect(r.body.code).toBe(200);
    });

    it('getGroupByHash 400 missing hash', () => {
        const r = res();
        ctrl.getGroupByHash(req(), r);
        expect(r.statusCode).toBe(400);
    });

    it('getGroups returns all', () => {
        testDb.prepare('INSERT INTO groups_ (name) VALUES (?)').run('a');
        const r = res();
        ctrl.getGroups(req(), r);
        expect(r.body.response.result.length).toBeGreaterThanOrEqual(1);
    });

    // --- Links ---
    it('postGroupContainerLinkAdd success', () => {
        testDb.prepare('INSERT INTO groups_ (name) VALUES (?)').run('g');
        testDb.prepare('INSERT INTO containers (hash) VALUES (?)').run('c');
        const r = res();
        ctrl.postGroupContainerLinkAdd(req({ body: { groupId: 1, containerId: 1 } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postGroupContainerLinkAdd 400 missing params', () => {
        const r = res();
        ctrl.postGroupContainerLinkAdd(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postGroupContainerLinkRemove success', () => {
        const r = res();
        ctrl.postGroupContainerLinkRemove(req({ body: { groupId: 1, containerId: 1 } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postGroupContainerLinkRemove 400 missing params', () => {
        const r = res();
        ctrl.postGroupContainerLinkRemove(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('getGroupContainerLinks returns rows', () => {
        const r = res();
        ctrl.getGroupContainerLinks(req({ query: { group: '1' } }), r);
        expect(r.body.code).toBe(200);
    });

    it('getGroupContainerLinks 400 missing group', () => {
        const r = res();
        ctrl.getGroupContainerLinks(req(), r);
        expect(r.statusCode).toBe(400);
    });

    it('getGroupLinks returns all', () => {
        const r = res();
        ctrl.getGroupLinks(req(), r);
        expect(r.body.code).toBe(200);
    });

    // --- Notifications ---
    it('getNotificationPlatforms returns platforms', () => {
        const r = res();
        ctrl.getNotificationPlatforms(req(), r);
        expect(r.body.response.result.length).toBeGreaterThanOrEqual(1);
    });

    it('getNotificationTriggers returns triggers', () => {
        const r = res();
        ctrl.getNotificationTriggers(req(), r);
        expect(r.body.response.result.length).toBeGreaterThanOrEqual(1);
    });

    it('getNotificationTriggerEnabled returns enabled status', () => {
        const r = res();
        ctrl.getNotificationTriggerEnabled(req({ query: { trigger: '1' } }), r);
        expect(r.body.code).toBe(200);
    });

    it('getNotificationTriggerEnabled 400 missing trigger', () => {
        const r = res();
        ctrl.getNotificationTriggerEnabled(req(), r);
        expect(r.statusCode).toBe(400);
    });

    it('postNotificationLinkAdd success', () => {
        const r = res();
        ctrl.postNotificationLinkAdd(req({ body: {
            platformId: 1, triggerIds: [1], platformParameters: { url: 'http://test' }, senderName: 'bot'
        } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toHaveProperty('id');
    });

    it('postNotificationLinkAdd 400 missing params', () => {
        const r = res();
        ctrl.postNotificationLinkAdd(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postNotificationLinkDelete success', () => {
        const r = res();
        ctrl.postNotificationLinkDelete(req({ body: { linkId: 999 } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postNotificationLinkDelete 400 missing linkId', () => {
        const r = res();
        ctrl.postNotificationLinkDelete(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postNotificationLinkUpdate success', () => {
        testDb.prepare('INSERT INTO notification_links (platform_id, trigger_ids, platform_parameters, sender_name) VALUES (?, ?, ?, ?)')
            .run(1, '[]', '{}', 'bot');
        const r = res();
        ctrl.postNotificationLinkUpdate(req({ body: {
            linkId: 1, platformId: 1, triggerIds: [1], platformParameters: { url: 'x' }, senderName: 'bot2'
        } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postNotificationLinkUpdate 400 missing params', () => {
        const r = res();
        ctrl.postNotificationLinkUpdate(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('getNotificationLinkByName returns link', () => {
        testDb.prepare('INSERT INTO notification_links (platform_id, trigger_ids, platform_parameters, sender_name) VALUES (?, ?, ?, ?)')
            .run(1, '[1]', '{"url":"x"}', 'mybot');
        const r = res();
        ctrl.getNotificationLinkByName(req({ query: { name: 'mybot' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result.sender_name).toBe('mybot');
    });

    it('getNotificationLinkByName 400 missing name', () => {
        const r = res();
        ctrl.getNotificationLinkByName(req(), r);
        expect(r.statusCode).toBe(400);
    });

    it('getLinks returns all parsed', () => {
        const r = res();
        ctrl.getLinks(req(), r);
        expect(r.body.code).toBe(200);
    });

    // --- Migrations ---
    it('getMigrations returns rows', () => {
        testDb.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run('001_test');
        const r = res();
        ctrl.getMigrations(req(), r);
        expect(r.body.response.result.length).toBeGreaterThanOrEqual(1);
    });

    // --- Servers ---
    it('getServers returns all', () => {
        const r = res();
        ctrl.getServers(req(), r);
        expect(r.body.code).toBe(200);
    });

    it('postServers replaces server list', () => {
        const r = res();
        ctrl.postServers(req({ body: { serverList: [{ name: 's1', host: 'h1', apiKey: 'k1' }] } }), r);
        expect(r.body.response.result).toBe('success');
        const r2 = res();
        ctrl.getServers(req(), r2);
        expect(r2.body.response.result).toHaveLength(1);
    });

    it('postServers 400 missing serverList', () => {
        const r = res();
        ctrl.postServers(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Settings ---
    it('getSettings returns key-value object', () => {
        testDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('theme', 'dark');
        const r = res();
        ctrl.getSettings(req(), r);
        expect(r.body.response.result.theme).toBe('dark');
    });

    it('postSettings upserts multiple', () => {
        const r = res();
        ctrl.postSettings(req({ body: { newSettings: { theme: 'light', lang: 'en' } } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postSettings 400 missing newSettings', () => {
        const r = res();
        ctrl.postSettings(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postSetting upserts single', () => {
        const r = res();
        ctrl.postSetting(req({ body: { setting: 'theme', value: 'blue' } }), r);
        expect(r.body.response.result).toBe('success');
    });

    it('postSetting 400 missing params', () => {
        const r = res();
        ctrl.postSetting(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });
});
