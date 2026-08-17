import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const ctrlPath = require.resolve('../../controllers/system.js');
delete require.cache[ctrlPath];
const ctrl = await import('../../controllers/system.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('System Controller - Memcache', () => {
    beforeEach(() => {
        // Clear the cache between tests
        ctrl.getMemcache._cache.clear();
    });

    describe('GET /system/memcache/get', () => {
        it('returns 400 if key missing', () => {
            const r = res();
            ctrl.getMemcache(req({ query: {} }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/key/i);
        });

        it('returns null for non-existent key', () => {
            const r = res();
            ctrl.getMemcache(req({ query: { key: 'nonexistent' } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result).toBeNull();
        });

        it('returns value for existing key', () => {
            // Set a value directly in cache
            ctrl.getMemcache._cache.set('mykey', {
                value: 'myvalue',
                expiresAt: Date.now() + 60000
            });

            const r = res();
            ctrl.getMemcache(req({ query: { key: 'mykey' } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result).toBe('myvalue');
        });

        it('returns null for expired key', () => {
            ctrl.getMemcache._cache.set('expired', {
                value: 'old',
                expiresAt: Date.now() - 1000
            });

            const r = res();
            ctrl.getMemcache(req({ query: { key: 'expired' } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result).toBeNull();
        });
    });

    describe('POST /system/memcache/set', () => {
        it('returns 400 if key missing', () => {
            const r = res();
            ctrl.postMemcacheSet(req({ body: { value: 'v', seconds: 60 } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/key/i);
        });

        it('returns 400 if value missing', () => {
            const r = res();
            ctrl.postMemcacheSet(req({ body: { key: 'k', seconds: 60 } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/value/i);
        });

        it('returns 400 if seconds missing', () => {
            const r = res();
            ctrl.postMemcacheSet(req({ body: { key: 'k', value: 'v' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/seconds/i);
        });

        it('stores value with TTL', () => {
            const r = res();
            ctrl.postMemcacheSet(req({ body: { key: 'token', value: 'abc123', seconds: 300 } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result).toBe(true);

            // Verify it's stored
            const entry = ctrl.postMemcacheSet._cache.get('token');
            expect(entry.value).toBe('abc123');
            expect(entry.expiresAt).toBeGreaterThan(Date.now());
        });

        it('round-trip: set then get', () => {
            const setRes = res();
            ctrl.postMemcacheSet(req({ body: { key: 'session', value: 'xyz', seconds: 60 } }), setRes);
            expect(setRes.body.response.result).toBe(true);

            const getRes = res();
            ctrl.getMemcache(req({ query: { key: 'session' } }), getRes);
            expect(getRes.body.response.result).toBe('xyz');
        });

        it('overwrites existing key', () => {
            ctrl.postMemcacheSet(req({ body: { key: 'k', value: 'first', seconds: 60 } }), res());
            ctrl.postMemcacheSet(req({ body: { key: 'k', value: 'second', seconds: 60 } }), res());

            const r = res();
            ctrl.getMemcache(req({ query: { key: 'k' } }), r);
            expect(r.body.response.result).toBe('second');
        });
    });
});
