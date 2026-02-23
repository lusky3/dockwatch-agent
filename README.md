# Dockwatch Agent

[![CI](https://github.com/lusky3/dockwatch-agent/actions/workflows/build-test.yml/badge.svg)](https://github.com/lusky3/dockwatch-agent/actions/workflows/build-test.yml)
[![codecov](https://codecov.io/github/lusky3/dockwatch-agent/graph/badge.svg?token=rNhduPFUGr)](https://codecov.io/github/lusky3/dockwatch-agent)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=lusky3_dockwatch-agent&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=lusky3_dockwatch-agent)
[![Docker Build](https://github.com/lusky3/dockwatch-agent/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/lusky3/dockwatch-agent/actions/workflows/docker-publish.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/lusky3/dockwatch-agent)](https://hub.docker.com/r/lusky3/dockwatch-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Dockwatch Agent is a lightweight, headless implementation of the Dockwatch API. It allows a primary [Dockwatch](https://github.com/Notifiarr/dockwatch) instance to manage remote Docker nodes without requiring the full Dockwatch UI and overhead on every host.

## Features

- **Lightweight**: Built with Node.js and Express for minimal footprint.
- **Headless**: No UI, designed to be controlled by a central Dockwatch instance.
- **Full Compatibility**: Implements the core Docker management endpoints used by Dockwatch.
- **Secure**: Authentication via `X-Api-Key` or `apikey` query parameter.

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name dockwatch-agent \
  -p 9999:9999 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e DOCKWATCH_API_KEY=your_secure_api_key \
  ghcr.io/lusky3/dockwatch-agent:latest
```

### Manual Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/lusky3/dockwatch-agent.git
   cd dockwatch-agent
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file:

   ```env
   PORT=9999
   DOCKWATCH_API_KEY=your_secure_api_key
   ```

4. Start the agent:

   ```bash
   npm start
   ```

## API Documentation

The agent implements the standard Dockwatch API. Key categories include:

- `/api/server/*`: Health checks and system info.
- `/api/docker/*`: Container management (start, stop, logs, inspect).
- `/api/stats/*`: Resource usage and metrics.

For detailed API definitions, see [Dockwatch API Docs](https://dockwatch.wiki/pages/misc/api/).

## Security

> **Warning**
> This agent requires access to the Docker socket (`/var/run/docker.sock`), which grants full control over the host's Docker daemon. This effectively provides root-level access to the host system. Only run this agent on trusted networks and ensure the API key is strong and kept secret. Do not expose the agent port to the public internet without additional safeguards such as a reverse proxy with TLS.
>
> For improved security, consider using a Docker socket proxy such as [Tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) to limit which API endpoints are accessible, rather than mounting the socket directly.

The agent requires an API key for all `/api/*` requests. Set this via the `DOCKWATCH_API_KEY` environment variable.

Pass the key as:

- Header: `X-Api-Key: your_key`
- Query Param: `?apikey=your_key`

## Contributing

Please read [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
