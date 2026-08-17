const getDocker = require('../utils/docker');

// --- Existing endpoints ---

const getProcessList = async (req, res) => {
    try {
        const containers = await getDocker().listContainers({ all: true });
        res.json({ code: 200, response: { result: containers } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getContainerInspect = async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        const data = await container.inspect();
        res.json({ code: 200, response: { result: data } });
    } catch (error) {
        res.status(404).json({ code: 404, error: error.message });
    }
};

const getContainerLogs = async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        const logs = await container.logs({ stdout: true, stderr: true, tail: 100, timestamps: true });
        res.json({ code: 200, response: { result: logs.toString('utf8') } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerStart = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        await container.start();
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerStop = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        await container.stop();
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerRestart = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        await container.restart();
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- New endpoints ---

const postContainerKill = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        await container.kill();
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerPull = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const docker = getDocker();
        const container = docker.getContainer(name);
        const inspect = await container.inspect();
        const image = inspect.Config.Image;

        const stream = await docker.pull(image);
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, output) => {
                if (err) reject(err);
                else resolve(output);
            });
        });
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerRemove = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        await container.remove({ force: true });
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postContainerCreate = async (req, res) => {
    const { inspect } = req.body;
    if (!inspect) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const docker = getDocker();
        const container = await docker.createContainer(inspect);
        await container.start();
        const data = await container.inspect();
        res.json({ code: 200, response: { result: data } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getContainerPorts = async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        const data = await container.inspect();
        const ports = data.NetworkSettings.Ports || {};
        res.json({ code: 200, response: { result: ports } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getCreateCompose = async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        const data = await container.inspect();
        const compose = buildComposeFromInspect(data);
        res.json({ code: 200, response: { result: compose } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getCreateRun = async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const container = getDocker().getContainer(name);
        const data = await container.inspect();
        const cmd = buildRunFromInspect(data);
        res.json({ code: 200, response: { result: cmd } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postImageRemove = async (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const img = getDocker().getImage(image);
        await img.remove({ force: true });
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getImagesSizes = async (req, res) => {
    try {
        const images = await getDocker().listImages();
        const sizes = images.map(i => ({
            id: i.Id,
            repoTags: i.RepoTags,
            size: i.Size,
            virtualSize: i.VirtualSize,
            created: i.Created
        }));
        res.json({ code: 200, response: { result: sizes } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getNetworks = async (req, res) => {
    try {
        const networks = await getDocker().listNetworks();
        res.json({ code: 200, response: { result: networks } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postNetworkRemove = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const network = getDocker().getNetwork(name);
        await network.remove();
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getOrphansContainers = async (req, res) => {
    try {
        const containers = await getDocker().listContainers({ all: true, filters: { status: ['exited'] } });
        res.json({ code: 200, response: { result: containers } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getOrphansNetworks = async (req, res) => {
    try {
        const networks = await getDocker().listNetworks();
        const orphaned = networks.filter(n =>
            !['bridge', 'host', 'none'].includes(n.Name) &&
            Object.keys(n.Containers || {}).length === 0
        );
        res.json({ code: 200, response: { result: orphaned } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getOrphansVolumes = async (req, res) => {
    try {
        const data = await getDocker().listVolumes();
        const volumes = (data.Volumes || []).filter(v => {
            const labels = v.Labels || {};
            return Object.keys(labels).length === 0;
        });
        res.json({ code: 200, response: { result: volumes } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getPermissions = async (req, res) => {
    try {
        await getDocker().ping();
        res.json({ code: 200, response: { result: { hasAccess: true } } });
    } catch (error) {
        res.json({ code: 200, response: { result: { hasAccess: false, error: error.message } } });
    }
};

const getStats = async (req, res) => {
    try {
        const containers = await getDocker().listContainers({ all: true });
        const statsPromises = containers
            .filter(c => c.State === 'running')
            .map(async (c) => {
                try {
                    const container = getDocker().getContainer(c.Id);
                    const stats = await container.stats({ stream: false });
                    return { id: c.Id, name: c.Names[0], stats };
                } catch {
                    return { id: c.Id, name: c.Names[0], stats: null };
                }
            });
        const results = await Promise.all(statsPromises);
        res.json({ code: 200, response: { result: results } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const getUnusedContainers = async (req, res) => {
    try {
        const containers = await getDocker().listContainers({
            all: true,
            filters: { status: ['created', 'exited'] }
        });
        res.json({ code: 200, response: { result: containers } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

const postVolumeRemove = async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const volume = getDocker().getVolume(id);
        await volume.remove();
        res.json({ code: 200, response: { result: 'success' } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- Helpers ---

function extractPorts(portBindings) {
    const ports = [];
    if (!portBindings) return ports;
    for (const [containerPort, bindings] of Object.entries(portBindings)) {
        for (const b of bindings ?? []) {
            ports.push(`${b.HostPort}:${containerPort.replace('/tcp', '')}`);
        }
    }
    return ports;
}

function buildComposeFromInspect(data) {
    const svc = { image: data.Config.Image };
    const cName = data.Name.replace(/^\//, '');

    if (data.Config.Env?.length) {
        svc.environment = data.Config.Env;
    }
    const ports = extractPorts(data.HostConfig.PortBindings);
    if (ports.length) svc.ports = ports;
    if (data.HostConfig.Binds?.length) {
        svc.volumes = data.HostConfig.Binds;
    }
    if (data.HostConfig.RestartPolicy?.Name) {
        svc.restart = data.HostConfig.RestartPolicy.Name;
    }

    return { services: { [cName]: svc } };
}

function buildRunFromInspect(data) {
    const parts = ['docker run -d'];
    const cName = data.Name.replace(/^\//, '');
    parts.push(`--name ${cName}`);

    if (data.HostConfig.RestartPolicy?.Name) {
        parts.push(`--restart ${data.HostConfig.RestartPolicy.Name}`);
    }
    for (const p of extractPorts(data.HostConfig.PortBindings)) {
        parts.push(`-p ${p}`);
    }
    for (const bind of data.HostConfig.Binds ?? []) {
        parts.push(`-v ${bind}`);
    }
    for (const env of data.Config.Env ?? []) {
        parts.push(`-e ${env}`);
    }
    parts.push(data.Config.Image);
    return parts.join(' \\\n  ');
}

// --- POST /docker/login ---
const postLogin = async (req, res) => {
    const { registry, username, password } = req.body;
    if (!registry) return res.status(400).json({ code: 400, error: 'Missing registry parameter' });
    if (!username) return res.status(400).json({ code: 400, error: 'Missing username parameter' });
    if (!password) return res.status(400).json({ code: 400, error: 'Missing password parameter' });
    try {
        const auth = { username, password, serveraddress: registry };
        const result = await getDocker().checkAuth(auth);
        res.json({ code: 200, response: { result } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- GET /docker/container/shell ---
const getContainerShell = async (req, res) => {
    const { name, params } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing name parameter' });
    if (!params) return res.status(400).json({ code: 400, error: 'Missing parameters' });
    try {
        const container = getDocker().getContainer(name);
        const info = await container.inspect();
        if (!info.State.Running) {
            return res.json({ code: 200, response: { result: `Container ${name} is not running or does not exist` } });
        }
        const cmd = typeof params === 'string' ? params.split(' ') : params;
        const exec = await container.exec({ Cmd: cmd, AttachStdout: true, AttachStderr: true });
        const stream = await exec.start({ Detach: false, Tty: false });
        let output = '';
        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => { output += chunk.toString(); });
            stream.on('end', resolve);
            stream.on('error', reject);
        });
        // Strip dockerode demux header bytes from each frame
        // eslint-disable-next-line no-control-regex
        const cleaned = output.replace(/[\u0000-\u0008]/g, '').trim();
        res.json({ code: 200, response: { result: cleaned } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

// --- GET /docker/compose/command ---
const getComposeCommand = async (req, res) => {
    const { name, params } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing name parameter' });
    if (!params) return res.status(400).json({ code: 400, error: 'Missing parameters' });
    try {
        const { execSync } = require('child_process');
        const safeName = name.replace(/[^a-zA-Z0-9_\-.]/g, '');
        const safeParams = params.replace(/[;&|`$]/g, '');
        const cmd = `docker compose ${safeParams} ${safeName}`;
        const result = execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim();
        res.json({ code: 200, response: { result } });
    } catch (error) {
        const output = error.stdout || error.stderr || error.message;
        res.json({ code: 200, response: { result: output } });
    }
};

module.exports = {
    getProcessList, getContainerInspect, getContainerLogs,
    postContainerStart, postContainerStop, postContainerRestart,
    postContainerKill, postContainerPull, postContainerRemove, postContainerCreate,
    getContainerPorts, getCreateCompose, getCreateRun,
    postImageRemove, getImagesSizes,
    getNetworks, postNetworkRemove,
    getOrphansContainers, getOrphansNetworks, getOrphansVolumes,
    getPermissions, getStats, getUnusedContainers, postVolumeRemove,
    postLogin, getContainerShell, getComposeCommand
};
