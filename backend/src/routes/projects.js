const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/projects
router.get('/', auth, (req, res) => {
  const db = getDB();
  const { id, role } = req.user;

  let projects;
  if (role === 'Admin') {
    projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  } else {
    projects = db.prepare(`
      SELECT p.* FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(id);
  }

  // Enrich with members and task counts
  projects = projects.map(p => {
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.color, u.initials
      FROM users u JOIN project_members pm ON u.id = pm.user_id
      WHERE pm.project_id = ?
    `).all(p.id);
    const taskCounts = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status
    `).all(p.id);
    const counts = {};
    taskCounts.forEach(r => { counts[r.status] = r.count; });
    return { ...p, members, taskCounts: counts };
  });

  res.json(projects);
});

// GET /api/projects/:id
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const isMember = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(project.id, req.user.id);
  if (!isMember && req.user.role !== 'Admin') return res.status(403).json({ error: 'Access denied' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.color, u.initials
    FROM users u JOIN project_members pm ON u.id = pm.user_id WHERE pm.project_id = ?
  `).all(project.id);

  res.json({ ...project, members });
});

// POST /api/projects (Admin only)
router.post('/', auth, adminOnly, [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('deadline').isDate().withMessage('Valid deadline required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description = '', color = '#f5a623', deadline, memberIds = [] } = req.body;
  const db = getDB();

  const result = db.prepare(
    'INSERT INTO projects (name, description, color, owner_id, deadline) VALUES (?, ?, ?, ?, ?)'
  ).run(name, description, color, req.user.id, deadline);

  const pid = result.lastInsertRowid;

  // Add owner + members
  const insertMember = db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)');
  insertMember.run(pid, req.user.id);
  memberIds.forEach(uid => insertMember.run(pid, uid));

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  res.status(201).json(project);
});

// PATCH /api/projects/:id (Admin only)
router.patch('/:id', auth, adminOnly, (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { name, description, color, deadline, status, memberIds } = req.body;
  db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      color = COALESCE(?, color),
      deadline = COALESCE(?, deadline),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name, description, color, deadline, status, project.id);

  if (memberIds) {
    db.prepare('DELETE FROM project_members WHERE project_id = ?').run(project.id);
    const insertMember = db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)');
    memberIds.forEach(uid => insertMember.run(project.id, uid));
    insertMember.run(project.id, req.user.id); // always keep owner
  }

  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id));
});

// DELETE /api/projects/:id (Admin only)
router.delete('/:id', auth, adminOnly, (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  res.json({ message: 'Project deleted' });
});

// GET /api/projects/:id/stats
router.get('/:id/stats', auth, (req, res) => {
  const db = getDB();
  const pid = req.params.id;
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(pid);
  const now = new Date();
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'Todo').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    review: tasks.filter(t => t.status === 'Review').length,
    done: tasks.filter(t => t.status === 'Done').length,
    overdue: tasks.filter(t => t.status !== 'Done' && t.due_date && new Date(t.due_date) < now).length,
    completion: tasks.length ? Math.round(tasks.filter(t => t.status === 'Done').length / tasks.length * 100) : 0,
  };
  res.json(stats);
});

module.exports = router;
