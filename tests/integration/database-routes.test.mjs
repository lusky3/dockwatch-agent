import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = path.join(__dirname, '..', '_test_db_integ.sqlite');

// Clean up and set env before any imports
for (const ext of ['', '-shm', '-wal']) {
    try { if (fs.existsSync(TEST_DB + ext)) fs.unlinkSync(TEST_DB + ext); } catch { /* */ }
}
process.env.DB_PATH = TEST_DB;

const require = createRequire(import.meta.url);

// Clear all cached modules
for (const key of Object.keys(require.cache)) {
    if (key.includes('controllers') || key.includes('routes') || key.includes('utils') || key.includes('index.js')) {
        delete require.cache[key];
    }
}

const request = (await import('supertest')).default;
const app = (await import('../../index.js')).default;

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

describe('Database Routes (integration)', () => {
    afterAll(() => {
        const getDb = require('../../utils/database.js');
        getDb._close();
        for (const ext of ['', '-shm', '-wal']) {
            try { if (fs.existsSync(TEST_DB + ext)) fs.unlinkSync(TEST_DB + ext); } catch { /* */ }
        }
    });

    // Settings
    it('GET /api/database/settings returns settings', async () => {
        const res = await request(app).get('/api/database/settings').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toHaveProperty('apiKey');
    });

    it('POST /api/database/settings updates settings', async () => {
        const res = await request(app).post('/api/database/settings').set(auth)
            .send({ newSettings: { theme: 'light' } });
        expect(res.status).toBe(200);
    });

    it('POST /api/database/setting updates single setting', async () => {
        const res = await request(app).post('/api/database/setting').set(auth)
            .send({ setting: 'theme', value: 'dark' });
        expect(res.status).toBe(200);
    });

    // Containers
    it('POST /api/database/container/add creates container', async () => {
        const res = await request(app).post('/api/database/container/add').set(auth)
            .send({ hash: 'test123', updates: 0 });
        expect(res.status).toBe(200);
    });

    it('POST /api/database/container/update updates container', async () => {
        const res = await request(app).post('/api/database/container/update').set(auth)
            .send({ hash: 'test123', updates: 1, frequency: 'daily' });
        expect(res.status).toBe(200);
    });

    it('GET /api/database/container/hash returns container', async () => {
        const res = await request(app).get('/api/database/container/hash?hash=test123').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result.hash).toBe('test123');
    });

    it('GET /api/database/containers returns all', async () => {
        const res = await request(app).get('/api/database/containers').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result.length).toBeGreaterThanOrEqual(1);
    });

    // Groups
    it('POST /api/database/container/group/add creates group', async () => {
        const res = await request(app).post('/api/database/container/group/add').set(auth)
            .send({ name: 'web' });
        expect(res.status).toBe(200);
        expect(res.body.response.result).toHaveProperty('id');
    });

    it('GET /api/database/groups returns groups', async () => {
        const res = await request(app).get('/api/database/groups').set(auth);
        expect(res.status).toBe(200);
    });

    // Notifications
    it('GET /api/database/notification/platforms returns platforms', async () => {
        const res = await request(app).get('/api/database/notification/platforms').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result.length).toBe(8);
    });

    it('GET /api/database/notification/triggers returns triggers', async () => {
        const res = await request(app).get('/api/database/notification/triggers').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result.length).toBe(6);
    });

    // Servers
    it('POST /api/database/servers replaces server list', async () => {
        const res = await request(app).post('/api/database/servers').set(auth)
            .send({ serverList: [{ name: 's1', host: 'h1', apiKey: 'k1' }] });
        expect(res.status).toBe(200);
    });

    it('GET /api/database/servers returns servers', async () => {
        const res = await request(app).get('/api/database/servers').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toHaveLength(1);
    });

    // Migrations
    it('GET /api/database/migrations returns migrations', async () => {
        const res = await request(app).get('/api/database/migrations').set(auth);
        expect(res.status).toBe(200);
    });
});
