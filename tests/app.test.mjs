import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

describe('App', () => {
    it('GET /ping returns pong (no auth required)', async () => {
        const res = await request(app).get('/ping');
        expect(res.status).toBe(200);
        expect(res.text).toBe('pong');
    });

    it('returns 405 for unknown API endpoints', async () => {
        const res = await request(app).get('/api/nonexistent').set(auth);
        expect(res.status).toBe(405);
        expect(res.body.code).toBe(405);
    });
});
