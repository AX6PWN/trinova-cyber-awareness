v<p align="center">
  <img src="assets/images/logo.png" alt="Trinova Logo" width="140" />
</p>

<h1 align="center">Trinova Cyber Awareness 360</h1>

<p align="center">
  <strong>SaaS Cybersecurity Awareness Training Platform with an Immersive 360° Simulation</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Neon-PostgreSQL-00E599?logo=neon&logoColor=black" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/WebXR-Three.js-ffffff?logo=threedotjs&logoColor=black" alt="Three.js / WebXR" />
  <img src="https://img.shields.io/badge/version-2.0.0-blue" alt="Version" />
</p>

---

## Overview

Trinova Cyber Awareness 360 is a browser-based cybersecurity awareness platform that combines an **immersive 3D training environment** with a **multi-tenant B2B compliance suite**.

Employees explore a 360° virtual workstation and server room, discovering workplace security threats through interactive 3D objects and completing eight training topics followed by a knowledge assessment. Security leaders use the CISO Compliance Hub to monitor organization-wide readiness, department risk, drill campaigns, and exportable audit trails — backed by **Neon PostgreSQL** with an automatic persistent-storage fallback.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Demo Accounts](#demo-accounts)
- [Usage](#usage)

---

## Key Features

### B2B SaaS Platform
| Capability | Description |
| --- | --- |
| **Multi-Tenant Organizations** | Enterprise tenants with role-based access control (`employee`, `admin`, `superadmin`). |
| **CISO Compliance Hub** | Real-time security score, department compliance heatmaps, vulnerability risk matrices, and drill campaigns. |
| **Employee Roster** | Live tracking of module completion, quiz scores, and certification status per employee. |
| **Audit Logging & Export** | Tamper-evident audit trail with CSV export for SOC 2 / ISO 27001 readiness. |
| **Verifiable Certificates** | Auto-issued credentials with unique certificate numbers and verification hashes for scores ≥ 70%. |

### 3D Simulation — 8 Interactive Security Topics
| # | Topic | Interactive 3D Object |
| --- | --- | --- |
| 1 | Phishing | Laptop / email workstation |
| 2 | Passwords | Workstation monitor (login screen) |
| 3 | Multi-Factor Authentication | Smartphone authentication prop |
| 4 | Social Engineering | Communications headset |
| 5 | Safe Browsing | Widescreen browser display |
| 6 | USB & Device Security | Physical USB thumb drive |
| 7 | Ransomware & Offline Backups | Enterprise server rack & air-gapped vault |
| 8 | Physical & Access Security | Biometric access terminal & secure turnstile |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js (native `http` server, no framework) |
| Database | Neon PostgreSQL via `@neondatabase/serverless`, with JSON file fallback |
| 3D / XR | Three.js, glTF/GLB assets, WebXR |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Config | `@neon/config`, `@neon/env`, dotenv-style `.env` loading |
| Deployment | Vercel-ready (`.vercel/` project configuration included) |

---

## Project Structure

```
Prototype/
├── server.js              # HTTP server + REST API router + route guards
├── backend/
│   ├── auth.js            # scrypt hashing, sessions, cookies, request guards
│   ├── db.js              # Data layer (Neon Postgres + persistent fallback)
│   └── schema.sql         # Full PostgreSQL schema
├── js/                    # Frontend modules
│   ├── app.js             # Application bootstrap
│   ├── landing.js         # Public landing page (session-aware header, CTAs)
│   ├── auth-guard.js      # Client session guard (mirrors server rules)
│   ├── camera.js          # 360° / WebXR camera controls
│   ├── hotspots.js        # Interactive topic hotspots
│   ├── panels.js          # Topic content panels
│   ├── quiz.js            # Assessment + certificate issuance
│   ├── b2b.js             # Auth modal, CISO dashboard, admin views
│   ├── features.js        # Auxiliary feature UI
│   ├── certificate.js     # /certificate viewer (view / download / print)
│   ├── employee-dashboard.js    # /employee
│   ├── admin-dashboard.js       # /admin
│   ├── super-admin-dashboard.js # /super-admin
│   ├── player-controller.js
│   └── debug.js
├── css/                   # Stylesheets (styles, features, auth, landing, certificate)
├── assets/                # 3D models (glTF/GLB), textures, images
├── data/                  # Local persistent store (auto-created)
├── landing.html           # Public marketing landing page
├── index.html             # 360° training application (/training, protected)
├── certificate.html       # Certificate viewer (/certificate, protected)
├── login.html             # Sign in
├── register.html          # Sign up (creates an Employee account)
├── forgot-password.html   # Password reset
├── employee.html          # Employee dashboard
├── admin.html             # Admin / CISO dashboard
├── super-admin.html       # Platform administration
└── .env.example           # Environment template
```

---

## Getting Started

### Prerequisites
- **Node.js 18 or newer**
- A **Neon** account and `DATABASE_URL` (optional — the app falls back to local persistent storage)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd Prototype

# 2. Install dependencies
npm install

# 3. Configure environment
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
# Edit .env and set your DATABASE_URL

# 4. Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | No | Neon PostgreSQL connection string. If omitted, the app uses local file storage. |
| `NEON_PROJECT_ID` | No | Neon project identifier (defaults to `bold-surf-20847857`). |
| `NEON_BRANCH` | No | Neon branch name (defaults to `production`). |
| `PORT` | No | HTTP port (defaults to `3000`). |

---

## Database

**Schema:** [`backend/schema.sql`](backend/schema.sql)

| Table | Purpose |
| --- | --- |
| `organizations` | B2B tenants, plan, industry, security score |
| `users` | Employees and administrators with roles and departments |
| `training_progress` | Per-user topic completion records |
| `quiz_attempts` | Assessment results with per-topic breakdown (JSONB) |
| `certificates` | Verifiable certificates with unique numbers and hashes |
| `campaigns` | Security drill / training campaigns |
| `audit_logs` | Organization audit trail for compliance export |

To provision a Neon database:

```bash
npm i -g neon@latest
neon login
neonctl branches create --project-id <your-project-id>
```

Apply the schema, then place the resulting connection string in `.env`.

---

## Access Control

| Role | Home route | Can reach |
| --- | --- | --- |
| `employee` | `/employee` | `/`, `/training`, `/certificate` (own), own progress/results |
| `admin` | `/admin` | `/`, `/training`, `/certificate`, `/employee`, `/admin`, users in own organization |
| `superadmin` | `/super-admin` | every route, all tenants, all certificates, role changes |

- **Open pages:** `/`, `/landing` — the marketing landing page (header adapts to the session).
- **Public pages:** `/login`, `/register`, `/forgot-password` (signed-in users are bounced to their dashboard).
- **Protected pages:** `/training`, `/certificate`, `/employee`, `/admin`, `/super-admin` — enforced in `server.js` *and* mirrored by `js/auth-guard.js` (`window.PAGE_AUTH`). `/index.html` redirects to `/training` (signed in) or `/` (signed out).
- **Sessions:** httpOnly `cs_session` cookie (7 days, `SameSite=Lax`); disabling, deleting or re-roling a user revokes their sessions.
- **Passwords:** scrypt hashing, strength validation, generic login errors, 10-attempt/15-minute throttle.
- **Registration** is public but always creates an `employee` — only a Super Admin can provision `admin` accounts.

---

## API Reference

All endpoints are prefixed with `/api` and accept/return JSON. Authenticated routes read the session cookie.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/db/status` | Database connectivity status |
| `POST` | `/api/auth/login` | Authenticate a user (returns `redirectTo`) |
| `POST` | `/api/auth/register` | Register — always an Employee account |
| `POST` | `/api/auth/logout` | Destroy the server session |
| `GET` | `/api/auth/me` | Resolve current session |
| `POST` | `/api/auth/forgot-password` | Issue a one-time reset link |
| `POST` | `/api/auth/reset-password` | Complete a reset with the token |
| `POST` | `/api/auth/change-password` | Change password while signed in |
| `GET` | `/api/b2b/dashboard?orgId=` | Organization compliance dashboard *(admin)* |
| `GET` | `/api/superadmin/dashboard` | Platform-wide system dashboard *(superadmin)* |
| `POST` | `/api/b2b/campaigns` | Create a drill campaign *(admin)* |
| `GET` | `/api/admin/users` | List users (own org; all tenants for superadmin) |
| `POST` | `/api/admin/users` | Create employee/admin account *(admin creates employees only)* |
| `GET` | `/api/admin/users/:id` | User detail with progress, attempts, certificates |
| `PUT` | `/api/admin/users/:id/role` | Change role *(superadmin)* |
| `PUT` | `/api/admin/users/:id/status` | Enable / disable an account |
| `DELETE` | `/api/admin/users/:id` | Delete an account |
| `GET` | `/api/training/progress?userId=` | Training progress for a user |
| `POST` | `/api/training/complete-topic` | Mark a topic as completed |
| `POST` | `/api/quiz/submit` | Submit assessment; issues certificate on pass |
| `GET` | `/api/quiz/history?userId=` | Assessment history |
| `GET` | `/api/certificates?userId=` | Certificates for a user *(self, or admin)* |
| `GET` | `/api/certificates?all=1` | Every certificate across all tenants *(superadmin)* |
| `GET` | `/api/certificates/:id` | Retrieve a certificate by ID |

---

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Platform Super Admin | `superadmin@trinova.io` | `superadmin2026` |
| CISO / Admin (Acme) | `ciso@acmesec.com` | `admin123` |
| Admin (FinTech Global) | `admin@fintechtrust.io` | `admin456` |
| Employee | `sarah.chen@acmesec.com` | `user123` |
| Employee | `alex.turner@acmesec.com` | `user123` |
| Employee | `david.kim@acmesec.com` | `user123` |

> Demo credentials are seed data for local evaluation only. Replace with real authentication before any production deployment.

---

## Usage

1. **Landing page** at `/` — public overview of the platform. `Start Training` / `Register` sends visitors to `/register`; signed-in users go straight to `/training`.
2. **Register or sign in** — each role lands on its own dashboard: `/employee`, `/admin`, `/super-admin`.
3. **Dashboard** — employees follow the 5-step training path (dashboard → training → quiz → results → certificate) with live progress; admins get the employee roster, invite form, certificates and audit log; the super admin manages roles, tenants, platform metrics and all certificates.
4. **360° Training** at `/training` — explore the virtual office and complete all 8 topics, then take the assessment.
5. **Quiz & results** — passing (≥ 70%) automatically issues a verifiable certificate (`TRIN-2026-…`).
6. **Certificate** at `/certificate` — view, download (save as PDF) or print your certificate; admins can open their team's certificates from the dashboard.
7. **Logout** — the session is destroyed server-side and you are returned to `/login`.

---

## License

This project is intended for evaluation and demonstration purposes.
#   t r i n o v a - c y b e r - a w a r e n e s s 
 
 
