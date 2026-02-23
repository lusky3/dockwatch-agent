import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

describe('Server Controller', () => {
    it('GET /api/server/ping returns version string', async () => {
        const res = await request(app).get('/api/server/ping').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toMatch(/^v\d+\.\d+\.\d+ - v\d+\.\d+\.\d+$/);
    });

    it('GET /api/server/time returns time and timezone', async () => {
        const res = await request(app).get('/api/server/time').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.response.result).toHaveProperty('time');
        expect(res.body.response.result).toHaveProperty('timezone');
    });
});
