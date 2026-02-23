import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_DIR = path.join(__dirname, '..', '_test_config_integ');
const TEST_DB = path.join(__dirname, '..', '_test_db_file.sqlite');

process.env.CONFIG_PATH = TEST_CONFIG_DIR;
process.env.DB_PATH = TEST_DB;

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

describe('File Routes (integration)', () => {
    afterAll(() => {
        if (fs.existsSync(TEST_CONFIG_DIR)) fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
        const getDb = require('../../utils/database.js');
        getDb._close();
        for (const ext of ['', '-shm', '-wal']) {
            try { if (fs.existsSync(TEST_DB + ext)) fs.unlinkSync(TEST_DB + ext); } catch { /* */ }
        }
    });

    const files = ['dependency', 'pull', 'sse', 'state', 'stats'];

    for (const name of files) {
        it(`GET /api/file/${name} returns empty object initially`, async () => {
            const res = await request(app).get(`/api/file/${name}`).set(auth);
            expect(res.status).toBe(200);
            expect(res.body.response.result).toEqual({});
        });

        it(`POST /api/file/${name} writes and reads back`, async () => {
            const data = { test: name, value: 42 };
            const postRes = await request(app).post(`/api/file/${name}`).set(auth)
                .send({ contents: data });
            expect(postRes.status).toBe(200);

            const getRes = await request(app).get(`/api/file/${name}`).set(auth);
            expect(getRes.body.response.result.test).toBe(name);
        });

        it(`POST /api/file/${name} 400 missing contents`, async () => {
            const res = await request(app).post(`/api/file/${name}`).set(auth).send({});
            expect(res.status).toBe(400);
        });
    }
});
