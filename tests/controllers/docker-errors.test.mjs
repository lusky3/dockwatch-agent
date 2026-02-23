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

describe('Docker Controller - Error & edge cases', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDocker.getContainer.mockReturnValue(mockContainer);
        mockDocker.getImage.mockReturnValue(mockImage);
        mockDocker.getNetwork.mockReturnValue(mockNetwork);
        mockDocker.getVolume.mockReturnValue(mockVolume);
    });

    // Error branches for remove, create, ports, compose, run, image, images, networks, network remove, orphans, stats, unused, volume
    it('postContainerRemove 500 on error', async () => {
        mockContainer.remove.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.postContainerRemove(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postContainerCreate 500 on error', async () => {
        mockDocker.createContainer.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.postContainerCreate(req({ body: { inspect: {} } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getContainerPorts 500 on error', async () => {
        mockContainer.inspect.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getContainerPorts(req({ query: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getCreateCompose 500 on error', async () => {
        mockContainer.inspect.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getCreateCompose(req({ query: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getCreateRun 500 on error', async () => {
        mockContainer.inspect.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getCreateRun(req({ query: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postImageRemove 500 on error', async () => {
        mockImage.remove.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.postImageRemove(req({ body: { image: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getImagesSizes 500 on error', async () => {
        mockDocker.listImages.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getImagesSizes(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getNetworks 500 on error', async () => {
        mockDocker.listNetworks.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getNetworks(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('postNetworkRemove 500 on error', async () => {
        mockNetwork.remove.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.postNetworkRemove(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getOrphansContainers 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getOrphansContainers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getOrphansNetworks 500 on error', async () => {
        mockDocker.listNetworks.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getOrphansNetworks(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getOrphansVolumes 500 on error', async () => {
        mockDocker.listVolumes.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getOrphansVolumes(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getStats 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getStats(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getStats handles container stats failure gracefully', async () => {
        mockDocker.listContainers.mockResolvedValue([{ Id: 'a', Names: ['/app'], State: 'running' }]);
        mockContainer.stats.mockRejectedValue(new Error('stats fail'));
        const r = res(); await ctrl.getStats(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result[0].stats).toBeNull();
    });

    it('getUnusedContainers 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.getUnusedContainers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('postVolumeRemove 500 on error', async () => {
        mockVolume.remove.mockRejectedValue(new Error('fail'));
        const r = res(); await ctrl.postVolumeRemove(req({ body: { id: 'v1' } }), r);
        expect(r.statusCode).toBe(500);
    });

    // Compose/Run with no binds, no env, no restart, no port bindings
    it('getCreateCompose with minimal inspect data', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/minimal', Config: { Image: 'alpine' },
            HostConfig: { PortBindings: null, Binds: null, RestartPolicy: null },
        });
        const r = res(); await ctrl.getCreateCompose(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result.services.minimal.image).toBe('alpine');
    });

    it('getCreateRun with minimal inspect data', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/minimal', Config: { Image: 'alpine', Env: null },
            HostConfig: { PortBindings: null, Binds: null, RestartPolicy: null },
        });
        const r = res(); await ctrl.getCreateRun(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toContain('docker run');
        expect(r.body.response.result).toContain('alpine');
    });

    // Pull with followProgress error
    it('postContainerPull 500 on pull stream error', async () => {
        mockContainer.inspect.mockResolvedValue({ Config: { Image: 'nginx' } });
        mockDocker.pull.mockResolvedValue('stream');
        mockDocker.modem.followProgress.mockImplementation((stream, cb) => cb(new Error('pull fail')));
        const r = res(); await ctrl.postContainerPull(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    // Orphans volumes with null Volumes
    it('getOrphansVolumes handles null Volumes', async () => {
        mockDocker.listVolumes.mockResolvedValue({ Volumes: null });
        const r = res(); await ctrl.getOrphansVolumes(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toEqual([]);
    });

    // Orphans networks with null Containers
    it('getOrphansNetworks handles null Containers', async () => {
        mockDocker.listNetworks.mockResolvedValue([
            { Name: 'custom', Containers: null },
        ]);
        const r = res(); await ctrl.getOrphansNetworks(req(), r);
        expect(r.body.response.result).toHaveLength(1);
    });

    // extractPorts with null bindings
    it('getCreateCompose handles empty port bindings array', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/app', Config: { Image: 'nginx', Env: ['A=1'] },
            HostConfig: { PortBindings: { '80/tcp': null }, Binds: [], RestartPolicy: { Name: '' } },
        });
        const r = res(); await ctrl.getCreateCompose(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
    });

    // Full buildRunFromInspect with ports, binds, env, restart
    it('getCreateRun with full inspect data', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/fullapp',
            Config: { Image: 'nginx:latest', Env: ['NODE_ENV=production', 'PORT=3000'] },
            HostConfig: {
                PortBindings: { '80/tcp': [{ HostPort: '8080' }], '443/tcp': [{ HostPort: '8443' }] },
                Binds: ['/host/data:/container/data', '/host/config:/container/config'],
                RestartPolicy: { Name: 'unless-stopped' },
            },
        });
        const r = res(); await ctrl.getCreateRun(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
        const cmd = r.body.response.result;
        expect(cmd).toContain('docker run');
        expect(cmd).toContain('--name fullapp');
        expect(cmd).toContain('--restart unless-stopped');
        expect(cmd).toContain('-p 8080:80');
        expect(cmd).toContain('-p 8443:443');
        expect(cmd).toContain('-v /host/data:/container/data');
        expect(cmd).toContain('-v /host/config:/container/config');
        expect(cmd).toContain('-e NODE_ENV=production');
        expect(cmd).toContain('-e PORT=3000');
        expect(cmd).toContain('nginx:latest');
    });

    // Full buildComposeFromInspect with all fields
    it('getCreateCompose with full inspect data', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/fullapp',
            Config: { Image: 'nginx:latest', Env: ['NODE_ENV=production'] },
            HostConfig: {
                PortBindings: { '80/tcp': [{ HostPort: '8080' }] },
                Binds: ['/host/data:/data'],
                RestartPolicy: { Name: 'always' },
            },
        });
        const r = res(); await ctrl.getCreateCompose(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
        const svc = r.body.response.result.services.fullapp;
        expect(svc.image).toBe('nginx:latest');
        expect(svc.environment).toContain('NODE_ENV=production');
        expect(svc.ports).toContain('8080:80');
        expect(svc.volumes).toContain('/host/data:/data');
        expect(svc.restart).toBe('always');
    });
});
