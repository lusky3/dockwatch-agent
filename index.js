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
app.use('/api/stats', require('./routes/stats'));

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
