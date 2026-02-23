const getDocker = require('../utils/docker');
const os = require('os');

// --- Formatting helpers ---

function formatPrecision(val) {
    if (val < 10) return val.toFixed(2);
    if (val < 100) return val.toFixed(1);
    return val.toFixed(0);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${formatPrecision(val)}${units[i]}`;
}

function formatBytesIEC(bytes) {
    if (bytes === 0) return '0B';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${formatPrecision(val)}${units[i]}`;
}

function calcCpuPercent(stats) {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;
    if (systemDelta > 0 && cpuDelta >= 0) {
        return ((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2);
    }
    return '0.00';
}

function calcMemUsage(stats) {
    return {
        usage: stats.memory_stats.usage || 0,
        limit: stats.memory_stats.limit || 0
    };
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

function formatUptime(createdTs) {
    const now = Date.now() / 1000;
    let diff = Math.floor(now - createdTs);
    if (diff < 0) diff = 0;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    parts.push(`${hours}h${String(minutes).padStart(2, '0')}m`);
    return parts.join('');
}

function formatCreatedAt(ts) {
    const d = new Date(ts * 1000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const pad = (n) => String(n).padStart(2, '0');
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOff = Math.abs(offset);
    const offH = String(Math.floor(absOff / 60)).padStart(2, '0');
    const offM = String(absOff % 60).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ` +
        `${sign}${offH}${offM} ${tz}`;
}

function getNetworkMode(container) {
    if (container.HostConfig?.NetworkMode) return container.HostConfig.NetworkMode;
    const nets = container.NetworkSettings?.Networks;
    if (nets) {
        const keys = Object.keys(nets);
        if (keys.length > 0) return keys[0];
    }
    return 'default';
}

function getHealthStatus(inspect) {
    return inspect?.State?.Health?.Status || 'none';
}

function getImageSize(images, imageName) {
    if (!images || !imageName) return null;
    const match = images.find(img =>
        img.RepoTags?.some(tag => tag === imageName || imageName.startsWith(tag.split(':')[0]))
    );
    return match ? formatBytes(match.Size) : null;
}

const getStatsContainers = async (req, res) => {
    try {
        const docker = getDocker();
        const containers = await docker.listContainers({ all: true });
        const images = await docker.listImages();
        const hostname = os.hostname();

        const enriched = await Promise.all(containers.map(async (c) => {
            const name = (c.Names[0] || '').replace(/^\//, '');
            const imageSize = getImageSize(images, c.Image);

            const entry = {
                id: c.Id,
                name,
                image: c.Image,
                imageSize: imageSize || 'unknown',
                status: c.State,
                health: 'none',
                createdAt: formatCreatedAt(c.Created),
                uptime: c.State === 'running' ? formatUptime(c.Created) : '0h00m',
                networkMode: 'default',
                ports: c.Ports || [],
                dockwatch: {
                    pull: 'Up-to-date',
                    lastPull: null
                },
                usage: {
                    cpuPerc: '0.00%',
                    memPerc: '0.00%',
                    memSize: '0B / 0B',
                    blockIO: '0B / 0B',
                    netIO: '0B / 0B'
                },
                server: hostname
            };

            if (c.State === 'running') {
                try {
                    const container = docker.getContainer(c.Id);
                    const [stats, inspect] = await Promise.all([
                        container.stats({ stream: false }),
                        container.inspect()
                    ]);

                    entry.health = getHealthStatus(inspect);
                    entry.networkMode = getNetworkMode(inspect);

                    const cpu = calcCpuPercent(stats);
                    const mem = calcMemUsage(stats);
                    const memPerc = mem.limit > 0
                        ? ((mem.usage / mem.limit) * 100).toFixed(2)
                        : '0.00';
                    const net = calcNetworkIO(stats);
                    const blk = calcBlockIO(stats);

                    entry.usage = {
                        cpuPerc: `${cpu}%`,
                        memPerc: `${memPerc}%`,
                        memSize: `${formatBytesIEC(mem.usage)} / ${formatBytesIEC(mem.limit)}`,
                        blockIO: `${formatBytes(blk.read)} / ${formatBytes(blk.write)}`,
                        netIO: `${formatBytes(net.rxBytes)} / ${formatBytes(net.txBytes)}`
                    };
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
                const mem = calcMemUsage(stats);
                totalMem += mem.usage;
                totalMemLimit += mem.limit;
            } catch { /* skip */ }
        }

        const memPerc = totalMemLimit > 0
            ? ((totalMem / totalMemLimit) * 100).toFixed(2)
            : '0.00';

        res.json({
            code: 200,
            response: {
                result: {
                    containers: containers.length,
                    cpu: `${totalCpu.toFixed(2)}%`,
                    memory: formatBytesIEC(totalMem),
                    memoryLimit: formatBytesIEC(totalMemLimit),
                    memoryPercent: `${memPerc}%`
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
