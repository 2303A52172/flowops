const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '../data/flowops.db');

let db;

function getDB() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Member' CHECK(role IN ('Admin', 'Member')),
      color TEXT DEFAULT '#f5a623',
      initials TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#f5a623',
      owner_id INTEGER NOT NULL,
      deadline DATE,
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Completed', 'Archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assignee_id INTEGER,
      status TEXT DEFAULT 'Todo' CHECK(status IN ('Todo', 'In Progress', 'Review', 'Done')),
      priority TEXT DEFAULT 'Medium' CHECK(priority IN ('High', 'Medium', 'Low')),
      due_date DATE,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Seed data if empty
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    console.log('Seeding database...');
    const hash = (pw) => bcrypt.hashSync(pw, 10);

    const insertUser = db.prepare('INSERT INTO users (name, email, password, role, color, initials) VALUES (?, ?, ?, ?, ?, ?)');
    const users = [
      ['Alex Rivera', 'alex@flowops.io', hash('admin123'), 'Admin', '#f5a623', 'AR'],
      ['Sam Chen', 'sam@flowops.io', hash('member123'), 'Member', '#00d4aa', 'SC'],
      ['Jordan Lee', 'jordan@flowops.io', hash('member123'), 'Member', '#4d9fff', 'JL'],
      ['Maya Patel', 'maya@flowops.io', hash('member123'), 'Member', '#a78bfa', 'MP'],
    ];
    users.forEach(u => insertUser.run(...u));

    const insertProject = db.prepare('INSERT INTO projects (name, description, color, owner_id, deadline, status) VALUES (?, ?, ?, ?, ?, ?)');
    const insertMember = db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)');

    const p1 = insertProject.run('Phoenix Rebrand', 'Complete visual identity overhaul and design system', '#f5a623', 1, '2025-06-30', 'Active').lastInsertRowid;
    [1,2,3].forEach(uid => insertMember.run(p1, uid));

    const p2 = insertProject.run('API Gateway v3', 'Redesign and rebuild the core API gateway infrastructure', '#00d4aa', 1, '2025-05-15', 'Active').lastInsertRowid;
    [1,3,4].forEach(uid => insertMember.run(p2, uid));

    const p3 = insertProject.run('Mobile App Launch', 'iOS and Android app development and App Store submission', '#4d9fff', 1, '2025-03-01', 'Completed').lastInsertRowid;
    [1,2,4].forEach(uid => insertMember.run(p3, uid));

    const insertTask = db.prepare(`
      INSERT INTO tasks (project_id, title, description, assignee_id, status, priority, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    const tasks = [
      [p1, 'Create brand guidelines document', 'Comprehensive brand guidelines', 2, 'Done', 'High', '2025-02-20', 1],
      [p1, 'Design new logo variations', 'Multiple logo variations for use cases', 3, 'In Progress', 'High', '2025-03-10', 1],
      [p1, 'Update marketing website', 'Implement new brand identity', 2, 'Todo', 'Medium', '2025-04-01', 1],
      [p1, 'Prepare launch presentation', 'Stakeholder presentation for brand launch', 1, 'Review', 'Medium', '2025-03-25', 1],
      [p2, 'Design API schema', 'OpenAPI 3.0 specification for all endpoints', 4, 'Done', 'High', '2025-02-10', 1],
      [p2, 'Implement rate limiting', 'Token bucket algorithm with Redis', 3, 'In Progress', 'High', '2025-04-20', 1],
      [p2, 'Write integration tests', 'Full test coverage for all API endpoints', 4, 'Todo', 'Medium', '2025-05-01', 1],
      [p2, 'Security audit', 'Penetration testing and vulnerability assessment', 1, 'Todo', 'High', '2025-04-15', 1],
      [p3, 'App Store submission', 'Submit to both iOS and Android stores', 2, 'Done', 'High', '2025-02-28', 1],
      [p3, 'Beta testing campaign', '200 beta users, collect feedback', 4, 'Done', 'Medium', '2025-02-15', 1],
    ];
    tasks.forEach(t => insertTask.run(...t));
    console.log('Seed complete!');
  }

  console.log('Database initialized');
}

module.exports = { getDB, initDB };
