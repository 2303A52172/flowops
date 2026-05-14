const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const COLORS = ['#f5a623','#00d4aa','#4d9fff','#a78bfa','#ff4d6a','#3ddc84'];

// GET /api/team
router.get('/', auth, (req, res) => {
  const db = getDB();
  const users = db.prepare('SELECT id, name, email, role, color, initials, created_at FROM users ORDER BY role DESC, name ASC').all();

  const enriched = users.map(u => {
    const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE assignee_id = ?').get(u.id).c;
    const doneCount = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE assignee_id = ? AND status = 'Done'").get(u.id).c;
    const projectCount = db.prepare('SELECT COUNT(*) as c FROM project_members WHERE user_id = ?').get(u.id).c;
    return { ...u, taskCount, doneCount, projectCount };
  });

  res.json(enriched);
});

// POST /api/team (Admin only)
router.post('/', auth, adminOnly, [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role = 'Member' } = req.body;
  const db = getDB();

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const color = COLORS[db.prepare('SELECT COUNT(*) as c FROM users').get().c % COLORS.length];
  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (name, email, password, role, color, initials) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, hash, role, color, initials);

  const user = db.prepare('SELECT id, name, email, role, color, initials FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// PATCH /api/team/:id/role (Admin only)
router.patch('/:id/role', auth, adminOnly, [
  body('role').isIn(['Admin', 'Member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, user.id);
  res.json({ message: 'Role updated' });
});

// GET /api/team/dashboard-stats
router.get('/dashboard-stats', auth, (req, res) => {
  const db = getDB();
  const uid = req.user.id;
  const isAdmin = req.user.role === 'Admin';

  const projects = isAdmin
    ? db.prepare('SELECT COUNT(*) as c FROM projects').get().c
    : db.prepare('SELECT COUNT(*) as c FROM project_members WHERE user_id = ?').get(uid).c;

  const activeProjects = isAdmin
    ? db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'Active'").get().c
    : db.prepare(`SELECT COUNT(*) as c FROM projects p JOIN project_members pm ON p.id = pm.project_id WHERE pm.user_id = ? AND p.status = 'Active'`).get(uid).c;

  const now = new Date().toISOString().split('T')[0];
  let inProgress, done, overdue;

  if (isAdmin) {
    inProgress = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'In Progress'").get().c;
    done = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'Done'").get().c;
    overdue = db.prepare("SELECT COUNT(*) as c FROM tasks WHERE status != 'Done' AND due_date < ?").get(now).c;
  } else {
    const myProjectIds = db.prepare('SELECT project_id FROM project_members WHERE user_id = ?').all(uid).map(r => r.project_id);
    if (myProjectIds.length === 0) {
      return res.json({ projects, activeProjects, inProgress: 0, done: 0, overdue: 0 });
    }
    const placeholders = myProjectIds.map(() => '?').join(',');
    inProgress = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status = 'In Progress'`).get(...myProjectIds).c;
    done = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status = 'Done'`).get(...myProjectIds).c;
    overdue = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status != 'Done' AND due_date < ?`).get(...myProjectIds, now).c;
  }

  res.json({ projects, activeProjects, inProgress, done, overdue });
});

module.exports = router;
