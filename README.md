# Scheduling Platform (Cal.com Clone)

Fullstack intern assignment implementation using Next.js + Express + PostgreSQL.

## Tech Stack

- Frontend: Next.js (App Router, TypeScript, Tailwind CSS)
- Backend: Node.js + Express
- Database: PostgreSQL
- Validation: Zod
- Time handling: date-fns + date-fns-tz

## Monorepo Structure

- frontend: Next.js application (admin + public booking UI)
- backend: Express API, migration scripts, seed scripts

## Features Implemented

### 1) Event Types Management

- Create event types with title, description, duration, and slug
- Edit event types
- Delete event types
- List all event types in admin dashboard
- Public booking links based on host slug + event slug

### 2) Availability Settings

- Configure weekly availability per day
- Set start and end time per day
- Set host timezone

### 3) Public Booking Page

- Public host page listing event types
- Event booking page with date and slot selection
- Booking form with name and email
- Prevent double booking with overlap checks and DB exclusion constraint
- Booking confirmation page

### 4) Bookings Dashboard

- Upcoming bookings view
- Past bookings view
- Cancel booking

## Database Schema

Core tables:

- users
- event_types
- availabilities
- date_overrides (schema-ready)
- bookings

Important constraints:

- unique event slug per user: UNIQUE(user_id, slug)
- overlap prevention for confirmed bookings using exclusion constraint on tstzrange

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 1. Start PostgreSQL

Create a local database and ensure PostgreSQL is running on `localhost:5432`.

Recommended defaults used by this project:

- Database: `cal_clone`
- User: `postgres`
- Password: `postgres`

If you use a different user/password, update `DATABASE_URL` in [backend/.env](backend/.env).

Example (PowerShell + psql):

```bash
psql -U postgres -h localhost -c "CREATE DATABASE cal_clone;"
```

### 2. Setup backend

```bash
cd backend
copy .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Backend runs on http://localhost:3001

### 3. Setup frontend

In a second terminal:

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend runs on http://localhost:3000

## Demo URLs

- Landing: http://localhost:3000
- Admin events: http://localhost:3000/admin/events
- Admin availability: http://localhost:3000/admin/availability
- Admin bookings: http://localhost:3000/admin/bookings
- Public booking page: http://localhost:3000/demo-user

## API Overview

Admin endpoints:

- GET /api/admin/event-types
- POST /api/admin/event-types
- PATCH /api/admin/event-types/:id
- DELETE /api/admin/event-types/:id
- GET /api/admin/availability
- PUT /api/admin/availability
- GET /api/admin/bookings?type=upcoming|past
- PATCH /api/admin/bookings/:id/cancel

Public endpoints:

- GET /api/public/:username
- GET /api/public/:username/:eventSlug/slots?date=YYYY-MM-DD&timezone=IANA
- POST /api/public/bookings
- GET /api/public/bookings/:id

## Seed Data

Seed script creates:

- User: demo-user
- Event types:
  - intro-call (30 min)
  - deep-dive (60 min)
- Mon-Fri availability: 09:00 to 17:00
- Example upcoming and past bookings

## Assumptions

- No login flow is required by assignment, so admin routes use a default seeded user context.
- Time is stored in UTC in bookings and rendered in local timezone on frontend.
- Date overrides are included in schema but not exposed in UI in this first implementation pass.

## What To Explain In Interview

- Why UTC storage avoids timezone and DST drift
- How overlap prevention is enforced at both service logic and DB constraint level
- Why schema separates recurring weekly availability from booking instances
- Tradeoff of default user context versus full auth for assignment scope
