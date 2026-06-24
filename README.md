# RSVP App

A beautiful, modern event RSVP application powered by **Supabase** + **Vite** + **TypeScript**, deployed to **GitHub Pages** — with **passkey authentication** (no accounts, no passwords).

## Features

- 🔑 **Passkey auth** — device-bound, no login page, just a name prompt on first visit
- 📝 **Markdown event descriptions** — with automatic YouTube/Vimeo video embeds
- ✅ **RSVP statuses** — Going / Maybe / Can't go
- 🍽️ **Food pledge** — chips for common food categories, custom input
- 🎨 **Decor helper** — opt-in to help set up
- ⏰ **Late arrival** — note if you'll be joining after start time
- 👥 **Guest list** — grouped by status with badges
- 📊 **Stats bar** — live counts of going, food pledges, decor helpers
- 🌙 **Dark glassmorphism UI** with aurora gradients and micro-animations

## Getting Started

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase_schema.sql`](./supabase_schema.sql)
3. Copy the returned event UUID from the `insert` statement at the bottom

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from your Supabase project: **Settings → API**.

### 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

### 4. Link to your event

Navigate to `http://localhost:5173/#/event/<your-event-uuid>` to see a real event from Supabase.

Without an event ID, a demo event is shown.

## Deployment to GitHub Pages

### Set up secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Enable GitHub Pages

Go to **Settings → Pages** and set:
- Source: **GitHub Actions**

### Deploy

Push to `main`. The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically build and deploy.

Your app will be live at `https://yourusername.github.io/rsvp/`

### Event URL format

Share event links in this format:
```
https://yourusername.github.io/rsvp/#/event/<event-uuid>
```

## Passkey Flow

| Scenario | What happens |
|---|---|
| First visit | Name prompt appears, device creates & stores a passkey |
| Returning on same device | Auto-authenticated from localStorage session |
| New device | Name prompt again, new passkey created (separate identity) |
| Sign out | Session cleared; passkey stays on device |

> Passkeys are device-bound. If a user signs in on a new device, they'll appear as a new attendee. This is intentional — no account recovery is needed.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Vanilla CSS (glassmorphism design system) |
| Auth | WebAuthn / Passkeys (browser native) |
| Backend | Supabase (PostgreSQL + REST API) |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| Deploy | GitHub Pages via GitHub Actions |
| Routing | Hash-based (`#/event/uuid`) for SPA on GitHub Pages |

## Video embeds in Markdown

The description field supports Markdown. Any link pointing to a YouTube or Vimeo URL will be automatically embedded as a video:

```markdown
[Watch the teaser](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
```

Direct video files (`.mp4`, `.webm`) are also embedded natively.

## Project Structure

```
src/
├── components/
│   ├── AttendeeList.tsx   # Guest list with badges
│   ├── Header.tsx         # App header
│   ├── Markdown.tsx       # Markdown + video embed renderer
│   ├── PasskeyGate.tsx    # Auth modal (name prompt / passkey)
│   └── RSVPForm.tsx       # Full RSVP form
├── context/
│   └── AuthContext.tsx    # Auth state + passkey logic
├── lib/
│   ├── db.ts              # Supabase data access
│   ├── passkey.ts         # WebAuthn utilities
│   └── supabase.ts        # Supabase client
├── pages/
│   └── EventPage.tsx      # Main event view
└── types/
    └── index.ts           # TypeScript types
```
