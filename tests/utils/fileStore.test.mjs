import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_DIR = path.join(__dirname, '..', '_test_config');

process.env.CONFIG_PATH = TEST_CONFIG_DIR;

// Force fresh import
const { readJsonFile, writeJsonFile, FILES } = await import('../../utils/fileStore.js');

function cleanup() {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
        fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
}

describe('FileStore Utility', () => {
    beforeEach(() => { cleanup(); });
    afterAll(() => { cleanup(); });

    it('FILES contains expected names', () => {
        expect(FILES).toEqual(['dependency', 'pull', 'sse', 'state', 'stats']);
    });

    it('readJsonFile returns empty object for missing file', () => {
        expect(readJsonFile('dependency')).toEqual({});
    });

    it('writeJsonFile and readJsonFile round-trip', () => {
        writeJsonFile('stats', { containers: 5 });
        const data = readJsonFile('stats');
        expect(data.containers).toBe(5);
    });

    it('writeJsonFile overwrites existing', () => {
        writeJsonFile('state', { v: 1 });
        writeJsonFile('state', { v: 2 });
        expect(readJsonFile('state').v).toBe(2);
    });

    it('rejects invalid file names', () => {
        expect(() => readJsonFile('evil')).toThrow('Invalid file name');
        expect(() => writeJsonFile('../../etc/passwd', {})).toThrow('Invalid file name');
    });

    it('rejects path traversal attempts', () => {
        expect(() => readJsonFile('../../../etc/passwd')).toThrow();
    });
});
