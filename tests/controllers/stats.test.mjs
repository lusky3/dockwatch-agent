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

const ctrlPath = require.resolve('../../controllers/stats.js');
delete require.cache[ctrlPath];

const { getStatsContainers, getStatsMetrics, getStatsOverview } =
    await import('../../controllers/stats.js');

function req() { return {}; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('Stats Controller', () => {
    beforeEach(() => {
        mockDocker.listContainers.mockReset();
        mockDocker.listImages.mockResolvedValue([]);
        mockDocker.listNetworks.mockResolvedValue([]);
        mockDocker.listVolumes.mockResolvedValue({ Volumes: [] });
        mockContainer.stats.mockResolvedValue(mockContainerStats);
        mockContainer.inspect.mockResolvedValue(mockInspect);
    });

    it('getStatsContainers returns full Dockwatch format', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc123', Names: ['/myapp'], Image: 'nginx:latest', State: 'running',
              Status: 'Up 2 hours', Created: Math.floor(Date.now() / 1000) - 3600, Ports: [], Labels: {} }
        ]);
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.code).toBe(200);
        const c = r.body.response.result[0];
        expect(c.name).toBe('myapp');
        expect(c.status).toBe('running');
        expect(c.health).toBe('healthy');
        expect(c.networkMode).toBe('bridge');
        expect(c).toHaveProperty('imageSize');
        expect(c).toHaveProperty('createdAt');
        expect(c).toHaveProperty('uptime');
        expect(c).toHaveProperty('server');
        expect(c).toHaveProperty('dockwatch');
        expect(c.usage).toHaveProperty('cpuPerc');
        expect(c.usage.cpuPerc).toMatch(/%$/);
        expect(c.usage).toHaveProperty('memPerc');
        expect(c.usage).toHaveProperty('memSize');
        expect(c.usage.memSize).toMatch(/\//);
        expect(c.usage).toHaveProperty('blockIO');
        expect(c.usage).toHaveProperty('netIO');
    });

    it('getStatsContainers 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsContainers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getStatsMetrics returns formatted metrics', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'a', State: 'running' }
        ]);
        const r = res(); await getStatsMetrics(req(), r);
        expect(r.body.code).toBe(200);
        const result = r.body.response.result;
        expect(result).toHaveProperty('cpu');
        expect(result.cpu).toMatch(/%$/);
        expect(result).toHaveProperty('memory');
        expect(result).toHaveProperty('containers');
    });

    it('getStatsOverview returns summary with images/networks/volumes', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { State: 'running' }, { State: 'running' },
            { State: 'exited' }, { State: 'paused' },
        ]);
        mockDocker.listImages.mockResolvedValue([{}, {}]);
        mockDocker.listNetworks.mockResolvedValue([{}]);
        mockDocker.listVolumes.mockResolvedValue({ Volumes: [{}] });
        const r = res(); await getStatsOverview(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toEqual({
            total: 4, running: 2, paused: 1, stopped: 1,
            images: 2, networks: 1, volumes: 1
        });
    });

    it('getStatsOverview 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsOverview(req(), r);
        expect(r.statusCode).toBe(500);
    });
});
