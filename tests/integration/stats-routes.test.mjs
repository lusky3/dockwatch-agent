import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockDocker = {
    listContainers: vi.fn(),
};

// Patch CJS cache before anything loads
const dockerPath = require.resolve('../../utils/docker.js');
delete require.cache[dockerPath];
require.cache[dockerPath] = {
    id: dockerPath, filename: dockerPath, loaded: true,
    exports: Object.assign(() => mockDocker, { _setInstance: () => {} }),
};

for (const key of Object.keys(require.cache)) {
    if (key.includes('controllers') || key.includes('routes') || key.includes('index.js')) {
        delete require.cache[key];
    }
}

const request = (await import('supertest')).default;
const app = (await import('../../index.js')).default;

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

describe('Stats Routes (integration)', () => {
    beforeEach(() => { mockDocker.listContainers.mockReset(); });

    describe('GET /api/stats/containers', () => {
        it('returns container list', async () => {
            mockDocker.listContainers.mockResolvedValue([{ Id: 'a', State: 'running' }]);
            const res = await request(app).get('/api/stats/containers').set(auth);
            expect(res.status).toBe(200);
            expect(res.body.response.result).toEqual([{ Id: 'a', State: 'running' }]);
        });
        it('returns 500 on error', async () => {
            mockDocker.listContainers.mockRejectedValue(new Error('fail'));
            const res = await request(app).get('/api/stats/containers').set(auth);
            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/stats/metrics', () => {
        it('returns metric placeholders', async () => {
            const res = await request(app).get('/api/stats/metrics').set(auth);
            expect(res.status).toBe(200);
            const r = res.body.response.result;
            expect(r).toEqual({ cpu: 0, memory: 0, disk: 0 });
        });
    });

    describe('GET /api/stats/overview', () => {
        it('returns container summary', async () => {
            mockDocker.listContainers.mockResolvedValue([
                { State: 'running' }, { State: 'running' },
                { State: 'exited' }, { State: 'paused' },
            ]);
            const res = await request(app).get('/api/stats/overview').set(auth);
            expect(res.status).toBe(200);
            expect(res.body.response.result).toEqual({ total: 4, running: 2, paused: 1, stopped: 1 });
        });
        it('returns 500 on error', async () => {
            mockDocker.listContainers.mockRejectedValue(new Error('fail'));
            const res = await request(app).get('/api/stats/overview').set(auth);
            expect(res.status).toBe(500);
        });
    });

    it('requires auth for stats endpoints', async () => {
        const res = await request(app).get('/api/stats/containers');
        expect(res.status).toBe(401);
    });
});
