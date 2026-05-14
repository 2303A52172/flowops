const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db');
const { auth, JWT_SECRET } = require('../middleware/auth');

const COLORS = ['#f5a623','#00d4aa','#4d9fff','#a78bfa','#ff4d6a','#3ddc84'];

// POST /api/auth/signup
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role = 'Member' } = req.body;
  const db = getDB();

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (name, email, password, role, color, initials) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, hash, role, color, initials);

  const user = db.prepare('SELECT id, name, email, role, color, initials FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password: _, ...safeUser } = user;
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json(safeUser);
});

module.exports = router;
