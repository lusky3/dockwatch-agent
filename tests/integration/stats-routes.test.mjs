import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockContainerStats = {
    cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000, online_cpus: 1 },
    precpu_stats: { cpu_usage: { total_usage: 50 }, system_cpu_usage: 500 },
    memory_stats: { usage: 1024 * 1024 * 50, limit: 1024 * 1024 * 1024 },
    networks: { eth0: { rx_bytes: 1000, tx_bytes: 2000 } },
    blkio_stats: { io_service_bytes_recursive: [] }
};

const mockInspect = {
    State: { Health: { Status: 'healthy' } },
    HostConfig: { NetworkMode: 'bridge' }
};

const mockContainer = {
    stats: vi.fn().mockResolvedValue(mockContainerStats),
    inspect: vi.fn().mockResolvedValue(mockInspect),
};

const mockDocker = {
    listContainers: vi.fn(),
    listImages: vi.fn().mockResolvedValue([]),
    listNetworks: vi.fn().mockResolvedValue([]),
    listVolumes: vi.fn().mockResolvedValue({ Volumes: [] }),
    getContainer: vi.fn().mockReturnValue(mockContainer),
};

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
    beforeEach(() => {
        mockDocker.listContainers.mockReset();
        mockDocker.listImages.mockResolvedValue([]);
        mockDocker.listNetworks.mockResolvedValue([]);
        mockDocker.listVolumes.mockResolvedValue({ Volumes: [] });
        mockContainer.stats.mockResolvedValue(mockContainerStats);
        mockContainer.inspect.mockResolvedValue(mockInspect);
    });

    describe('GET /api/stats/containers', () => {
        it('returns full Dockwatch format', async () => {
            mockDocker.listContainers.mockResolvedValue([
                { Id: 'abc', Names: ['/test'], Image: 'nginx', State: 'running',
                  Status: 'Up', Created: Math.floor(Date.now() / 1000) - 600, Ports: [], Labels: {} }
            ]);
            const res = await request(app).get('/api/stats/containers').set(auth);
            expect(res.status).toBe(200);
            const c = res.body.response.result[0];
            expect(c).toHaveProperty('usage');
            expect(c.usage.cpuPerc).toMatch(/%$/);
            expect(c).toHaveProperty('health');
            expect(c).toHaveProperty('server');
            expect(c).toHaveProperty('createdAt');
            expect(c).toHaveProperty('uptime');
        });
        it('returns 500 on error', async () => {
            mockDocker.listContainers.mockRejectedValue(new Error('fail'));
            const res = await request(app).get('/api/stats/containers').set(auth);
            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/stats/metrics', () => {
        it('returns formatted metrics', async () => {
            mockDocker.listContainers.mockResolvedValue([{ Id: 'a', State: 'running' }]);
            const res = await request(app).get('/api/stats/metrics').set(auth);
            expect(res.status).toBe(200);
            const r = res.body.response.result;
            expect(r.cpu).toMatch(/%$/);
            expect(r).toHaveProperty('memory');
            expect(r).toHaveProperty('containers');
        });
    });

    describe('GET /api/stats/overview', () => {
        it('returns container summary', async () => {
            mockDocker.listContainers.mockResolvedValue([
                { State: 'running' }, { State: 'running' },
                { State: 'exited' }, { State: 'paused' },
            ]);
            mockDocker.listImages.mockResolvedValue([{}, {}]);
            mockDocker.listNetworks.mockResolvedValue([{}]);
            mockDocker.listVolumes.mockResolvedValue({ Volumes: [{}] });
            const res = await request(app).get('/api/stats/overview').set(auth);
            expect(res.status).toBe(200);
            expect(res.body.response.result).toEqual({
                total: 4, running: 2, paused: 1, stopped: 1,
                images: 2, networks: 1, volumes: 1
            });
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
