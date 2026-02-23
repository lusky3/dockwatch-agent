import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockNewContainer = {
    start: vi.fn().mockResolvedValue(),
    inspect: vi.fn().mockResolvedValue({ Id: 'new123', Name: '/recreated' }),
};
const mockContainer = {
    inspect: vi.fn(),
    stop: vi.fn(),
    remove: vi.fn(),
};
const mockDocker = {
    getContainer: vi.fn(() => mockContainer),
    createContainer: vi.fn(() => mockNewContainer),
};

const dockerPath = require.resolve('../../utils/docker.js');
delete require.cache[dockerPath];
require.cache[dockerPath] = {
    id: dockerPath, filename: dockerPath, loaded: true,
    exports: Object.assign(() => mockDocker, { _setInstance: () => {} }),
};

const ctrlPath = require.resolve('../../controllers/dockerAPI.js');
delete require.cache[ctrlPath];
const { getContainerCreate } = await import('../../controllers/dockerAPI.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('DockerAPI Controller', () => {
    beforeEach(() => { vi.clearAllMocks(); mockDocker.getContainer.mockReturnValue(mockContainer); });

    it('getContainerCreate recreates container', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/myapp', Config: { Image: 'nginx', Env: [], ExposedPorts: {}, Labels: {}, Cmd: null, Entrypoint: null, WorkingDir: '', Volumes: null },
            HostConfig: {}, NetworkSettings: { Networks: {} },
        });
        mockContainer.stop.mockResolvedValue();
        mockContainer.remove.mockResolvedValue();
        mockDocker.createContainer.mockReturnValue(mockNewContainer);

        const r = res();
        await getContainerCreate(req({ query: { name: 'myapp' } }), r);
        expect(r.body.code).toBe(200);
        expect(mockContainer.stop).toHaveBeenCalled();
        expect(mockContainer.remove).toHaveBeenCalled();
        expect(mockDocker.createContainer).toHaveBeenCalled();
    });

    it('getContainerCreate 400 no name', async () => {
        const r = res();
        await getContainerCreate(req(), r);
        expect(r.statusCode).toBe(400);
    });

    it('getContainerCreate 500 on error', async () => {
        mockContainer.inspect.mockRejectedValue(new Error('not found'));
        const r = res();
        await getContainerCreate(req({ query: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getContainerCreate handles already stopped container', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/app', Config: { Image: 'nginx', Env: [], ExposedPorts: {}, Labels: {}, Cmd: null, Entrypoint: null, WorkingDir: '', Volumes: null },
            HostConfig: {}, NetworkSettings: { Networks: {} },
        });
        mockContainer.stop.mockRejectedValue(new Error('already stopped'));
        mockContainer.remove.mockResolvedValue();
        mockDocker.createContainer.mockReturnValue(mockNewContainer);

        const r = res();
        await getContainerCreate(req({ query: { name: 'app' } }), r);
        expect(r.body.code).toBe(200);
    });
});
