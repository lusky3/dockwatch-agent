import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockStore = {
    readJsonFile: vi.fn(),
    writeJsonFile: vi.fn(),
    FILES: ['dependency', 'pull', 'sse', 'state', 'stats'],
};

const storePath = require.resolve('../../utils/fileStore.js');
delete require.cache[storePath];
require.cache[storePath] = { id: storePath, filename: storePath, loaded: true, exports: mockStore };

const ctrlPath = require.resolve('../../controllers/file.js');
delete require.cache[ctrlPath];
const handlers = await import('../../controllers/file.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('File Controller', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    for (const name of mockStore.FILES) {
        it(`GET ${name} returns contents`, () => {
            mockStore.readJsonFile.mockReturnValue({ key: 'val' });
            const r = res();
            handlers.default[name].get(req(), r);
            expect(r.body.code).toBe(200);
            expect(mockStore.readJsonFile).toHaveBeenCalledWith(name);
        });

        it(`GET ${name} 500 on error`, () => {
            mockStore.readJsonFile.mockImplementation(() => { throw new Error('fail'); });
            const r = res();
            handlers.default[name].get(req(), r);
            expect(r.statusCode).toBe(500);
        });

        it(`POST ${name} writes contents`, () => {
            mockStore.writeJsonFile.mockImplementation(() => {});
            const r = res();
            handlers.default[name].post(req({ body: { contents: { a: 1 } } }), r);
            expect(r.body.response.result).toBe('success');
            expect(mockStore.writeJsonFile).toHaveBeenCalledWith(name, { a: 1 });
        });

        it(`POST ${name} 400 missing contents`, () => {
            const r = res();
            handlers.default[name].post(req({ body: {} }), r);
            expect(r.statusCode).toBe(400);
        });

        it(`POST ${name} 500 on error`, () => {
            mockStore.writeJsonFile.mockImplementation(() => { throw new Error('fail'); });
            const r = res();
            handlers.default[name].post(req({ body: { contents: {} } }), r);
            expect(r.statusCode).toBe(500);
        });
    }
});
