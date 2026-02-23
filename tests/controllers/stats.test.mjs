import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockContainerStats = {
    cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000, online_cpus: 1 },
    precpu_stats: { cpu_usage: { total_usage: 50 }, system_cpu_usage: 500 },
    memory_stats: { usage: 1024, limit: 4096 },
    networks: { eth0: { rx_bytes: 100, tx_bytes: 200 } },
    blkio_stats: { io_service_bytes_recursive: [] }
};

const mockContainer = {
    stats: vi.fn().mockResolvedValue(mockContainerStats),
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
    });

    it('getStatsContainers returns enriched list', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'a', Names: ['/test'], Image: 'img', State: 'running', Status: 'Up', Created: 1, Ports: [], Labels: {} }
        ]);
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.code).toBe(200);
        const result = r.body.response.result;
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('cpu');
        expect(result[0]).toHaveProperty('memoryPercent');
        expect(result[0].name).toBe('test');
    });

    it('getStatsContainers 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsContainers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getStatsMetrics returns aggregated metrics', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'a', State: 'running' }
        ]);
        const r = res(); await getStatsMetrics(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toHaveProperty('cpu');
        expect(r.body.response.result).toHaveProperty('memory');
        expect(r.body.response.result).toHaveProperty('containers');
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
