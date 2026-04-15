# Scheduling Platform (Cal.com Clone)

A full-stack scheduling app built with Next.js, Express, and PostgreSQL.

## What this project includes

- Admin event management (create, edit, delete)
- Weekly availability with multiple schedules
- Date overrides for specific days
- Public booking page with calendar-based slot selection
- Booking confirmation and rescheduling
- Upcoming and past bookings dashboard
- Booking cancellation
- Buffer time between meetings
- Custom booking questions
- Email notification support (SMTP)
- Double-booking protection at service and database levels

## Tech stack

- Frontend: Next.js (App Router, TypeScript, Tailwind CSS)
- Backend: Express + TypeScript
- Database: PostgreSQL
- Validation: Zod

## Project structure

- frontend: Next.js app
- backend: Express API, services, migrations, seed

## Quick start (no Docker)

### 1. Prerequisites

- Node.js 20+
- PostgreSQL (local or cloud, for example Neon)

### 2. Backend setup

Run in PowerShell:

```bash
cd backend
copy .env.example .env
npm install
```

Set DATABASE_URL in backend/.env.

Then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Backend runs at http://localhost:3001.

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend runs at http://localhost:3000.

## Main URLs

- Home: http://localhost:3000
- Admin events: http://localhost:3000/admin/events
- Admin availability: http://localhost:3000/admin/availability
- Admin bookings: http://localhost:3000/admin/bookings
- Public profile (seeded user): http://localhost:3000/demo-user

## Environment notes

- backend/.env
  - DATABASE_URL is required
  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM are optional
- frontend/.env.local
  - NEXT_PUBLIC_API_BASE_URL should point to the backend (default http://localhost:3001)

## Useful scripts

Backend:

- npm run dev
- npm run db:migrate
- npm run db:seed
- npm run typecheck

Frontend:

- npm run dev
- npm run lint

## Seed data

Seed script creates:

- demo-user host
- Sample event types
- Sample availability
- Sample upcoming/past bookings

## Notes

- The project uses a seeded default admin user for assignment scope.
- Booking times are stored in UTC.
- SMTP delivery depends on your network and email provider settings.
