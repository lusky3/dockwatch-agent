// In-memory TTL cache (equivalent to upstream PHP memcache)
const cache = new Map();

function cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (entry.expiresAt <= now) {
            cache.delete(key);
        }
    }
}

// Periodic cleanup every 60s
setInterval(cleanExpired, 60000).unref();

// --- GET /system/memcache/get ---
const getMemcache = (req, res) => {
    const { key } = req.query;
    if (!key) return res.status(400).json({ code: 400, error: 'Missing key parameter' });

    const entry = cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return res.json({ code: 200, response: { result: null } });
    }

    res.json({ code: 200, response: { result: entry.value } });
};

// --- POST /system/memcache/set ---
const postMemcacheSet = (req, res) => {
    const { key, value, seconds } = req.body;
    if (!key) return res.status(400).json({ code: 400, error: 'Missing key parameter' });
    if (value === undefined || value === null) return res.status(400).json({ code: 400, error: 'Missing value parameter' });
    if (!seconds) return res.status(400).json({ code: 400, error: 'Missing seconds parameter' });

    const ttl = parseInt(seconds, 10);
    cache.set(key, {
        value,
        expiresAt: Date.now() + (ttl * 1000)
    });

    res.json({ code: 200, response: { result: true } });
};

// Expose cache for testing
getMemcache._cache = cache;
postMemcacheSet._cache = cache;

module.exports = { getMemcache, postMemcacheSet };
