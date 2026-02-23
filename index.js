require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 9999;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Auth
app.use('/api', authMiddleware);

// Routes
app.use('/api/server', require('./routes/server'));
app.use('/api/docker', require('./routes/docker'));
app.use('/api/dockerAPI', require('./routes/dockerAPI'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/database', require('./routes/database'));
app.use('/api/file', require('./routes/file'));
app.use('/api/notification', require('./routes/notification'));

// Root landing page
app.get('/', (req, res) => {
    const pkg = require('./package.json');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dockwatch Agent</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0d1117;color:#c9d1d9;display:flex;justify-content:center;align-items:center;min-height:100vh}
.container{max-width:640px;padding:2rem;text-align:center}
h1{font-size:1.8rem;margin-bottom:.5rem;color:#58a6ff}
.version{color:#8b949e;margin-bottom:1.5rem;font-size:.9rem}
.badge{display:inline-block;background:#238636;color:#fff;padding:.25rem .75rem;border-radius:1rem;font-size:.8rem;margin-bottom:1.5rem}
p{line-height:1.6;margin-bottom:1rem;color:#8b949e}
.endpoints{text-align:left;background:#161b22;border:1px solid #30363d;border-radius:.5rem;padding:1rem 1.5rem;margin:1.5rem 0}
.endpoints h2{font-size:1rem;color:#c9d1d9;margin-bottom:.75rem}
.endpoints ul{list-style:none;padding:0}
.endpoints li{padding:.25rem 0;font-family:monospace;font-size:.85rem;color:#7ee787}
.endpoints li span{color:#8b949e}
a{color:#58a6ff;text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="container">
<h1>&#x1F433; Dockwatch Agent</h1>
<div class="version">v${pkg.version}</div>
<div class="badge">Headless Agent</div>
<p>This is a headless Dockwatch agent. There is no web UI. All interaction is done via the REST API using an API key.</p>
<div class="endpoints">
<h2>API Groups</h2>
<ul>
<li>/api/server/* <span>- ping, time, logs, tasks</span></li>
<li>/api/docker/* <span>- containers, images, networks, volumes</span></li>
<li>/api/dockerAPI/* <span>- container recreation</span></li>
<li>/api/stats/* <span>- metrics, overview, container stats</span></li>
<li>/api/database/* <span>- settings, groups, notifications</span></li>
<li>/api/file/* <span>- config file management</span></li>
<li>/api/notification/* <span>- notification testing</span></li>
</ul>
</div>
<p>Auth via header <code style="background:#161b22;padding:.15rem .4rem;border-radius:.25rem">X-Api-Key</code> or query param <code style="background:#161b22;padding:.15rem .4rem;border-radius:.25rem">?apikey=</code></p>
<p><a href="/ping">/ping</a> - health check (no auth required)</p>
</div>
</body>
</html>`);
});

// Root Health Check
app.get('/ping', (req, res) => res.send('pong'));

// Generic 404 for API
app.use('/api', (req, res) => {
    res.status(405).json({
        code: 405,
        error: `Invalid ${req.method} request (endpoint=${req.path.replace('/', '')})`
    });
});

app.listen(PORT, () => {
    console.log(`Dockwatch Agent listening on port ${PORT}`);
});

module.exports = app;
