import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockContainer = {
    inspect: vi.fn(), logs: vi.fn(), start: vi.fn(), stop: vi.fn(), restart: vi.fn(),
    kill: vi.fn(), remove: vi.fn(), stats: vi.fn(),
};
const mockImage = { remove: vi.fn() };
const mockNetwork = { remove: vi.fn() };
const mockVolume = { remove: vi.fn() };
const mockDocker = {
    listContainers: vi.fn(),
    listImages: vi.fn(),
    listNetworks: vi.fn(),
    listVolumes: vi.fn(),
    getContainer: vi.fn(() => mockContainer),
    getImage: vi.fn(() => mockImage),
    getNetwork: vi.fn(() => mockNetwork),
    getVolume: vi.fn(() => mockVolume),
    createContainer: vi.fn(),
    pull: vi.fn(),
    ping: vi.fn(),
    modem: { followProgress: vi.fn((stream, cb) => cb(null, [])) },
};

const dockerPath = require.resolve('../../utils/docker.js');
delete require.cache[dockerPath];
require.cache[dockerPath] = {
    id: dockerPath, filename: dockerPath, loaded: true,
    exports: Object.assign(() => mockDocker, { _setInstance: () => {} }),
};

const ctrlPath = require.resolve('../../controllers/docker.js');
delete require.cache[ctrlPath];
const ctrl = await import('../../controllers/docker.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('Docker Controller - Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDocker.getContainer.mockReturnValue(mockContainer);
        mockDocker.getImage.mockReturnValue(mockImage);
        mockDocker.getNetwork.mockReturnValue(mockNetwork);
        mockDocker.getVolume.mockReturnValue(mockVolume);
    });

    // --- Kill ---
    it('postContainerKill success', async () => {
        mockContainer.kill.mockResolvedValue();
        const r = res(); await ctrl.postContainerKill(req({ body: { name: 'x' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postContainerKill 400 no name', async () => {
        const r = res(); await ctrl.postContainerKill(req(), r);
        expect(r.statusCode).toBe(400);
    });
    it('postContainerKill 500 on error', async () => {
        mockContainer.kill.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.postContainerKill(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    // --- Pull ---
    it('postContainerPull success', async () => {
        mockContainer.inspect.mockResolvedValue({ Config: { Image: 'nginx' } });
        mockDocker.pull.mockResolvedValue('stream');
        const r = res(); await ctrl.postContainerPull(req({ body: { name: 'x' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postContainerPull 400 no name', async () => {
        const r = res(); await ctrl.postContainerPull(req(), r);
        expect(r.statusCode).toBe(400);
    });
    it('postContainerPull 500 on error', async () => {
        mockContainer.inspect.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.postContainerPull(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    // --- Remove ---
    it('postContainerRemove success', async () => {
        mockContainer.remove.mockResolvedValue();
        const r = res(); await ctrl.postContainerRemove(req({ body: { name: 'x' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postContainerRemove 400 no name', async () => {
        const r = res(); await ctrl.postContainerRemove(req(), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Create ---
    it('postContainerCreate success', async () => {
        const newC = { start: vi.fn().mockResolvedValue(), inspect: vi.fn().mockResolvedValue({ Id: 'new' }) };
        mockDocker.createContainer.mockResolvedValue(newC);
        const r = res(); await ctrl.postContainerCreate(req({ body: { inspect: { Image: 'nginx' } } }), r);
        expect(r.body.code).toBe(200);
    });
    it('postContainerCreate 400 no inspect', async () => {
        const r = res(); await ctrl.postContainerCreate(req(), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Ports ---
    it('getContainerPorts success', async () => {
        mockContainer.inspect.mockResolvedValue({ NetworkSettings: { Ports: { '80/tcp': [{ HostPort: '8080' }] } } });
        const r = res(); await ctrl.getContainerPorts(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
    });
    it('getContainerPorts 400 no name', async () => {
        const r = res(); await ctrl.getContainerPorts(req(), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Compose ---
    it('getCreateCompose success', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/myapp', Config: { Image: 'nginx', Env: ['A=1'], ExposedPorts: {} },
            HostConfig: { PortBindings: { '80/tcp': [{ HostPort: '8080' }] }, Binds: ['/data:/data'], RestartPolicy: { Name: 'always' } },
        });
        const r = res(); await ctrl.getCreateCompose(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result.services).toHaveProperty('myapp');
    });
    it('getCreateCompose 400 no name', async () => {
        const r = res(); await ctrl.getCreateCompose(req(), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Run ---
    it('getCreateRun success', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/myapp', Config: { Image: 'nginx', Env: ['A=1'] },
            HostConfig: { PortBindings: { '80/tcp': [{ HostPort: '8080' }] }, Binds: ['/data:/data'], RestartPolicy: { Name: 'always' } },
        });
        const r = res(); await ctrl.getCreateRun(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toContain('docker run');
    });
    it('getCreateRun 400 no name', async () => {
        const r = res(); await ctrl.getCreateRun(req(), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Image Remove ---
    it('postImageRemove success', async () => {
        mockImage.remove.mockResolvedValue();
        const r = res(); await ctrl.postImageRemove(req({ body: { image: 'nginx' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postImageRemove 400 no image', async () => {
        const r = res(); await ctrl.postImageRemove(req(), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Images Sizes ---
    it('getImagesSizes success', async () => {
        mockDocker.listImages.mockResolvedValue([{ Id: 'a', RepoTags: ['nginx'], Size: 100, VirtualSize: 200, Created: 123 }]);
        const r = res(); await ctrl.getImagesSizes(req(), r);
        expect(r.body.response.result).toHaveLength(1);
    });

    // --- Networks ---
    it('getNetworks success', async () => {
        mockDocker.listNetworks.mockResolvedValue([{ Name: 'bridge' }]);
        const r = res(); await ctrl.getNetworks(req(), r);
        expect(r.body.code).toBe(200);
    });
    it('postNetworkRemove success', async () => {
        mockNetwork.remove.mockResolvedValue();
        const r = res(); await ctrl.postNetworkRemove(req({ body: { name: 'x' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postNetworkRemove 400 no name', async () => {
        const r = res(); await ctrl.postNetworkRemove(req(), r);
        expect(r.statusCode).toBe(400);
    });

    // --- Orphans ---
    it('getOrphansContainers success', async () => {
        mockDocker.listContainers.mockResolvedValue([]);
        const r = res(); await ctrl.getOrphansContainers(req(), r);
        expect(r.body.code).toBe(200);
    });
    it('getOrphansNetworks filters correctly', async () => {
        mockDocker.listNetworks.mockResolvedValue([
            { Name: 'bridge', Containers: {} },
            { Name: 'custom', Containers: {} },
            { Name: 'used', Containers: { a: {} } },
        ]);
        const r = res(); await ctrl.getOrphansNetworks(req(), r);
        expect(r.body.response.result).toHaveLength(1);
        expect(r.body.response.result[0].Name).toBe('custom');
    });
    it('getOrphansVolumes filters unlabeled', async () => {
        mockDocker.listVolumes.mockResolvedValue({ Volumes: [
            { Name: 'v1', Labels: {} }, { Name: 'v2', Labels: { app: 'x' } }
        ] });
        const r = res(); await ctrl.getOrphansVolumes(req(), r);
        expect(r.body.response.result).toHaveLength(1);
    });

    // --- Permissions ---
    it('getPermissions hasAccess true', async () => {
        mockDocker.ping.mockResolvedValue('OK');
        const r = res(); await ctrl.getPermissions(req(), r);
        expect(r.body.response.result.hasAccess).toBe(true);
    });
    it('getPermissions hasAccess false on error', async () => {
        mockDocker.ping.mockRejectedValue(new Error('denied'));
        const r = res(); await ctrl.getPermissions(req(), r);
        expect(r.body.response.result.hasAccess).toBe(false);
    });

    // --- Stats ---
    it('getStats returns stats for running containers', async () => {
        mockDocker.listContainers.mockResolvedValue([{ Id: 'a', Names: ['/app'], State: 'running' }]);
        mockContainer.stats.mockResolvedValue({ cpu: 1 });
        const r = res(); await ctrl.getStats(req(), r);
        expect(r.body.response.result).toHaveLength(1);
    });

    // --- Unused ---
    it('getUnusedContainers success', async () => {
        mockDocker.listContainers.mockResolvedValue([]);
        const r = res(); await ctrl.getUnusedContainers(req(), r);
        expect(r.body.code).toBe(200);
    });

    // --- Volume Remove ---
    it('postVolumeRemove success', async () => {
        mockVolume.remove.mockResolvedValue();
        const r = res(); await ctrl.postVolumeRemove(req({ body: { id: 'v1' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postVolumeRemove 400 no id', async () => {
        const r = res(); await ctrl.postVolumeRemove(req(), r);
        expect(r.statusCode).toBe(400);
    });
});
