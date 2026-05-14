# ⚡ FlowOps — Team Task Manager

> Mission-critical team task management with role-based access control

A full-stack web application for creating projects, assigning tasks, and tracking progress with Admin/Member role-based access.

---

## 🚀 Live Demo

- **Frontend:** `https://flowops.up.railway.app` *(deploy URL after Railway setup)*
- **API:** `https://flowops-api.up.railway.app`

**Demo credentials:**
| Email | Password | Role |
|-------|----------|------|
| alex@flowops.io | admin123 | Admin |
| sam@flowops.io | member123 | Member |
| jordan@flowops.io | member123 | Member |

---

## ✨ Features

### Authentication
- JWT-based signup & login
- Password hashing with bcrypt
- Protected routes with token verification

### Role-Based Access Control
| Feature | Admin | Member |
|---------|-------|--------|
| View all projects | ✅ | ❌ (own only) |
| Create projects | ✅ | ❌ |
| Delete projects | ✅ | ❌ |
| Create tasks | ✅ | ✅ (in own projects) |
| Edit all tasks | ✅ | ❌ (own tasks only) |
| Delete tasks | ✅ | ✅ (own tasks only) |
| Manage team | ✅ | ❌ |
| View overdue dashboard | ✅ | ❌ |
| Change member roles | ✅ | ❌ |

### Project Management
- Create projects with name, description, color, deadline, team members
- Progress tracking (% complete, task counts by status)
- Archive/complete projects

### Task Management
- Create tasks with title, description, assignee, priority, due date
- Status workflow: **Todo → In Progress → Review → Done**
- List view and Kanban board view
- Filter by status and priority
- Search tasks

### Dashboard
- Mission Control overview with key metrics
- Active projects with progress bars
- Recent activity feed
- Overdue task alerts

---

## 🏗️ Tech Stack

### Frontend
- Vanilla HTML/CSS/JavaScript (zero framework dependencies)
- Custom design system — "Mission Control" dark aesthetic
- Responsive layout

### Backend
- **Node.js** + **Express.js** — REST API
- **SQLite** (via better-sqlite3) — Persistent database
- **JWT** — Stateless authentication
- **bcryptjs** — Password hashing
- **express-validator** — Input validation

---

## 📡 API Reference

### Auth
```
POST /api/auth/signup    - Register new user
POST /api/auth/login     - Login, returns JWT
GET  /api/auth/me        - Get current user (auth required)
```

### Projects
```
GET    /api/projects         - List projects (role-filtered)
POST   /api/projects         - Create project (Admin)
GET    /api/projects/:id     - Get project details
PATCH  /api/projects/:id     - Update project (Admin)
DELETE /api/projects/:id     - Delete project (Admin)
GET    /api/projects/:id/stats - Project statistics
```

### Tasks
```
GET    /api/tasks            - List tasks (filtered by query params)
GET    /api/tasks/my         - My assigned tasks
GET    /api/tasks/overdue    - Overdue tasks
POST   /api/tasks            - Create task
PATCH  /api/tasks/:id        - Update task
DELETE /api/tasks/:id        - Delete task
```

### Team
```
GET   /api/team              - List all users with stats
POST  /api/team              - Add member (Admin)
PATCH /api/team/:id/role     - Change role (Admin)
GET   /api/team/dashboard-stats - Dashboard statistics
```

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your values
npm install
npm run dev
# API runs on http://localhost:3001
```

### Frontend Setup
```bash
# Open index.html in a browser, or:
npx serve . -p 3000
# Visit http://localhost:3000
```

For production frontend-backend integration, set `API_BASE_URL` in the frontend JS to your backend URL.

---

## 🚀 Deploy to Railway

### One-Click Deploy

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects Node.js

### Environment Variables (set in Railway dashboard)
```
JWT_SECRET=your-long-random-secret-here
NODE_ENV=production
PORT=3001
```

### Frontend Deployment
Railway can also host static sites:
```bash
# In Railway dashboard: New Service → GitHub Repo
# Build command: (empty)
# Start command: npx serve . -p $PORT
```

Or deploy frontend to **Netlify** / **Vercel** (free tier):
- Drag and drop the `index.html` to Netlify

---

## 📁 Project Structure

```
flowops/
├── index.html              # Full frontend application
├── README.md
└── backend/
    ├── package.json
    ├── railway.toml        # Railway deployment config
    ├── .env.example
    └── src/
        ├── server.js       # Express app entry point
        ├── db.js           # SQLite initialization & seeding
        ├── middleware/
        │   └── auth.js     # JWT auth + role middleware
        └── routes/
            ├── auth.js     # Signup, login, /me
            ├── projects.js # Project CRUD
            ├── tasks.js    # Task CRUD
            └── team.js     # Team management
```

---

## 🔐 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire in 7 days
- All routes protected with auth middleware
- Role-based access enforced server-side
- SQL injection prevention via parameterized queries
- Input validation on all endpoints

---

## 📊 Database Schema

```sql
users (id, name, email, password, role, color, initials, created_at)
projects (id, name, description, color, owner_id, deadline, status, created_at)
project_members (project_id, user_id) -- many-to-many
tasks (id, project_id, title, description, assignee_id, status, priority, 
       due_date, created_by, created_at, updated_at)
```

---

## 🎥 Demo Video Script (2-5 min)

1. **[0:00-0:30]** Open the app, show the login screen and Mission Control design
2. **[0:30-1:00]** Log in as Admin (alex@flowops.io), walk through dashboard stats
3. **[1:00-1:45]** Create a new project, add team members
4. **[1:45-2:30]** Add tasks, assign to team members, set priorities and deadlines
5. **[2:30-3:00]** Switch to Kanban view, drag task through statuses
6. **[3:00-3:30]** Show Team page, change a member's role
7. **[3:30-4:00]** Log in as Member (sam@flowops.io), show restricted access
8. **[4:00-4:30]** Show "My Tasks" view, mark tasks complete
9. **[4:30-5:00]** Show Overdue dashboard, API health endpoint

---

Built with ⚡ for the Full-Stack Assignment
