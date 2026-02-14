const docker = require('../utils/docker');

const getStatsContainers = async (req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        // Dockwatch dashboard expects specific formatting usually, but the API doc doesn't specify.
        // Returning the list of containers for now.
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

const getStatsMetrics = async (req, res) => {
    // metrics endpoint usually returns system info (cpu, mem)
    res.json({
        code: 200,
        response: {
            result: {
                cpu: 0,
                memory: 0,
                disk: 0
            }
        }
    });
};

const getStatsOverview = async (req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        const summary = {
            total: containers.length,
            running: containers.filter(c => c.State === 'running').length,
            paused: containers.filter(c => c.State === 'paused').length,
            stopped: containers.filter(c => c.State === 'exited').length
        };
        res.json({
            code: 200,
            response: {
                result: summary
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

module.exports = {
    getStatsContainers,
    getStatsMetrics,
    getStatsOverview
};
