import { describe, it, expect, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, '..', '_test_db.sqlite');

// Clean up before test
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
process.env.DB_PATH = TEST_DB_PATH;

// Force fresh import
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const dbPath = require.resolve('../../utils/database.js');
delete require.cache[dbPath];
const getDb = (await import('../../utils/database.js')).default;

describe('Database Utility', () => {
    afterAll(() => {
        getDb._close();
        // On Windows the file may be locked; ignore cleanup errors
        try { if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH); } catch { /* ignore */ }
    });

    it('getDb returns a database instance', () => {
        const db = getDb();
        expect(db).toBeDefined();
        expect(typeof db.prepare).toBe('function');
    });

    it('getDb returns same instance (singleton)', () => {
        const db1 = getDb();
        const db2 = getDb();
        expect(db1).toBe(db2);
    });

    it('creates all required tables', () => {
        const db = getDb();
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
        const names = tables.map(t => t.name);
        expect(names).toContain('settings');
        expect(names).toContain('containers');
        expect(names).toContain('groups_');
        expect(names).toContain('group_container_links');
        expect(names).toContain('notification_platforms');
        expect(names).toContain('notification_triggers');
        expect(names).toContain('notification_links');
        expect(names).toContain('servers');
        expect(names).toContain('migrations');
    });

    it('seeds default settings', () => {
        const db = getDb();
        const settings = db.prepare('SELECT * FROM settings').all();
        expect(settings.length).toBeGreaterThan(0);
        const keys = settings.map(s => s.key);
        expect(keys).toContain('apiKey');
        expect(keys).toContain('theme');
    });

    it('seeds default notification platforms', () => {
        const db = getDb();
        const platforms = db.prepare('SELECT * FROM notification_platforms').all();
        expect(platforms.length).toBe(8);
    });

    it('seeds default notification triggers', () => {
        const db = getDb();
        const triggers = db.prepare('SELECT * FROM notification_triggers').all();
        expect(triggers.length).toBe(6);
    });

    it('records initial migration', () => {
        const db = getDb();
        const migrations = db.prepare('SELECT * FROM migrations').all();
        expect(migrations.some(m => m.name === '001_initial_schema')).toBe(true);
    });

    it('_setInstance replaces singleton', () => {
        const fake = { fake: true };
        getDb._setInstance(fake);
        // Reset back
        getDb._setInstance(null);
    });

    it('_close closes and resets', () => {
        // Get a fresh instance first
        const db = getDb();
        expect(db).toBeDefined();
        getDb._close();
        // Next call should create a new instance
        const db2 = getDb();
        expect(db2).toBeDefined();
    });
});
