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

// Patch CJS module cache so controllers get our mock instead of real dockerode
const dockerPath = require.resolve('../../utils/docker.js');
delete require.cache[dockerPath];
require.cache[dockerPath] = {
    id: dockerPath, filename: dockerPath, loaded: true,
    exports: Object.assign(() => mockDocker, { _setInstance: () => {} }),
};

const ctrlPath = require.resolve('../../controllers/docker.js');
delete require.cache[ctrlPath];

const { getProcessList, getContainerInspect, getContainerLogs,
    postContainerStart, postContainerStop, postContainerRestart
} = await import('../../controllers/docker.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('Docker Controller', () => {
    beforeEach(() => {
        mockDocker.listContainers.mockReset();
        mockDocker.getContainer.mockReset();
        mockDocker.getContainer.mockReturnValue(mockContainer);
        Object.values(mockContainer).forEach(fn => fn.mockReset());
    });

    it('getProcessList returns list', async () => {
        mockDocker.listContainers.mockResolvedValue([{ Id: 'abc' }]);
        const r = res(); await getProcessList(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toEqual([{ Id: 'abc' }]);
    });
    it('getProcessList 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await getProcessList(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getContainerInspect returns data', async () => {
        mockContainer.inspect.mockResolvedValue({ Id: 'abc' });
        const r = res(); await getContainerInspect(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
    });
    it('getContainerInspect 400 no name', async () => {
        const r = res(); await getContainerInspect(req(), r);
        expect(r.statusCode).toBe(400);
    });
    it('getContainerInspect 404 not found', async () => {
        mockContainer.inspect.mockRejectedValue(new Error('nope'));
        const r = res(); await getContainerInspect(req({ query: { name: 'x' } }), r);
        expect(r.statusCode).toBe(404);
    });

    it('getContainerLogs returns logs', async () => {
        mockContainer.logs.mockResolvedValue(Buffer.from('line'));
        const r = res(); await getContainerLogs(req({ query: { name: 'x' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toBe('line');
    });
    it('getContainerLogs 400 no name', async () => {
        const r = res(); await getContainerLogs(req(), r);
        expect(r.statusCode).toBe(400);
    });
    it('getContainerLogs 500 on error', async () => {
        mockContainer.logs.mockRejectedValue(new Error('fail'));
        const r = res(); await getContainerLogs(req({ query: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postContainerStart success', async () => {
        mockContainer.start.mockResolvedValue();
        const r = res(); await postContainerStart(req({ body: { name: 'x' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postContainerStart 400 no name', async () => {
        const r = res(); await postContainerStart(req(), r);
        expect(r.statusCode).toBe(400);
    });
    it('postContainerStart 500 on error', async () => {
        mockContainer.start.mockRejectedValue(new Error('fail'));
        const r = res(); await postContainerStart(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postContainerStop success', async () => {
        mockContainer.stop.mockResolvedValue();
        const r = res(); await postContainerStop(req({ body: { name: 'x' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postContainerStop 400 no name', async () => {
        const r = res(); await postContainerStop(req(), r);
        expect(r.statusCode).toBe(400);
    });
    it('postContainerStop 500 on error', async () => {
        mockContainer.stop.mockRejectedValue(new Error('fail'));
        const r = res(); await postContainerStop(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postContainerRestart success', async () => {
        mockContainer.restart.mockResolvedValue();
        const r = res(); await postContainerRestart(req({ body: { name: 'x' } }), r);
        expect(r.body.response.result).toBe('success');
    });
    it('postContainerRestart 400 no name', async () => {
        const r = res(); await postContainerRestart(req(), r);
        expect(r.statusCode).toBe(400);
    });
    it('postContainerRestart 500 on error', async () => {
        mockContainer.restart.mockRejectedValue(new Error('fail'));
        const r = res(); await postContainerRestart(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });
});
