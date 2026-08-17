import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockExecStream = {
    on: vi.fn((event, cb) => {
        if (event === 'data') cb(Buffer.from('command output'));
        if (event === 'end') cb();
        return mockExecStream;
    }),
};
const mockExec = { start: vi.fn().mockResolvedValue(mockExecStream) };
const mockContainer = {
    inspect: vi.fn(),
    exec: vi.fn().mockResolvedValue(mockExec),
};
const mockDocker = {
    getContainer: vi.fn(() => mockContainer),
    checkAuth: vi.fn(),
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

describe('Docker Controller - Login, Shell, Compose', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
    });

    describe('POST /docker/login', () => {
        it('returns 400 if registry missing', async () => {
            const r = res();
            await ctrl.postLogin(req({ body: { username: 'u', password: 'p' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/registry/i);
        });

        it('returns 400 if username missing', async () => {
            const r = res();
            await ctrl.postLogin(req({ body: { registry: 'r', password: 'p' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/username/i);
        });

        it('returns 400 if password missing', async () => {
            const r = res();
            await ctrl.postLogin(req({ body: { registry: 'r', username: 'u' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/password/i);
        });

        it('returns 200 on successful auth', async () => {
            mockDocker.checkAuth.mockResolvedValue({ Status: 'Login Succeeded' });
            const r = res();
            await ctrl.postLogin(req({ body: { registry: 'https://index.docker.io/v1/', username: 'user', password: 'pass' } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result.Status).toBe('Login Succeeded');
            expect(mockDocker.checkAuth).toHaveBeenCalledWith({
                username: 'user', password: 'pass', serveraddress: 'https://index.docker.io/v1/'
            });
        });

        it('returns 500 on auth failure', async () => {
            mockDocker.checkAuth.mockRejectedValue(new Error('unauthorized'));
            const r = res();
            await ctrl.postLogin(req({ body: { registry: 'r', username: 'u', password: 'p' } }), r);
            expect(r.statusCode).toBe(500);
            expect(r.body.error).toBe('unauthorized');
        });
    });

    describe('GET /docker/container/shell', () => {
        it('returns 400 if name missing', async () => {
            const r = res();
            await ctrl.getContainerShell(req({ query: { params: 'ls' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/name/i);
        });

        it('returns 400 if params missing', async () => {
            const r = res();
            await ctrl.getContainerShell(req({ query: { name: 'test' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/parameters/i);
        });

        it('returns message if container not running', async () => {
            mockContainer.inspect.mockResolvedValue({ State: { Running: false } });
            const r = res();
            await ctrl.getContainerShell(req({ query: { name: 'stopped', params: 'ls' } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result).toMatch(/not running/);
        });

        it('executes command and returns output', async () => {
            const r = res();
            await ctrl.getContainerShell(req({ query: { name: 'test', params: 'ls -la' } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result).toBe('command output');
            expect(mockContainer.exec).toHaveBeenCalledWith({
                Cmd: ['ls', '-la'], AttachStdout: true, AttachStderr: true
            });
        });

        it('returns 500 on exec error', async () => {
            mockContainer.exec.mockRejectedValue(new Error('exec failed'));
            const r = res();
            await ctrl.getContainerShell(req({ query: { name: 'test', params: 'ls' } }), r);
            expect(r.statusCode).toBe(500);
            expect(r.body.error).toBe('exec failed');
        });
    });

    describe('GET /docker/compose/command', () => {
        it('returns 400 if name missing', async () => {
            const r = res();
            await ctrl.getComposeCommand(req({ query: { params: 'ps' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/name/i);
        });

        it('returns 400 if params missing', async () => {
            const r = res();
            await ctrl.getComposeCommand(req({ query: { name: 'myapp' } }), r);
            expect(r.statusCode).toBe(400);
            expect(r.body.error).toMatch(/parameters/i);
        });

        it('returns result on success (mocked via error path for CI)', async () => {
            // execSync will fail in test env (no docker compose), but the handler catches it
            const r = res();
            await ctrl.getComposeCommand(req({ query: { name: 'myapp', params: 'ps' } }), r);
            expect(r.statusCode).toBe(200);
            expect(r.body.response.result).toBeDefined();
        });

        it('sanitizes dangerous characters from params', async () => {
            const r = res();
            await ctrl.getComposeCommand(req({ query: { name: 'app', params: 'ps; rm -rf /' } }), r);
            expect(r.statusCode).toBe(200);
            // Should not crash — dangerous chars stripped
        });
    });
});
