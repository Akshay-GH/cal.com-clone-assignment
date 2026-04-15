# Scheduling Platform (Cal.com Clone)

Live demo: https://cal-com-clone-assignment-rho.vercel.app/

A full-stack scheduling application built with Next.js, Express, and PostgreSQL.

## Overview

This project supports:

- Admin event type management
- Weekly availability and multiple schedules
- Date overrides (block/custom day windows)
- Public booking flow with slot selection
- Booking confirmation and rescheduling
- Admin booking management (upcoming/past, cancellation)
- Buffer time and custom booking questions
- Double-booking protection

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Express, TypeScript
- Database: PostgreSQL

## Repository Structure

- `frontend`: Next.js application
- `backend`: Express API, migrations, and seed scripts

## Environment Setup

Create these files before running the app:

- `backend/.env` from `backend/.env.example`
- `frontend/.env.local` from `frontend/.env.local.example`

Required environment variables:

- Backend:
  - `DATABASE_URL`
  - `CORS_ORIGIN`
- Frontend:
  - `NEXT_PUBLIC_API_BASE_URL`

Optional backend email variables:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Local Development

Prerequisites:

- Node.js 20+
- PostgreSQL (local or hosted, for example Neon)

Backend:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## Deployment

### Backend (Render)

- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Required env:
  - `DATABASE_URL`
  - `CORS_ORIGIN` (exact frontend URL, no trailing slash)

### Frontend (Vercel)

- Root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Required env:
  - `NEXT_PUBLIC_API_BASE_URL=https://<your-backend>.onrender.com`

## Main Routes

- `/admin/events`
- `/admin/availability`
- `/admin/bookings`
- `/demo-user` (public host page from seed data)
- `/bookings/[id]` (booking details and reschedule)

## User Flows

Admin flow:

1. Create or edit event types in `/admin/events`.
2. Configure weekly schedule(s) in `/admin/availability`.
3. Add date overrides if needed.
4. Monitor and manage bookings in `/admin/bookings`.

Public user flow:

1. Open host page (example: `/demo-user`).
2. Select event type and date.
3. Pick a slot, fill details, and confirm booking.
4. Reschedule later from `/bookings/[id]` when needed.

## Notes and Assumptions

- Time values are stored in UTC.
- The project uses a seeded default host user for assignment scope.
- Admin authentication is simplified for this assignment version.
- In-app modals and toasts are used for confirmations and feedback.
- Weekend booking is supported when Saturday/Sunday are enabled in availability.
