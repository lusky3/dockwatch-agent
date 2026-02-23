import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockContainer = {
    stats: vi.fn(),
    inspect: vi.fn(),
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

describe('Stats Controller - Extended coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDocker.listImages.mockResolvedValue([]);
        mockDocker.listNetworks.mockResolvedValue([]);
        mockDocker.listVolumes.mockResolvedValue({ Volumes: [] });
    });

    // Stopped container (no stats fetched)
    it('getStatsContainers handles stopped containers', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/stopped'], Image: 'nginx', State: 'exited',
              Created: Math.floor(Date.now() / 1000) - 3600, Ports: [] }
        ]);
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.code).toBe(200);
        const c = r.body.response.result[0];
        expect(c.uptime).toBe('0h00m');
        expect(c.usage.cpuPerc).toBe('0.00%');
    });

    // Running container where stats/inspect throws
    it('getStatsContainers handles stats failure for running container', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/failing'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - 60, Ports: [] }
        ]);
        mockContainer.stats.mockRejectedValue(new Error('stats fail'));
        mockContainer.inspect.mockRejectedValue(new Error('inspect fail'));
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.code).toBe(200);
        // Should still return the container with default usage
        const c = r.body.response.result[0];
        expect(c.usage.cpuPerc).toBe('0.00%');
    });

    // Image size matching
    it('getStatsContainers matches image size', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx:latest', State: 'exited',
              Created: Math.floor(Date.now() / 1000), Ports: [] }
        ]);
        mockDocker.listImages.mockResolvedValue([
            { RepoTags: ['nginx:latest'], Size: 1024 * 1024 * 150 }
        ]);
        const r = res(); await getStatsContainers(req(), r);
        const c = r.body.response.result[0];
        expect(c.imageSize).not.toBe('unknown');
    });

    // Image size partial match
    it('getStatsContainers matches image by prefix', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx:1.25', State: 'exited',
              Created: Math.floor(Date.now() / 1000), Ports: [] }
        ]);
        mockDocker.listImages.mockResolvedValue([
            { RepoTags: ['nginx:latest'], Size: 1024 * 1024 * 150 }
        ]);
        const r = res(); await getStatsContainers(req(), r);
        const c = r.body.response.result[0];
        expect(c.imageSize).not.toBe('unknown');
    });

    // No image match
    it('getStatsContainers returns unknown for unmatched image', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'custom:v1', State: 'exited',
              Created: Math.floor(Date.now() / 1000), Ports: [] }
        ]);
        mockDocker.listImages.mockResolvedValue([
            { RepoTags: ['nginx:latest'], Size: 100 }
        ]);
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.response.result[0].imageSize).toBe('unknown');
    });

    // Network mode from NetworkSettings when HostConfig is missing
    it('getStatsContainers gets network mode from NetworkSettings', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - 60, Ports: [] }
        ]);
        mockContainer.stats.mockResolvedValue({
            cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000, online_cpus: 2 },
            precpu_stats: { cpu_usage: { total_usage: 50 }, system_cpu_usage: 500 },
            memory_stats: { usage: 0, limit: 0 },
            networks: {},
            blkio_stats: { io_service_bytes_recursive: null }
        });
        mockContainer.inspect.mockResolvedValue({
            State: { Health: null },
            HostConfig: { NetworkMode: null },
            NetworkSettings: { Networks: { 'my-net': {} } }
        });
        const r = res(); await getStatsContainers(req(), r);
        const c = r.body.response.result[0];
        expect(c.networkMode).toBe('my-net');
        expect(c.health).toBe('none');
    });

    // Memory limit 0 (memPerc should be 0.00)
    it('getStatsContainers handles zero memory limit', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - 60, Ports: [] }
        ]);
        mockContainer.stats.mockResolvedValue({
            cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000, online_cpus: 1 },
            precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
            memory_stats: { usage: 100, limit: 0 },
            networks: {},
            blkio_stats: { io_service_bytes_recursive: [] }
        });
        mockContainer.inspect.mockResolvedValue({
            State: {},
            HostConfig: { NetworkMode: 'bridge' }
        });
        const r = res(); await getStatsContainers(req(), r);
        const c = r.body.response.result[0];
        expect(c.usage.memPerc).toBe('0.00%');
    });

    // Block IO with read/write entries
    it('getStatsContainers calculates block IO', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - 60, Ports: [] }
        ]);
        mockContainer.stats.mockResolvedValue({
            cpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 2000, online_cpus: 1 },
            precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
            memory_stats: { usage: 1024 * 1024 * 512, limit: 1024 * 1024 * 1024 },
            networks: { eth0: { rx_bytes: 1024 * 1024 * 100, tx_bytes: 1024 * 1024 * 50 } },
            blkio_stats: { io_service_bytes_recursive: [
                { op: 'Read', value: 1024 * 1024 * 200 },
                { op: 'Write', value: 1024 * 1024 * 100 },
                { op: 'read', value: 1024 * 1024 * 50 },
                { op: 'write', value: 1024 * 1024 * 25 },
            ] }
        });
        mockContainer.inspect.mockResolvedValue({
            State: { Health: { Status: 'healthy' } },
            HostConfig: { NetworkMode: 'bridge' }
        });
        const r = res(); await getStatsContainers(req(), r);
        const c = r.body.response.result[0];
        expect(c.usage.blockIO).toContain('/');
        expect(c.usage.netIO).toContain('/');
    });

    // getStatsMetrics with no containers
    it('getStatsMetrics with empty container list', async () => {
        mockDocker.listContainers.mockResolvedValue([]);
        const r = res(); await getStatsMetrics(req(), r);
        expect(r.body.response.result.containers).toBe(0);
        expect(r.body.response.result.memoryPercent).toBe('0.00%');
    });

    // getStatsMetrics 500
    it('getStatsMetrics 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsMetrics(req(), r);
        expect(r.statusCode).toBe(500);
    });

    // getStatsMetrics with stats failure for individual container
    it('getStatsMetrics handles individual container stats failure', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'a', State: 'running' },
            { Id: 'b', State: 'running' }
        ]);
        mockContainer.stats.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsMetrics(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result.containers).toBe(2);
    });

    // getStatsOverview with listVolumes failure
    it('getStatsOverview handles listVolumes failure', async () => {
        mockDocker.listContainers.mockResolvedValue([]);
        mockDocker.listImages.mockResolvedValue([]);
        mockDocker.listNetworks.mockResolvedValue([]);
        mockDocker.listVolumes.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsOverview(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result.volumes).toBe(0);
    });

    // formatBytes edge cases: 0 bytes
    it('getStatsContainers formats 0 bytes correctly', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - 60, Ports: [] }
        ]);
        mockContainer.stats.mockResolvedValue({
            cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000, online_cpus: 1 },
            precpu_stats: { cpu_usage: { total_usage: 50 }, system_cpu_usage: 500 },
            memory_stats: { usage: 0, limit: 0 },
            networks: {},
            blkio_stats: { io_service_bytes_recursive: [] }
        });
        mockContainer.inspect.mockResolvedValue({
            State: {},
            HostConfig: { NetworkMode: 'bridge' }
        });
        const r = res(); await getStatsContainers(req(), r);
        const c = r.body.response.result[0];
        expect(c.usage.memSize).toBe('0B / 0B');
        expect(c.usage.blockIO).toBe('0B / 0B');
        expect(c.usage.netIO).toBe('0B / 0B');
    });

    // Large uptime (days)
    it('getStatsContainers formats uptime with days', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - (3 * 86400 + 7200 + 300), Ports: [] }
        ]);
        mockContainer.stats.mockRejectedValue(new Error('skip'));
        const r = res(); await getStatsContainers(req(), r);
        const c = r.body.response.result[0];
        expect(c.uptime).toMatch(/^3d/);
    });

    // CPU delta 0 (systemDelta 0)
    it('getStatsContainers handles zero CPU delta', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - 60, Ports: [] }
        ]);
        mockContainer.stats.mockResolvedValue({
            cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 100, online_cpus: 1 },
            precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 100 },
            memory_stats: { usage: 1024, limit: 2048 },
            networks: {},
            blkio_stats: { io_service_bytes_recursive: [] }
        });
        mockContainer.inspect.mockResolvedValue({
            State: {},
            HostConfig: { NetworkMode: 'bridge' }
        });
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.response.result[0].usage.cpuPerc).toBe('0.00%');
    });

    // Network mode default fallback
    it('getStatsContainers falls back to default network mode', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { Id: 'abc', Names: ['/app'], Image: 'nginx', State: 'running',
              Created: Math.floor(Date.now() / 1000) - 60, Ports: [] }
        ]);
        mockContainer.stats.mockResolvedValue({
            cpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000, online_cpus: 1 },
            precpu_stats: { cpu_usage: { total_usage: 50 }, system_cpu_usage: 500 },
            memory_stats: { usage: 0, limit: 0 },
            networks: {},
            blkio_stats: { io_service_bytes_recursive: [] }
        });
        mockContainer.inspect.mockResolvedValue({
            State: {},
            HostConfig: {},
            NetworkSettings: { Networks: null }
        });
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.response.result[0].networkMode).toBe('default');
    });
});
