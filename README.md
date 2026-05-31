# Social Studio — AI Social Media Content Studio

A production-grade AI workspace for solo creators, freelancers, and small teams. Paste a topic, get on-brand LinkedIn / Twitter / Instagram drafts streaming in real time, edit them inline, schedule them on a calendar, and get an email when each one "goes live."

Built for a portfolio that demonstrates: streaming AI, brand-voice personalization, a database-backed scheduler with a node-cron worker, FullCalendar drag-and-drop, and SaaS dashboard polish.

## ✨ Features

| Feature | What it does |
| --- | --- |
| **Streaming AI generation** | Paste a topic, pick platforms + tone — drafts stream into platform cards token-by-token via SSE. |
| **Brand voice profile** | Industry, tone keywords, target audience, banned words, and an example post (style reference). Injected into every prompt. |
| **Per-platform rules** | LinkedIn (hook + 150–300 words + hashtags), Twitter (4–5 numbered tweets), Instagram (story-driven caption + 12 hashtags). |
| **Inline editing** | Click any post to edit. Live character counter, color-coded over-limit warnings. |
| **Image-prompt suggestions** | One click generates 3 DALL·E / Midjourney-ready image prompts per post. |
| **Saved posts** | Filter by status (draft / scheduled / published / failed). Edit, schedule, delete. |
| **Calendar + scheduler** | Drag-and-drop monthly/weekly calendar (FullCalendar). Click a day → pick a draft → publish at that time. |
| **Background worker** | `node-cron` worker polls the DB every minute, marks due posts as published, and emails you a copy via Resend. |
| **Analytics** | Posts per day (last 30), platform breakdown pie, tone usage bar chart, and content-creation streak. |
| **Auth** | Email + password with bcrypt + JWT in httpOnly cookie. Google OAuth slot left for the next iteration. |

## 🏗 Tech stack

- **Next.js 14** (App Router) — UI + API routes in one deploy
- **TypeScript** end-to-end
- **Prisma + Supabase Postgres**
- **Google Gemini** (`gemini-2.5-flash-lite` by default; configurable via `GEMINI_MODEL`)
- **Resend** for email notifications
- **node-cron** worker for scheduled-post publishing (lightweight alternative to BullMQ)
- **Tailwind CSS** + custom UI primitives (Radix under the hood)
- **TanStack Query** for client cache
- **FullCalendar** for the calendar UI
- **Recharts** for analytics
- **Cloudinary** keys wired in `.env` for future asset uploads

## 🚀 Local setup (5 minutes)

```bash
# 1. install
npm install

# 2. paste your Supabase Postgres password
#    Open .env and replace [PASSWORD] in DATABASE_URL and DIRECT_URL.
#    Get it from: Supabase → Project Settings → Database → Connection string.

# 3. push schema to Supabase
npm run db:push

# 4. run the dev server (UI + API)
npm run dev          # → http://localhost:3000

# 5. (in a second terminal) run the scheduler worker
npm run worker       # polls every minute for due posts
```

Open `http://localhost:3000`, register an account, fill in your **Brand Voice**, then go to **Generate** and paste a topic.

> **Tip:** If you don't want to run the worker locally, you can also hit `GET /api/schedule/tick` (or schedule it from a cron service like Vercel Cron / Railway Cron) to drive the queue.

## 🌍 Environment variables

See [`.env.example`](./.env.example). Quick summary:

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | yes | Supabase pooler + direct connection strings. |
| `JWT_SECRET` | yes | `openssl rand -base64 32` |
| `GOOGLE_API_KEY` | yes | Gemini API key (https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash-lite`. Switch to `gemini-2.0-flash-lite` etc. if your tier prefers it. |
| `RESEND_API_KEY` | optional | Skip and email sending will be a no-op (logged warning). |
| `EMAIL_FROM` | optional | Defaults to `onboarding@resend.dev`. Use a verified domain in production. |
| `CLOUDINARY_*` | optional | Reserved for brand-asset uploads. |

## 🗂 Architecture

```
src/
├── app/
│   ├── (auth)/login, (auth)/register     # public auth pages
│   ├── dashboard/                        # private app shell
│   │   ├── page.tsx                      # home / KPIs
│   │   ├── generate/                     # streaming AI studio
│   │   ├── posts/                        # all saved posts
│   │   ├── calendar/                     # FullCalendar
│   │   ├── brand/                        # brand voice settings
│   │   └── analytics/                    # charts
│   └── api/                              # JSON + SSE endpoints
│       ├── auth/                         # register / login / logout / me
│       ├── brand/                        # get + update brand voice
│       ├── generate/                     # SSE streaming /generate, regenerate, image-prompts
│       ├── posts/                        # CRUD
│       ├── schedule/                     # schedule + unschedule + tick (manual worker tick)
│       └── analytics/
├── components/
│   ├── ui/                               # button, card, dialog, input, label, textarea, badge
│   ├── dashboard/Sidebar.tsx
│   ├── generate/                         # PlatformCard, PlatformIcon
│   └── calendar/                         # ContentCalendar, ScheduleModal
├── lib/
│   ├── prisma.ts, auth.ts, utils.ts
│   ├── prompts.ts                        # platform + brand-voice prompt templates (tweak here)
│   ├── gemini.ts                         # streaming + non-streaming Gemini helpers
│   ├── email.ts                          # Resend
│   └── scheduler.ts                      # processes due posts (called by worker + tick API)
└── server/
    └── worker.ts                         # `npm run worker` — node-cron loop calling scheduler
```

## 🔌 Where to add/change things

- **Prompt rules**: `src/lib/prompts.ts`
- **Add a new platform**: extend the `PlatformKey` type, the `Platform` enum in `prisma/schema.prisma`, the prompt in `prompts.ts`, and the limit/label/color helpers in `lib/utils.ts`.
- **Switch AI provider**: edit `src/lib/gemini.ts`. Same shape of `streamPlatformPost` / `generatePlatformPost` / `generateImagePrompts` works for any provider.
- **Replace node-cron with BullMQ**: `src/lib/scheduler.ts` already isolates the work; swap `processDuePosts` to consume from a queue + push from `/api/schedule`.

## 📝 Notes on real publishing

LinkedIn / Twitter / Instagram all require business-verified OAuth apps to publish on a user's behalf. For this portfolio build, the worker marks posts as `PUBLISHED` and emails the user a ready-to-paste copy. The architecture (queue, retries, status, calendar) is exactly what a real auto-publisher would use — just plug platform APIs into `processDuePosts` when you have the apps approved.

## 🧪 Quick smoke test

```bash
# 1. start dev server + worker
npm run dev
npm run worker

# 2. register at http://localhost:3000/register
# 3. set brand voice at /dashboard/brand
# 4. generate at /dashboard/generate (paste any topic)
# 5. save a draft → schedule for "1 minute from now"
# 6. wait ~60s → check the calendar (turns green) + your inbox
```

## 📦 Deploy

- **Frontend + API**: Vercel (one click, repo import). Add all env vars in the Vercel dashboard.
- **Worker**: Railway / Render / Fly. Run `npm run worker` as a separate service. (Or use Vercel Cron to hit `GET /api/schedule/tick` every minute.)
- **DB**: Supabase (already wired).

---

Built for portfolio purposes. PRs welcome.
