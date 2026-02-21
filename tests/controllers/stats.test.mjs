import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockDocker = {
    listContainers: vi.fn(),
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
    beforeEach(() => { mockDocker.listContainers.mockReset(); });

    it('getStatsContainers returns list', async () => {
        mockDocker.listContainers.mockResolvedValue([{ Id: 'a', State: 'running' }]);
        const r = res(); await getStatsContainers(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toEqual([{ Id: 'a', State: 'running' }]);
    });

    it('getStatsContainers 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsContainers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getStatsMetrics returns placeholders', async () => {
        const r = res(); await getStatsMetrics(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toHaveProperty('cpu');
        expect(r.body.response.result).toHaveProperty('memory');
        expect(r.body.response.result).toHaveProperty('disk');
    });

    it('getStatsOverview returns summary', async () => {
        mockDocker.listContainers.mockResolvedValue([
            { State: 'running' }, { State: 'running' },
            { State: 'exited' }, { State: 'paused' },
        ]);
        const r = res(); await getStatsOverview(req(), r);
        expect(r.body.code).toBe(200);
        expect(r.body.response.result).toEqual({ total: 4, running: 2, paused: 1, stopped: 1 });
    });

    it('getStatsOverview 500 on error', async () => {
        mockDocker.listContainers.mockRejectedValue(new Error('fail'));
        const r = res(); await getStatsOverview(req(), r);
        expect(r.statusCode).toBe(500);
    });
});
