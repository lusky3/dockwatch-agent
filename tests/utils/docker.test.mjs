import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('utils/docker', () => {
    beforeEach(() => {
        // Clear module cache to get a fresh instance each test
        const dockerPath = require.resolve('../../utils/docker.js');
        delete require.cache[dockerPath];
    });

    it('exports a getDocker function with _setInstance', () => {
        const getDocker = require('../../utils/docker.js');
        expect(typeof getDocker).toBe('function');
        expect(typeof getDocker._setInstance).toBe('function');
    });

    it('getDocker returns a dockerode instance with socketPath', () => {
        const getDocker = require('../../utils/docker.js');
        const docker = getDocker();
        // Dockerode instance should have modem with socketPath
        expect(docker).toBeDefined();
        expect(docker.modem).toBeDefined();
        expect(docker.modem.socketPath).toBe('/var/run/docker.sock');
    });

    it('getDocker returns the same instance on subsequent calls (singleton)', () => {
        const getDocker = require('../../utils/docker.js');
        const a = getDocker();
        const b = getDocker();
        expect(a).toBe(b);
    });

    it('_setInstance replaces the singleton', () => {
        const getDocker = require('../../utils/docker.js');
        const mock = { fake: true };
        getDocker._setInstance(mock);
        expect(getDocker()).toBe(mock);
    });
});
