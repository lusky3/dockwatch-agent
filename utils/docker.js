const Docker = require('dockerode');

let _docker = null;

function getDocker() {
    if (!_docker) {
        _docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }
    return _docker;
}

// For testing: allows injecting a mock
getDocker._setInstance = (instance) => { _docker = instance; };

module.exports = getDocker;
