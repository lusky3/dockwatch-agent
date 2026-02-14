const docker = require('../utils/docker');

const getProcessList = async (req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        res.json({
            code: 200,
            response: {
                result: containers
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getContainerInspect = async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: "Missing required param(s)" });
    
    try {
        const container = docker.getContainer(name);
        const data = await container.inspect();
        res.json({
            code: 200,
            response: {
                result: data
            }
        });
    } catch (error) {
        res.status(404).json({ code: 404, error: error.message });
    }
};

const getContainerLogs = async (req, res) => {
    const { name } = req.query;
    // Note: The API docs say "No parameters" but also say "/api/docker/container/logs" needs to know which container.
    // Usually these logs endpoints take a name or use a specific format.
    // I'll assume it needs a name as a query param like inspect.
    if (!name) return res.status(400).json({ code: 400, error: "Missing required param(s)" });

    try {
        const container = docker.getContainer(name);
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            tail: 100,
            timestamps: true
        });
        res.json({
            code: 200,
            response: {
                result: logs.toString('utf8')
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerStart = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: "Missing required param(s)" });

    try {
        const container = docker.getContainer(name);
        await container.start();
        res.json({
            code: 200,
            response: {
                result: "success"
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerStop = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: "Missing required param(s)" });

    try {
        const container = docker.getContainer(name);
        await container.stop();
        res.json({
            code: 200,
            response: {
                result: "success"
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerRestart = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: "Missing required param(s)" });

    try {
        const container = docker.getContainer(name);
        await container.restart();
        res.json({
            code: 200,
            response: {
                result: "success"
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

module.exports = {
    getProcessList,
    getContainerInspect,
    getContainerLogs,
    postContainerStart,
    postContainerStop,
    postContainerRestart
};
