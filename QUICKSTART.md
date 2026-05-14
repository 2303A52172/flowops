# ⚡ FlowOps — Quick Start

## Open in VS Code
Double-click `flowops.code-workspace` to open the full project with all folders organised.

---

## 🚀 Run in 3 steps

### Step 1 — Install dependencies
```bash
cd backend
npm install
```

### Step 2 — Set up environment
```bash
cp .env.example .env
# .env is ready to go with defaults — no changes needed for local dev
```

### Step 3 — Start the backend
```bash
npm run dev
# API runs at http://localhost:3001
# Health check: http://localhost:3001/health
```

### Step 4 — Open the frontend
Just open `frontend/index.html` in your browser.
> Tip: Use VS Code's **Live Server** extension (right-click → Open with Live Server)

---

## 📂 Folder Structure
```
flowops/
├── flowops.code-workspace   ← Open THIS in VS Code
├── package.json             ← Root scripts
├── README.md                ← Full docs
├── .gitignore
│
├── frontend/
│   └── index.html           ← Entire frontend (open in browser)
│
└── backend/
    ├── package.json
    ├── .env.example         ← Copy to .env
    ├── railway.toml         ← Railway deploy config
    └── src/
        ├── server.js        ← Express entry point
        ├── db.js            ← SQLite + seed data
        ├── middleware/
        │   └── auth.js      ← JWT middleware
        └── routes/
            ├── auth.js      ← POST /api/auth/signup|login
            ├── projects.js  ← /api/projects CRUD
            ├── tasks.js     ← /api/tasks CRUD
            └── team.js      ← /api/team management
```

---

## 🔑 Demo Login Credentials

| Email | Password | Role |
|-------|----------|------|
| alex@flowops.io | admin123 | **Admin** |
| sam@flowops.io | member123 | Member |
| jordan@flowops.io | member123 | Member |
| maya@flowops.io | member123 | Member |

---

## 🌐 Deploy to Railway

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "initial commit"
gh repo create flowops --public --push

# 2. Go to railway.app
# → New Project → Deploy from GitHub repo → select /backend folder
# → Add env vars: JWT_SECRET=any-long-string, NODE_ENV=production

# 3. Frontend → drag frontend/index.html to netlify.com
```

---

## 🛠️ API Endpoints

```
GET  /health                      ← Server status

POST /api/auth/signup             ← Register
POST /api/auth/login              ← Login (returns JWT)
GET  /api/auth/me                 ← Current user

GET  /api/projects                ← List projects
POST /api/projects                ← Create (Admin)
GET  /api/projects/:id            ← Project detail
PATCH /api/projects/:id           ← Update (Admin)
DELETE /api/projects/:id          ← Delete (Admin)
GET  /api/projects/:id/stats      ← Task stats

GET  /api/tasks                   ← List tasks (?projectId=&status=&priority=)
GET  /api/tasks/my                ← My tasks
GET  /api/tasks/overdue           ← Overdue tasks
POST /api/tasks                   ← Create task
PATCH /api/tasks/:id              ← Update task
DELETE /api/tasks/:id             ← Delete task

GET  /api/team                    ← All members
POST /api/team                    ← Add member (Admin)
PATCH /api/team/:id/role          ← Change role (Admin)
GET  /api/team/dashboard-stats    ← Dashboard numbers
```
