# 🌾 IntelliFarm

> AI-powered smart farming platform with skeuomorphic Blue & White UI — built with Next.js 15, Spring Boot, Prisma, and Supabase.

[![Live Demo](https://img.shields.io/badge/Live-intellifarm--alpha.vercel.app-blue?style=flat-square)](https://intellifarm-alpha.vercel.app)

---

## ⚡ Quick Start (Single Command)

### Linux / macOS
```bash
bash setup.sh
```

### Windows
```bat
setup.bat
```

### Or with Bun
```bash
bun run setup   # Install deps + setup DB
bun run dev:all # Start Next.js (3000) + Spring Boot (8080) together
```

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui |
| Backend | Spring Boot 3.3 (Java) |
| ORM | Prisma 6 |
| Database | PostgreSQL via Supabase |
| Auth | Custom session-based auth |
| AI | Groq API |
| Deploy | Vercel |

---

## 📁 Project Structure

```
intellifarm-alpha/
├── src/
│   ├── app/          # Next.js App Router (pages + API routes)
│   ├── components/   # UI components (ecocrop/ subfolder)
│   └── lib/          # Prisma client, auth, seed, utilities
├── prisma/           # Schema + migrations
├── pom.xml           # Spring Boot Maven config
├── setup.sh          # Linux/Mac one-command setup
└── setup.bat         # Windows one-command setup
```

---

## 🔧 Manual Setup

### Prerequisites
- Node.js 18+
- Bun (`curl -fsSL https://bun.sh/install | bash`)
- Java 17+
- PostgreSQL database (or Supabase)

### Steps

```bash
# 1. Clone
git clone https://github.com/vamsiprojects184-cpu/intellifarm.git
cd intellifarm

# 2. Set environment variables
cp .env.example .env
# Edit .env and set DATABASE_URL

# 3. Install & setup DB
bun install
bunx prisma generate
bunx prisma db push

# 4. Seed demo data
bun run src/lib/seed.ts

# 5. Start (both servers)
bun run dev:all
```

### Demo Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecocrop.farm | password |
| Farmer | farmer@ecocrop.farm | password |
| Agronomist | agronomist@ecocrop.farm | password |

---

## 🌐 Live Deployment
- **IntelliFarm:** [https://intellifarm-alpha.vercel.app](https://intellifarm-alpha.vercel.app)
