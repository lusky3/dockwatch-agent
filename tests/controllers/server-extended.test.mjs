import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockLogger = {
    readLog: vi.fn(),
    deleteLog: vi.fn(),
    purgeGroup: vi.fn(),
    appendLog: vi.fn(),
};

const loggerPath = require.resolve('../../utils/logger.js');
delete require.cache[loggerPath];
require.cache[loggerPath] = { id: loggerPath, filename: loggerPath, loaded: true, exports: mockLogger };

const ctrlPath = require.resolve('../../controllers/server.js');
delete require.cache[ctrlPath];
const { getServerPing, getServerTime, getServerLog, postLogDelete, postLogPurge, postTaskRun } = await import('../../controllers/server.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('Server Controller - Extended', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    // --- getServerPing ---
    it('getServerPing returns version string', () => {
        const r = res();
        getServerPing(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toMatch(/^v\d+\.\d+\.\d+ - v\d+\.\d+\.\d+$/);
    });

    // --- getServerTime ---
    it('getServerTime returns time and timezone', () => {
        const r = res();
        getServerTime(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toHaveProperty('time');
        expect(r.body.response.result).toHaveProperty('timezone');
        expect(r.body.response.result.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    // --- getServerLog ---
    it('getServerLog returns log contents', () => {
        mockLogger.readLog.mockReturnValue('line1\nline2');
        const r = res();
        getServerLog(req({ query: { name: 'app' } }), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toBe('line1\nline2');
    });

    it('getServerLog 400 missing name', () => {
        const r = res();
        getServerLog(req(), r);
        expect(r.statusCode).toBe(400);
    });

    it('getServerLog 500 on error', () => {
        mockLogger.readLog.mockImplementation(() => { throw new Error('fail'); });
        const r = res();
        getServerLog(req({ query: { name: 'app' } }), r);
        expect(r.statusCode).toBe(500);
    });

    // --- postLogDelete ---
    it('postLogDelete success', () => {
        const r = res();
        postLogDelete(req({ body: { log: 'app' } }), r);
        expect(r.body.response.result).toBe('success');
        expect(mockLogger.deleteLog).toHaveBeenCalledWith('app');
    });

    it('postLogDelete 400 missing log', () => {
        const r = res();
        postLogDelete(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postLogDelete 500 on error', () => {
        mockLogger.deleteLog.mockImplementation(() => { throw new Error('fail'); });
        const r = res();
        postLogDelete(req({ body: { log: 'app' } }), r);
        expect(r.statusCode).toBe(500);
    });

    // --- postLogPurge ---
    it('postLogPurge success', () => {
        mockLogger.purgeGroup.mockReturnValue(3);
        const r = res();
        postLogPurge(req({ body: { group: 'docker' } }), r);
        expect(r.body.response.result).toBe('Purged 3 log(s)');
    });

    it('postLogPurge 400 missing group', () => {
        const r = res();
        postLogPurge(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postLogPurge 500 on error', () => {
        mockLogger.purgeGroup.mockImplementation(() => { throw new Error('fail'); });
        const r = res();
        postLogPurge(req({ body: { group: 'docker' } }), r);
        expect(r.statusCode).toBe(500);
    });

    // --- postTaskRun ---
    it('postTaskRun success', () => {
        const r = res();
        postTaskRun(req({ body: { task: 'pull' } }), r);
        expect(r.body.response.result).toContain('pull');
        expect(mockLogger.appendLog).toHaveBeenCalled();
    });

    it('postTaskRun 400 missing task', () => {
        const r = res();
        postTaskRun(req({ body: {} }), r);
        expect(r.statusCode).toBe(400);
    });

    it('postTaskRun 500 on error', () => {
        mockLogger.appendLog.mockImplementation(() => { throw new Error('fail'); });
        const r = res();
        postTaskRun(req({ body: { task: 'pull' } }), r);
        expect(r.statusCode).toBe(500);
    });
});
