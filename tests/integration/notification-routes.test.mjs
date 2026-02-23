import { describe, it, expect, afterAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '..', '_test_db_notif.sqlite');
const TEST_LOG_DIR = path.join(__dirname, '..', '_test_logs_notif');

process.env.DB_PATH = TEST_DB;
process.env.LOG_PATH = TEST_LOG_DIR;

const require = createRequire(import.meta.url);

for (const key of Object.keys(require.cache)) {
    if (key.includes('controllers') || key.includes('routes') || key.includes('utils') || key.includes('index.js')) {
        delete require.cache[key];
    }
}

const request = (await import('supertest')).default;
const app = (await import('../../index.js')).default;

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

describe('Notification Routes (integration)', () => {
    afterAll(() => {
        const getDb = require('../../utils/database.js');
        getDb._close();
        for (const ext of ['', '-shm', '-wal']) {
            try { if (fs.existsSync(TEST_DB + ext)) fs.unlinkSync(TEST_DB + ext); } catch { /* */ }
        }
        if (fs.existsSync(TEST_LOG_DIR)) fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    });

    it('POST /api/notification/test 400 missing params', async () => {
        const res = await request(app).post('/api/notification/test').set(auth).send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/notification/test 404 link not found', async () => {
        const res = await request(app).post('/api/notification/test').set(auth)
            .send({ linkId: 999, name: 'test' });
        expect(res.status).toBe(404);
    });

    it('POST /api/notification/test success with real link', async () => {
        // First create a notification link via database route
        const addRes = await request(app).post('/api/database/notification/link/add').set(auth)
            .send({
                platformId: 1,
                triggerIds: [1],
                platformParameters: { url: 'http://test' },
                senderName: 'testbot'
            });
        expect(addRes.status).toBe(200);
        const linkId = addRes.body.response.result.id;

        const res = await request(app).post('/api/notification/test').set(auth)
            .send({ linkId, name: 'test' });
        expect(res.status).toBe(200);
        expect(res.body.response.result).toContain('queued');
    });
});
