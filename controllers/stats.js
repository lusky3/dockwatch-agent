const getDocker = require('../utils/docker');

function calcCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;
    if (systemDelta > 0 && cpuDelta >= 0) {
        return ((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2);
    }
    return '0.00';
}

function calcMemPercent(stats) {
    const usage = stats.memory_stats.usage || 0;
    const limit = stats.memory_stats.limit || 1;
    return ((usage / limit) * 100).toFixed(2);
}

function calcNetworkIO(stats) {
    const networks = stats.networks || {};
    let rxBytes = 0, txBytes = 0;
    for (const iface of Object.values(networks)) {
        rxBytes += iface.rx_bytes || 0;
        txBytes += iface.tx_bytes || 0;
    }
    return { rxBytes, txBytes };
}

function calcBlockIO(stats) {
    const entries = stats.blkio_stats?.io_service_bytes_recursive || [];
    let read = 0, write = 0;
    for (const e of entries) {
        if (e.op === 'read' || e.op === 'Read') read += e.value;
        if (e.op === 'write' || e.op === 'Write') write += e.value;
    }
    return { read, write };
}

const getStatsContainers = async (req, res) => {
    try {
        const docker = getDocker();
        const containers = await docker.listContainers({ all: true });

        const enriched = await Promise.all(containers.map(async (c) => {
            const entry = {
                id: c.Id,
                name: (c.Names[0] || '').replace(/^\//, ''),
                image: c.Image,
                state: c.State,
                status: c.Status,
                created: c.Created,
                ports: c.Ports,
                labels: c.Labels,
                cpu: '0.00',
                memoryUsage: 0,
                memoryLimit: 0,
                memoryPercent: '0.00',
                networkRx: 0,
                networkTx: 0,
                blockRead: 0,
                blockWrite: 0
            };

            if (c.State === 'running') {
                try {
                    const container = docker.getContainer(c.Id);
                    const stats = await container.stats({ stream: false });
                    entry.cpu = calcCpuPercent(stats);
                    entry.memoryUsage = stats.memory_stats.usage || 0;
                    entry.memoryLimit = stats.memory_stats.limit || 0;
                    entry.memoryPercent = calcMemPercent(stats);
                    const net = calcNetworkIO(stats);
                    entry.networkRx = net.rxBytes;
                    entry.networkTx = net.txBytes;
                    const blk = calcBlockIO(stats);
                    entry.blockRead = blk.read;
                    entry.blockWrite = blk.write;
                } catch { /* stats unavailable */ }
            }
            return entry;
        }));

        res.json({ code: 200, response: { result: enriched } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getStatsMetrics = async (req, res) => {
    try {
        const docker = getDocker();
        const containers = await docker.listContainers();
        let totalCpu = 0, totalMem = 0, totalMemLimit = 0;

        for (const c of containers) {
            try {
                const container = docker.getContainer(c.Id);
                const stats = await container.stats({ stream: false });
                totalCpu += Number.parseFloat(calcCpuPercent(stats));
                totalMem += stats.memory_stats.usage || 0;
                totalMemLimit += stats.memory_stats.limit || 0;
            } catch { /* skip */ }
        }

        res.json({
            code: 200,
            response: {
                result: {
                    containers: containers.length,
                    cpu: totalCpu.toFixed(2),
                    memory: totalMem,
                    memoryLimit: totalMemLimit,
                    memoryPercent: totalMemLimit > 0 ? ((totalMem / totalMemLimit) * 100).toFixed(2) : '0.00'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getStatsOverview = async (req, res) => {
    try {
        const docker = getDocker();
        const containers = await docker.listContainers({ all: true });
        const images = await docker.listImages();
        const networks = await docker.listNetworks();
        let volumes = [];
        try {
            const volData = await docker.listVolumes();
            volumes = volData.Volumes || [];
        } catch { /* ignore */ }

        const summary = {
            total: containers.length,
            running: containers.filter(c => c.State === 'running').length,
            paused: containers.filter(c => c.State === 'paused').length,
            stopped: containers.filter(c => c.State === 'exited').length,
            images: images.length,
            networks: networks.length,
            volumes: volumes.length
        };
        res.json({ code: 200, response: { result: summary } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

module.exports = { getStatsContainers, getStatsMetrics, getStatsOverview };
