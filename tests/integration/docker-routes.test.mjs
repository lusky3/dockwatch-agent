import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockContainer = {
    inspect: vi.fn(), logs: vi.fn(), start: vi.fn(), stop: vi.fn(), restart: vi.fn(),
};
const mockDocker = {
    listContainers: vi.fn(),
    getContainer: vi.fn(() => mockContainer),
};

// Patch CJS cache before anything loads
const dockerPath = require.resolve('../../utils/docker.js');
delete require.cache[dockerPath];
require.cache[dockerPath] = {
    id: dockerPath, filename: dockerPath, loaded: true,
    exports: Object.assign(() => mockDocker, { _setInstance: () => {} }),
};

// Clear all cached modules that depend on utils/docker.js
for (const key of Object.keys(require.cache)) {
    if (key.includes('controllers') || key.includes('routes') || key.includes('index.js')) {
        delete require.cache[key];
    }
}

const request = (await import('supertest')).default;
const app = (await import('../../index.js')).default;

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

function reset() {
    mockDocker.listContainers.mockReset();
    mockDocker.getContainer.mockReset();
    mockDocker.getContainer.mockReturnValue(mockContainer);
    Object.values(mockContainer).forEach(fn => fn.mockReset());
}

describe('Docker Routes (integration)', () => {
    beforeEach(reset);

    describe('GET /api/docker/processList', () => {
        it('returns container list', async () => {
            mockDocker.listContainers.mockResolvedValue([{ Id: 'abc' }]);
            const res = await request(app).get('/api/docker/processList').set(auth);
            expect(res.status).toBe(200);
            expect(res.body.response.result).toEqual([{ Id: 'abc' }]);
        });
        it('returns 500 on docker error', async () => {
            mockDocker.listContainers.mockRejectedValue(new Error('socket fail'));
            const res = await request(app).get('/api/docker/processList').set(auth);
            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/docker/container/inspect', () => {
        it('returns container data', async () => {
            mockContainer.inspect.mockResolvedValue({ Id: 'abc', Name: '/test' });
            const res = await request(app).get('/api/docker/container/inspect?name=test').set(auth);
            expect(res.status).toBe(200);
            expect(res.body.response.result).toHaveProperty('Id');
        });
        it('returns 400 without name', async () => {
            const res = await request(app).get('/api/docker/container/inspect').set(auth);
            expect(res.status).toBe(400);
        });
        it('returns 404 when container not found', async () => {
            mockContainer.inspect.mockRejectedValue(new Error('not found'));
            const res = await request(app).get('/api/docker/container/inspect?name=nope').set(auth);
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/docker/container/logs', () => {
        it('returns logs', async () => {
            mockContainer.logs.mockResolvedValue(Buffer.from('log line'));
            const res = await request(app).get('/api/docker/container/logs?name=test').set(auth);
            expect(res.status).toBe(200);
            expect(res.body.response.result).toBe('log line');
        });
        it('returns 400 without name', async () => {
            const res = await request(app).get('/api/docker/container/logs').set(auth);
            expect(res.status).toBe(400);
        });
        it('returns 500 on error', async () => {
            mockContainer.logs.mockRejectedValue(new Error('fail'));
            const res = await request(app).get('/api/docker/container/logs?name=test').set(auth);
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/docker/container/start', () => {
        it('starts container', async () => {
            mockContainer.start.mockResolvedValue();
            const res = await request(app).post('/api/docker/container/start').set(auth).send({ name: 'test' });
            expect(res.status).toBe(200);
            expect(res.body.response.result).toBe('success');
        });
        it('returns 400 without name', async () => {
            const res = await request(app).post('/api/docker/container/start').set(auth).send({});
            expect(res.status).toBe(400);
        });
        it('returns 500 on error', async () => {
            mockContainer.start.mockRejectedValue(new Error('already started'));
            const res = await request(app).post('/api/docker/container/start').set(auth).send({ name: 'test' });
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/docker/container/stop', () => {
        it('stops container', async () => {
            mockContainer.stop.mockResolvedValue();
            const res = await request(app).post('/api/docker/container/stop').set(auth).send({ name: 'test' });
            expect(res.status).toBe(200);
            expect(res.body.response.result).toBe('success');
        });
        it('returns 400 without name', async () => {
            const res = await request(app).post('/api/docker/container/stop').set(auth).send({});
            expect(res.status).toBe(400);
        });
        it('returns 500 on error', async () => {
            mockContainer.stop.mockRejectedValue(new Error('not running'));
            const res = await request(app).post('/api/docker/container/stop').set(auth).send({ name: 'test' });
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/docker/container/restart', () => {
        it('restarts container', async () => {
            mockContainer.restart.mockResolvedValue();
            const res = await request(app).post('/api/docker/container/restart').set(auth).send({ name: 'test' });
            expect(res.status).toBe(200);
            expect(res.body.response.result).toBe('success');
        });
        it('returns 400 without name', async () => {
            const res = await request(app).post('/api/docker/container/restart').set(auth).send({});
            expect(res.status).toBe(400);
        });
        it('returns 500 on error', async () => {
            mockContainer.restart.mockRejectedValue(new Error('fail'));
            const res = await request(app).post('/api/docker/container/restart').set(auth).send({ name: 'test' });
            expect(res.status).toBe(500);
        });
    });

    it('requires auth for docker endpoints', async () => {
        const res = await request(app).get('/api/docker/processList');
        expect(res.status).toBe(401);
    });
});
