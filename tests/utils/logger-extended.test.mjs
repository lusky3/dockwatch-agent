import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_LOG_DIR = path.join(__dirname, '..', '_test_logs_ext');

// Set env before importing
process.env.LOG_PATH = TEST_LOG_DIR;

// Force fresh import
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);
const loggerPath = require.resolve('../../utils/logger.js');
delete require.cache[loggerPath];
const { readLog, deleteLog, purgeGroup, appendLog } = await import('../../utils/logger.js');

function cleanup() {
    if (fs.existsSync(TEST_LOG_DIR)) {
        fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
}

describe('Logger Utility - Extended coverage', () => {
    beforeEach(() => { cleanup(); });
    afterAll(() => { cleanup(); });

    // Cover purgeGroup with no matching files
    it('purgeGroup returns 0 when no files match', () => {
        appendLog('other', 'data');
        const count = purgeGroup('nomatch');
        expect(count).toBe(0);
    });

    // Cover purgeGroup with empty directory
    it('purgeGroup handles empty log directory', () => {
        // Ensure dir exists but is empty
        if (!fs.existsSync(TEST_LOG_DIR)) fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
        const count = purgeGroup('anything');
        expect(count).toBe(0);
    });

    // Cover appendLog creating the directory
    it('appendLog creates log directory if missing', () => {
        cleanup(); // Remove dir
        appendLog('newlog', 'first line');
        expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
        expect(readLog('newlog')).toContain('first line');
    });

    // Cover readLog when directory doesn't exist yet
    it('readLog creates directory and returns empty for missing file', () => {
        cleanup();
        const result = readLog('missing');
        expect(result).toBe('');
        expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
    });

    // Cover deleteLog when file doesn't exist (no-op)
    it('deleteLog is no-op when file does not exist', () => {
        if (!fs.existsSync(TEST_LOG_DIR)) fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
        expect(() => deleteLog('nonexistent')).not.toThrow();
    });

    // Cover purgeGroup creating directory
    it('purgeGroup creates directory if missing', () => {
        cleanup();
        const count = purgeGroup('test');
        expect(count).toBe(0);
        expect(fs.existsSync(TEST_LOG_DIR)).toBe(true);
    });

    // Cover safeName with numeric input
    it('handles numeric name input', () => {
        appendLog(12345, 'numeric');
        expect(readLog(12345)).toContain('numeric');
    });

    // Cover safeName with special chars that get stripped
    it('handles name with special chars', () => {
        appendLog('test@file#1', 'special');
        expect(readLog('test@file#1')).toContain('special');
    });
});
