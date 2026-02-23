import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Mock docker with full container recreation flow
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
    listContainers: vi.fn().mockResolvedValue([]),
    listImages: vi.fn().mockResolvedValue([]),
    listNetworks: vi.fn().mockResolvedValue([]),
    listVolumes: vi.fn().mockResolvedValue({ Volumes: [] }),
    ping: vi.fn().mockResolvedValue('OK'),
};

const dockerPath = require.resolve('../../utils/docker.js');
delete require.cache[dockerPath];
require.cache[dockerPath] = {
    id: dockerPath, filename: dockerPath, loaded: true,
    exports: Object.assign(() => mockDocker, { _setInstance: () => {} }),
};

// Clear all cached modules
for (const key of Object.keys(require.cache)) {
    if ((key.includes('controllers') || key.includes('routes') || key.includes('index.js')) && !key.includes('docker.js')) {
        delete require.cache[key];
    }
}

const request = (await import('supertest')).default;
const app = (await import('../../index.js')).default;

const API_KEY = process.env.DOCKWATCH_API_KEY || 'dockwatch';
const auth = { 'X-Api-Key': API_KEY };

describe('DockerAPI Routes (integration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDocker.getContainer.mockReturnValue(mockContainer);
        mockDocker.createContainer.mockReturnValue(mockNewContainer);
    });

    it('GET /api/dockerAPI/container/create recreates container', async () => {
        mockContainer.inspect.mockResolvedValue({
            Name: '/myapp',
            Config: { Image: 'nginx', Env: [], ExposedPorts: {}, Labels: {}, Cmd: null, Entrypoint: null, WorkingDir: '', Volumes: null },
            HostConfig: {},
            NetworkSettings: { Networks: {} },
        });
        mockContainer.stop.mockResolvedValue();
        mockContainer.remove.mockResolvedValue();

        const res = await request(app).get('/api/dockerAPI/container/create?name=myapp').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.code).toBe(200);
    });

    it('GET /api/dockerAPI/container/create 400 no name', async () => {
        const res = await request(app).get('/api/dockerAPI/container/create').set(auth);
        expect(res.status).toBe(400);
    });

    it('GET /api/dockerAPI/container/create 500 on error', async () => {
        mockContainer.inspect.mockRejectedValue(new Error('not found'));
        const res = await request(app).get('/api/dockerAPI/container/create?name=bad').set(auth);
        expect(res.status).toBe(500);
    });
});
