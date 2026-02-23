import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_LOG_DIR = path.join(__dirname, '..', '_test_logs_integ');
const TEST_DB = path.join(__dirname, '..', '_test_db_srv.sqlite');

// Set env before imports
process.env.LOG_PATH = TEST_LOG_DIR;
process.env.DB_PATH = TEST_DB;

const require = createRequire(import.meta.url);

// Clear cached modules to get real implementations
for (const key of Object.keys(require.cache)) {
    if (key.includes('controllers') || key.includes('routes') || key.includes('utils') || key.includes('index.js')) {
        delete require.cache[key];
    }
}

const request = (await import('supertest')).default;
const app = (await import('../../index.js')).default;

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

function cleanup() {
    if (fs.existsSync(TEST_LOG_DIR)) fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
}

describe('Server Routes (integration)', () => {
    beforeAll(() => { cleanup(); });
    afterAll(() => {
        cleanup();
        const getDb = require('../../utils/database.js');
        getDb._close();
        for (const ext of ['', '-shm', '-wal']) {
            try { if (fs.existsSync(TEST_DB + ext)) fs.unlinkSync(TEST_DB + ext); } catch { /* */ }
        }
    });

    it('GET /api/server/ping returns version', async () => {
        const res = await request(app).get('/api/server/ping').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toMatch(/^v\d+/);
    });

    it('GET /api/server/time returns time', async () => {
        const res = await request(app).get('/api/server/time').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toHaveProperty('time');
        expect(res.body.response.result).toHaveProperty('timezone');
    });

    it('GET /api/server/log returns empty for missing log', async () => {
        const res = await request(app).get('/api/server/log?name=testlog').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toBe('');
    });

    it('GET /api/server/log 400 missing name', async () => {
        const res = await request(app).get('/api/server/log').set(auth);
        expect(res.status).toBe(400);
    });

    it('POST /api/server/task/run triggers task', async () => {
        const res = await request(app).post('/api/server/task/run').set(auth)
            .send({ task: 'updateCheck' });
        expect(res.status).toBe(200);
        expect(res.body.response.result).toContain('updateCheck');
    });

    it('POST /api/server/task/run 400 missing task', async () => {
        const res = await request(app).post('/api/server/task/run').set(auth).send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/server/log/delete deletes log', async () => {
        const res = await request(app).post('/api/server/log/delete').set(auth)
            .send({ log: 'testlog' });
        expect(res.status).toBe(200);
    });

    it('POST /api/server/log/delete 400 missing log', async () => {
        const res = await request(app).post('/api/server/log/delete').set(auth).send({});
        expect(res.status).toBe(400);
    });

    it('POST /api/server/log/purge purges group', async () => {
        const res = await request(app).post('/api/server/log/purge').set(auth)
            .send({ group: 'tasks' });
        expect(res.status).toBe(200);
        expect(res.body.response.result).toMatch(/Purged \d+ log/);
    });

    it('POST /api/server/log/purge 400 missing group', async () => {
        const res = await request(app).post('/api/server/log/purge').set(auth).send({});
        expect(res.status).toBe(400);
    });

    it('GET /api/server/log returns log after task run', async () => {
        // Run a task first to create a log entry
        await request(app).post('/api/server/task/run').set(auth)
            .send({ task: 'testTask' });
        const res = await request(app).get('/api/server/log?name=tasks').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toContain('testTask');
    });

    // Root landing page
    it('GET / returns HTML landing page', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Dockwatch Agent');
        expect(res.text).toContain('<!DOCTYPE html>');
    });
});
