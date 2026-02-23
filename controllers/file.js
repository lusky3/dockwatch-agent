const { readJsonFile, writeJsonFile, FILES } = require('../utils/fileStore');

function makeHandler(name) {
    return {
        get: (req, res) => {
            try {
                const contents = readJsonFile(name);
                res.json({ code: 200, response: { result: contents } });
            } catch (error) {
                res.status(500).json({ code: 500, error: error.message });
            }
        },
        post: (req, res) => {
            const { contents } = req.body;
            if (!contents) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
            try {
                writeJsonFile(name, contents);
                res.json({ code: 200, response: { result: 'success' } });
            } catch (error) {
                res.status(500).json({ code: 500, error: error.message });
            }
        }
    };
}

const handlers = {};
for (const f of FILES) handlers[f] = makeHandler(f);

module.exports = handlers;
