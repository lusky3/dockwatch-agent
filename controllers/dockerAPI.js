const getDocker = require('../utils/docker');

const getContainerCreate = async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ code: 400, error: 'Missing required param(s)' });
    try {
        const docker = getDocker();
        const container = docker.getContainer(name);
        const inspect = await container.inspect();

        // Recreate container from inspect data
        const config = {
            Image: inspect.Config.Image,
            name: inspect.Name.replace(/^\//, ''),
            Env: inspect.Config.Env,
            ExposedPorts: inspect.Config.ExposedPorts,
            HostConfig: inspect.HostConfig,
            NetworkingConfig: {
                EndpointsConfig: inspect.NetworkSettings.Networks
            },
            Labels: inspect.Config.Labels,
            Cmd: inspect.Config.Cmd,
            Entrypoint: inspect.Config.Entrypoint,
            WorkingDir: inspect.Config.WorkingDir,
            Volumes: inspect.Config.Volumes
        };

        // Stop and remove old container
        try { await container.stop(); } catch { /* may already be stopped */ }
        try { await container.remove(); } catch { /* ignore */ }

        // Create and start new container
        const newContainer = await docker.createContainer(config);
        await newContainer.start();
        const newInspect = await newContainer.inspect();

        res.json({ code: 200, response: { result: newInspect } });
    } catch (error) {
        res.status(500).json({ code: 500, error: error.message });
    }
};

module.exports = { getContainerCreate };
