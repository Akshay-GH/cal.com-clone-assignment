# Scheduling Platform (Cal.com Clone)

Simple full-stack scheduling app built with Next.js, Express, and PostgreSQL.

## Features

- Event type CRUD (admin)
- Weekly availability + multiple schedules
- Date overrides
- Public booking page with calendar slot selection
- Booking confirmation + reschedule
- Admin bookings (upcoming/past) + cancel
- Buffer time and custom booking questions
- Double-booking protection

## Tech Stack

- Frontend: Next.js + TypeScript + Tailwind
- Backend: Express + TypeScript
- Database: PostgreSQL

## Project Structure

- `frontend` - Next.js app
- `backend` - Express API, migrations, seed scripts

## Run Locally (No Docker)

### 1. Prerequisites

- Node.js 20+
- PostgreSQL (local or cloud, like Neon)

### 2. Backend

```bash
cd backend
copy .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Backend URL: `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

## Deploy (Vercel + Render)

### Backend on Render

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm run start`
- Required env vars:
  - `DATABASE_URL`
  - `CORS_ORIGIN` (your Vercel production URL, no trailing slash)

Optional email env vars:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Frontend on Vercel

- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Env var:
  - `NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com`

## Migrate vs Seed (Simple)

- `db:migrate` = create or update database structure (tables, columns, constraints)
- `db:seed` = insert demo/sample data

Think of it like this:

- migrate = build the house
- seed = add furniture

For production:

- Run `db:migrate` when schema changes
- Run `db:seed` only if you want demo data in production

## Main Routes

- Home: `/`
- Admin events: `/admin/events`
- Admin availability: `/admin/availability`
- Admin bookings: `/admin/bookings`
- Public host (seed): `/demo-user`

## Notes

- Time is stored in UTC
- This project uses a seeded default user for assignment scope
