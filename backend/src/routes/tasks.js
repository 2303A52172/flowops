const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db');
const { auth } = require('../middleware/auth');

function canAccessProject(db, projectId, user) {
  if (user.role === 'Admin') return true;
  return !!db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, user.id);
}

// GET /api/tasks?projectId=&assigneeId=&status=&priority=
router.get('/', auth, (req, res) => {
  const db = getDB();
  const { projectId, assigneeId, status, priority } = req.query;

  let sql = `
    SELECT t.*, 
      u.name as assignee_name, u.color as assignee_color, u.initials as assignee_initials,
      p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN projects p ON t.project_id = p.id
  `;
  const conditions = [];
  const params = [];

  // Non-admins can only see tasks in their projects
  if (req.user.role !== 'Admin') {
    conditions.push(`t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)`);
    params.push(req.user.id);
  }

  if (projectId) { conditions.push('t.project_id = ?'); params.push(projectId); }
  if (assigneeId) { conditions.push('t.assignee_id = ?'); params.push(assigneeId); }
  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (priority) { conditions.push('t.priority = ?'); params.push(priority); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY t.created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

// GET /api/tasks/my — tasks assigned to current user
router.get('/my', auth, (req, res) => {
  const db = getDB();
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.assignee_id = ? ORDER BY 
      CASE t.status WHEN 'In Progress' THEN 1 WHEN 'Review' THEN 2 WHEN 'Todo' THEN 3 ELSE 4 END,
      t.due_date ASC
  `).all(req.user.id);
  res.json(tasks);
});

// GET /api/tasks/overdue
router.get('/overdue', auth, (req, res) => {
  const db = getDB();
  const now = new Date().toISOString().split('T')[0];
  let sql = `
    SELECT t.*, u.name as assignee_name, u.color as assignee_color, u.initials as assignee_initials,
      p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN projects p ON t.project_id = p.id
    WHERE t.status != 'Done' AND t.due_date < ?
  `;
  const params = [now];
  if (req.user.role !== 'Admin') {
    sql += ' AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)';
    params.push(req.user.id);
  }
  sql += ' ORDER BY t.due_date ASC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/tasks/:id
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.color as assignee_color,
      p.name as project_name, p.color as project_color
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessProject(db, task.project_id, req.user)) return res.status(403).json({ error: 'Access denied' });
  res.json(task);
});

// POST /api/tasks
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('projectId').isInt().withMessage('Valid project ID required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description = '', projectId, assigneeId, priority = 'Medium', dueDate, status = 'Todo' } = req.body;
  const db = getDB();

  if (!canAccessProject(db, projectId, req.user)) return res.status(403).json({ error: 'Access denied' });

  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, assignee_id, priority, due_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, title, description, assigneeId || null, priority, dueDate || null, status, req.user.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PATCH /api/tasks/:id
router.patch('/:id', auth, (req, res) => {
  const db = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessProject(db, task.project_id, req.user)) return res.status(403).json({ error: 'Access denied' });

  // Members can only update status and assignee of their own tasks
  const { title, description, assigneeId, status, priority, dueDate } = req.body;
  const isAdminOrOwner = req.user.role === 'Admin' || task.created_by === req.user.id;

  if (!isAdminOrOwner && (title || description || priority || dueDate)) {
    return res.status(403).json({ error: 'Only admins or task creators can edit task details' });
  }

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, description, assigneeId, assigneeId, status, priority, dueDate, task.id);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id));
});

// DELETE /api/tasks/:id (Admin or creator)
router.delete('/:id', auth, (req, res) => {
  const db = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const canDelete = req.user.role === 'Admin' || task.created_by === req.user.id;
  if (!canDelete) return res.status(403).json({ error: 'Permission denied' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
