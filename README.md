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
- Build command: `npm install && npm run build`
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


## Main Routes

- Home: `/`
- Admin events: `/admin/events`
- Admin availability: `/admin/availability`
- Admin bookings: `/admin/bookings`
- Public host (seed): `/demo-user`

## User and Admin Flow

Use this section as a quick walkthrough for first-time usage.

### Admin Flow

1. Open `/admin/events`.
2. Click `+ New` to create an event type (title, slug, duration, buffer, description).
3. (Optional) For each event, use:

- `Questions` to view booking questions.
- `Add Q` to add custom questions users must answer.

4. Open `/admin/availability`.
5. Create or select an availability schedule.
6. Set timezone and weekly hours (weekday-focused editor in current version).
7. Add date overrides when needed (block a day or set custom hours).
8. Click `Done` to save availability settings.
9. Share your public link (for seeded host: `/demo-user`).
10. Open `/admin/bookings` to monitor upcoming/past bookings and cancel if needed.

### Public User Flow

1. Open host page, for example `/demo-user`.
2. Select an event type.
3. Choose a date from the calendar.
4. Select one available time slot.
5. Enter name, email, and answer additional questions (if configured).
6. Click `Confirm booking`.
7. On confirmation page (`/bookings/[id]`), review details.
8. If needed, use `Reschedule` to pick a new date/time.

### Quick Test Scenario

1. Admin creates an event on `/admin/events`.
2. Admin sets availability on `/admin/availability`.
3. Public user books from `/demo-user`.
4. Admin confirms booking visibility on `/admin/bookings`.
5. Public user reschedules from `/bookings/[id]` and sees success confirmation.

## Notes

- Time is stored in UTC
- This project uses a seeded default user for assignment scope

## Assumptions

- Admin access is simplified for assignment scope (no full authentication flow).
- A seeded default host user is used for admin and public pages (for example: `/demo-user`).
- Availability editor is weekday-focused: only Monday to Friday are shown for weekly slot editing.
- Saturday and Sunday are treated as unavailable in the current weekly availability UI.
- Date overrides can still be used for one-off exceptions to normal weekly availability.
