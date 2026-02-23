import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.join(__dirname, '..', '_test_db_ext.sqlite');

describe('Database Utility - Extended coverage', () => {
    let getDb;

    beforeAll(async () => {
        // Clean up before test
        for (const ext of ['', '-shm', '-wal']) {
            try { if (fs.existsSync(TEST_DB_PATH + ext)) fs.unlinkSync(TEST_DB_PATH + ext); } catch { /* ignore */ }
        }
        process.env.DB_PATH = TEST_DB_PATH;

        // Force fresh import
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const dbPath = require.resolve('../../utils/database.js');
        delete require.cache[dbPath];
        getDb = (await import('../../utils/database.js?ext')).default;
    });

    afterAll(() => {
        if (getDb) getDb._close();
        for (const ext of ['', '-shm', '-wal']) {
            try { if (fs.existsSync(TEST_DB_PATH + ext)) fs.unlinkSync(TEST_DB_PATH + ext); } catch { /* ignore */ }
        }
    });

    it('getDb returns a working database', () => {
        const db = getDb();
        expect(db).toBeDefined();
        expect(typeof db.prepare).toBe('function');
    });

    it('does not re-seed settings if already populated', () => {
        const db = getDb();
        const count1 = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
        // Close and reopen to trigger migrations again
        getDb._close();
        const db2 = getDb();
        const count2 = db2.prepare('SELECT COUNT(*) as c FROM settings').get().c;
        expect(count2).toBe(count1);
    });

    it('does not re-seed platforms if already populated', () => {
        const db = getDb();
        const count = db.prepare('SELECT COUNT(*) as c FROM notification_platforms').get().c;
        expect(count).toBe(8);
    });

    it('does not re-seed triggers if already populated', () => {
        const db = getDb();
        const count = db.prepare('SELECT COUNT(*) as c FROM notification_triggers').get().c;
        expect(count).toBe(6);
    });

    it('migration is idempotent', () => {
        const db = getDb();
        const migrations = db.prepare('SELECT * FROM migrations').all();
        expect(migrations.filter(m => m.name === '001_initial_schema')).toHaveLength(1);
    });
});
