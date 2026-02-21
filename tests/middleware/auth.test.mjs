import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('Auth Middleware', () => {
    const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';

    it('rejects requests without an API key', async () => {
        const res = await request(app).get('/api/server/ping');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid apikey');
    });

    it('rejects requests with an invalid API key', async () => {
        const res = await request(app)
            .get('/api/server/ping')
            .set('X-Api-Key', 'wrong-key');
        expect(res.status).toBe(401);
    });

    it('accepts requests with a valid header key', async () => {
        const res = await request(app)
            .get('/api/server/ping')
            .set('X-Api-Key', API_KEY);
        expect(res.status).toBe(200);
    });

    it('accepts requests with a valid query param key', async () => {
        const res = await request(app)
            .get(`/api/server/ping?apikey=${API_KEY}`);
        expect(res.status).toBe(200);
    });
});
