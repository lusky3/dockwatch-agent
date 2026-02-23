import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_LOG_DIR = path.join(__dirname, '..', '_test_logs');

// Set env before importing
process.env.LOG_PATH = TEST_LOG_DIR;

// Force fresh import
const { readLog, deleteLog, purgeGroup, appendLog } = await import('../../utils/logger.js');

function cleanup() {
    if (fs.existsSync(TEST_LOG_DIR)) {
        fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
}

describe('Logger Utility', () => {
    beforeEach(() => { cleanup(); });
    afterAll(() => { cleanup(); });

    it('readLog returns empty string for missing file', () => {
        expect(readLog('nonexistent')).toBe('');
    });

    it('appendLog creates file and appends', () => {
        appendLog('test', 'hello');
        const content = readLog('test');
        expect(content).toContain('hello');
        expect(content).toMatch(/^\[.*\] hello\n$/);
    });

    it('appendLog appends multiple lines', () => {
        appendLog('multi', 'line1');
        appendLog('multi', 'line2');
        const content = readLog('multi');
        expect(content).toContain('line1');
        expect(content).toContain('line2');
    });

    it('deleteLog removes file', () => {
        appendLog('todelete', 'data');
        expect(readLog('todelete')).toContain('data');
        deleteLog('todelete');
        expect(readLog('todelete')).toBe('');
    });

    it('deleteLog does nothing for missing file', () => {
        expect(() => deleteLog('nope')).not.toThrow();
    });

    it('purgeGroup removes matching files', () => {
        appendLog('docker-pull', 'a');
        appendLog('docker-stats', 'b');
        appendLog('other', 'c');
        const count = purgeGroup('docker');
        expect(count).toBe(2);
        expect(readLog('other')).toContain('c');
    });

    it('sanitizes path traversal in name', () => {
        // path.basename strips traversal, so '../../../etc/passwd' becomes 'passwd'
        // which is a valid name — the key is it doesn't write outside LOG_DIR
        appendLog('../../../etc/passwd', 'safe');
        const content = readLog('../../../etc/passwd');
        expect(content).toContain('safe');
        // Verify it wrote to LOG_DIR/passwd.log, not /etc/passwd
        const files = fs.readdirSync(TEST_LOG_DIR);
        expect(files).toContain('passwd.log');
    });

    it('rejects names with only special characters', () => {
        expect(() => readLog('../../..')).toThrow();
    });

    it('rejects empty name', () => {
        expect(() => readLog('')).toThrow();
    });

    it('sanitizes special characters from name', () => {
        // path.basename('test/../../etc') => 'etc' which is valid after sanitization
        // but names with null bytes or only dots should fail
        expect(() => readLog('...')).toThrow();
    });
});
