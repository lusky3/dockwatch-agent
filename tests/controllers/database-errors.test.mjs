import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Create a mock db that throws on specific calls
const throwDb = {
    prepare: vi.fn(() => { throw new Error('db error'); }),
};

const dbPath = require.resolve('../../utils/database.js');
delete require.cache[dbPath];
require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: Object.assign(() => throwDb, { _setInstance: () => {}, _close: () => {} }),
};

const ctrlPath = require.resolve('../../controllers/database.js');
delete require.cache[ctrlPath];
const ctrl = await import('../../controllers/database.js');

function req(overrides = {}) { return { query: {}, body: {}, ...overrides }; }
function res() {
    const r = { statusCode: 200, body: null,
        status(c) { r.statusCode = c; return r; },
        json(d) { r.body = d; return r; },
    };
    return r;
}

describe('Database Controller - Error branches', () => {
    it('postContainerAdd 500 on db error', () => {
        const r = res();
        ctrl.postContainerAdd(req({ body: { hash: 'x' } }), r);
        expect(r.statusCode).toBe(500);
        expect(r.body.error).toBe('db error');
    });

    it('postContainerUpdate 500 on db error', () => {
        const r = res();
        ctrl.postContainerUpdate(req({ body: { hash: 'x', updates: 1 } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getContainerByHash 500 on db error', () => {
        const r = res();
        ctrl.getContainerByHash(req({ query: { hash: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getContainers 500 on db error', () => {
        const r = res();
        ctrl.getContainers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('postGroupAdd 500 on db error', () => {
        const r = res();
        ctrl.postGroupAdd(req({ body: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postGroupDelete 500 on db error', () => {
        const r = res();
        ctrl.postGroupDelete(req({ body: { id: 1 } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postGroupContainerUpdate 500 on db error', () => {
        const r = res();
        ctrl.postGroupContainerUpdate(req({ body: { name: 'x', id: 1 } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getGroupByHash 500 on db error', () => {
        const r = res();
        ctrl.getGroupByHash(req({ query: { hash: '1' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getGroups 500 on db error', () => {
        const r = res();
        ctrl.getGroups(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('postGroupContainerLinkAdd 500 on db error', () => {
        const r = res();
        ctrl.postGroupContainerLinkAdd(req({ body: { groupId: 1, containerId: 1 } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postGroupContainerLinkRemove 500 on db error', () => {
        const r = res();
        ctrl.postGroupContainerLinkRemove(req({ body: { groupId: 1, containerId: 1 } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getGroupContainerLinks 500 on db error', () => {
        const r = res();
        ctrl.getGroupContainerLinks(req({ query: { group: '1' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getGroupLinks 500 on db error', () => {
        const r = res();
        ctrl.getGroupLinks(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getNotificationPlatforms 500 on db error', () => {
        const r = res();
        ctrl.getNotificationPlatforms(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getNotificationTriggers 500 on db error', () => {
        const r = res();
        ctrl.getNotificationTriggers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getNotificationTriggerEnabled 500 on db error', () => {
        const r = res();
        ctrl.getNotificationTriggerEnabled(req({ query: { trigger: '1' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postNotificationLinkAdd 500 on db error', () => {
        const r = res();
        ctrl.postNotificationLinkAdd(req({ body: {
            platformId: 1, triggerIds: [1], platformParameters: {}, senderName: 'x'
        } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postNotificationLinkDelete 500 on db error', () => {
        const r = res();
        ctrl.postNotificationLinkDelete(req({ body: { linkId: 1 } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postNotificationLinkUpdate 500 on db error', () => {
        const r = res();
        ctrl.postNotificationLinkUpdate(req({ body: {
            linkId: 1, platformId: 1, triggerIds: [1], platformParameters: {}, senderName: 'x'
        } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getNotificationLinkByName 500 on db error', () => {
        const r = res();
        ctrl.getNotificationLinkByName(req({ query: { name: 'x' } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getLinks 500 on db error', () => {
        const r = res();
        ctrl.getLinks(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getMigrations 500 on db error', () => {
        const r = res();
        ctrl.getMigrations(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('getServers 500 on db error', () => {
        const r = res();
        ctrl.getServers(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('postServers 500 on db error', () => {
        const r = res();
        ctrl.postServers(req({ body: { serverList: [] } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('getSettings 500 on db error', () => {
        const r = res();
        ctrl.getSettings(req(), r);
        expect(r.statusCode).toBe(500);
    });

    it('postSettings 500 on db error', () => {
        const r = res();
        ctrl.postSettings(req({ body: { newSettings: { a: '1' } } }), r);
        expect(r.statusCode).toBe(500);
    });

    it('postSetting 500 on db error', () => {
        const r = res();
        ctrl.postSetting(req({ body: { setting: 'x', value: '1' } }), r);
        expect(r.statusCode).toBe(500);
    });
});
