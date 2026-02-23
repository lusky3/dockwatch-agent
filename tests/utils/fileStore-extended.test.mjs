import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_DIR = path.join(__dirname, '..', '_test_config_ext');

process.env.CONFIG_PATH = TEST_CONFIG_DIR;

// Force fresh import
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const storePath = require.resolve('../../utils/fileStore.js');
delete require.cache[storePath];
const { readJsonFile, writeJsonFile, FILES } = await import('../../utils/fileStore.js');

function cleanup() {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
        fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
}

describe('FileStore Utility - Extended coverage', () => {
    beforeEach(() => { cleanup(); });
    afterAll(() => { cleanup(); });

    // Cover ensureDir creating directory
    it('readJsonFile creates config directory if missing', () => {
        cleanup();
        const result = readJsonFile('dependency');
        expect(result).toEqual({});
        expect(fs.existsSync(TEST_CONFIG_DIR)).toBe(true);
    });

    // Cover writeJsonFile creating directory
    it('writeJsonFile creates config directory if missing', () => {
        cleanup();
        writeJsonFile('stats', { test: true });
        expect(fs.existsSync(TEST_CONFIG_DIR)).toBe(true);
        expect(readJsonFile('stats').test).toBe(true);
    });

    // Cover readJsonFile with corrupted JSON
    it('readJsonFile returns empty object for corrupted JSON', () => {
        if (!fs.existsSync(TEST_CONFIG_DIR)) fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
        const fp = path.join(TEST_CONFIG_DIR, 'state.json');
        fs.writeFileSync(fp, '{invalid json!!!', 'utf8');
        const result = readJsonFile('state');
        expect(result).toEqual({});
    });

    // Cover all valid file names
    it('handles all valid file names', () => {
        for (const name of FILES) {
            writeJsonFile(name, { name });
            expect(readJsonFile(name).name).toBe(name);
        }
    });
});
