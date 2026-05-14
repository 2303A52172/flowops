require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/team');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/team', teamRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize DB and start
initDB();
app.listen(PORT, () => {
  console.log(`🚀 FlowOps API running on port ${PORT}`);
});

module.exports = app;
