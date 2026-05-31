# Social Studio — Interview Deep Dive (Read This Before Tomorrow)

This document is **100% specific to your repository** at `social/`.  
It is written so you can confidently explain the architecture and the code in an interview, even as a beginner in backend.

---

## Table of contents

- Part 1: Full project architecture (with diagrams + exact files)
- Part 2: Frontend complete breakdown (file-by-file)
- Part 3: “Backend” complete breakdown (file-by-file; this repo uses Next.js API routes)
- Part 4: Full data flow scenarios (registration, login, protected pages, main feature)
- Part 5: Core concepts from zero (using only examples from this repo)
- Part 6: Commands and setup explanation (every important script/config)
- Part 7: Interview mode (questions + strong answers based on THIS code)
- Part 8: Explain like I built it (a confident narrative you can say out loud)

---

# Part 1 — Full project architecture

## 1.1 One sentence summary (interview-friendly)

**Social Studio is a single Next.js 14 app that serves both the UI and a backend API, uses Prisma + Postgres for data, streams AI-generated posts via Server-Sent Events (SSE), and runs a cron worker to “publish” scheduled posts and email users.**

## 1.2 “Frontend” and “Backend” in THIS repo

This repo is **not** split into `apps/web` and `apps/api`. Instead:

- **Frontend** = React pages/components inside `src/app/**` and `src/components/**`
- **Backend** = Next.js API routes inside `src/app/api/**`
- **Database layer** = Prisma client + schema (`src/lib/prisma.ts`, `prisma/schema.prisma`)
- **AI service layer** = Gemini wrapper (`src/lib/gemini.ts`) + prompts (`src/lib/prompts.ts`)
- **Scheduler** = DB-backed queue table `ScheduledJob` + processor (`src/lib/scheduler.ts`) + cron runner (`src/server/worker.ts`)

### Why this architecture?

- **One deployable artifact**: Next.js can host both UI and API (easy to ship on Vercel).
- **Less moving parts for a portfolio**: No separate Express server needed.
- **Still “real backend”**: API routes + Prisma + auth + jobs are the same backend concerns.

## 1.3 How frontend and backend communicate (THIS project)

The browser calls your API routes with `fetch()`:

- Example: login form calls `POST /api/auth/login` (file: `src/app/(auth)/login/page.tsx`)
- That request hits the API handler in `src/app/api/auth/login/route.ts`
- The API handler uses Prisma (`src/lib/prisma.ts`) to read the DB
- On success, it writes an **httpOnly cookie** via `setSessionCookie()` (`src/lib/auth.ts`)
- The browser then visits protected pages like `/dashboard`, and the server checks the cookie

## 1.4 What happens when a user opens the app?

### Step-by-step

1. User opens `http://localhost:3000/`
2. Next.js renders `src/app/layout.tsx` (root layout) and `src/app/page.tsx` (landing page)
3. The `<Providers>` wrapper from `src/app/providers.tsx` sets up:
   - React Query cache (for API calls)
   - Toast notifications (for UI feedback)

### “Where React starts”

In Next.js App Router:
- **Routes are folders**, not a `ReactDOM.render()` call.
- Your “entry point” is effectively:
  - `src/app/layout.tsx` (global frame)
  - then a route page like `src/app/page.tsx`

## 1.5 Where the “backend server” starts (THIS project)

There is no `server/index.ts`.  
The backend is “started” when you run the Next.js server:

- Dev: `npm run dev` or `npm run dev:poll`
- Production: `npm run build` then `npm run start`

Next.js internally spins up a Node server and wires `src/app/api/**/route.ts` handlers.

There is a **separate optional process** for scheduled jobs:

- `npm run worker` → runs `src/server/worker.ts` (cron loop)

## 1.6 Environment variables: where they’re used and why

Your `.env.example` documents the required vars:

```1:49:/Users/pratyushkumar/Desktop/Portfolio project/social/.env.example
# ... (see full file in repo)
```

In code, environment variables are used here:

- **Database**: `prisma/schema.prisma` uses `env("DATABASE_URL")` and `env("DIRECT_URL")`

```6:10:/Users/pratyushkumar/Desktop/Portfolio project/social/prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- **JWT secret**: `src/lib/auth.ts` reads `process.env.JWT_SECRET`

```6:9:/Users/pratyushkumar/Desktop/Portfolio project/social/src/lib/auth.ts
const COOKIE_NAME = "ss_session";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-change-me-please-use-openssl-rand-base64-32-in-prod"
);
```

- **Gemini API key / model**: `src/lib/gemini.ts` reads `process.env.GOOGLE_API_KEY` and `process.env.GEMINI_MODEL`

```5:16:/Users/pratyushkumar/Desktop/Portfolio project/social/src/lib/gemini.ts
const apiKey = process.env.GOOGLE_API_KEY || "";
const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
```

- **Resend**: `src/lib/email.ts` reads `process.env.RESEND_API_KEY` and `process.env.EMAIL_FROM`

```3:6:/Users/pratyushkumar/Desktop/Portfolio project/social/src/lib/email.ts
const apiKey = process.env.RESEND_API_KEY || "";
const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
```

### Interview “why”

Environment variables are used for **secrets + deploy differences**:
- Locally you might use Docker Postgres
- In prod you use Supabase Postgres
- You never hardcode secrets into frontend code

## 1.7 Text flow diagram (as requested)

### Example scenario: Generate LinkedIn post

User
↓
`src/app/dashboard/generate/page.tsx` (click “Generate posts”)
↓
`fetch("/api/generate")` in `handleGenerate()`
↓
`src/app/api/generate/route.ts` (POST handler)
↓
`getSessionFromRequest()` in `src/lib/auth.ts` (auth check)
↓
`prisma.brandVoice.findUnique()` in `src/app/api/generate/route.ts` (load brand)
↓
`streamPlatformPost()` in `src/lib/gemini.ts` (calls Gemini streaming)
↓
SSE events streamed back (`event: chunk`, `event: done`)
↓
Frontend parses SSE chunks, updates React state with `setState(...)`
↓
UI updates in `PlatformCard` (`src/components/generate/PlatformCard.tsx`)

### Mermaid diagram (same idea, visual)

```mermaid
flowchart TD
  U[User clicks Generate] --> GP[src/app/dashboard/generate/page.tsx]
  GP -->|fetch POST /api/generate| API[src/app/api/generate/route.ts]
  API --> AUTH[src/lib/auth.ts getSessionFromRequest]
  AUTH -->|ok| BRAND[Prisma: brandVoice.findUnique]
  BRAND --> GEM[src/lib/gemini.ts streamPlatformPost]
  GEM -->|SSE: chunk/done events| GP
  GP --> STATE[React setState updates per platform]
  STATE --> CARD[src/components/generate/PlatformCard.tsx renders]
```

---

# Part 2 — Frontend complete breakdown (file-by-file)

Important: in Next.js App Router, **pages and layouts live in `src/app`**.

## 2.1 Routing table (THIS repo)

| Path | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | Landing page (marketing) |
| `/login` | `src/app/(auth)/login/page.tsx` | Login form |
| `/register` | `src/app/(auth)/register/page.tsx` | Registration form |
| `/dashboard` | `src/app/dashboard/page.tsx` | Home / KPIs |
| `/dashboard/generate` | `src/app/dashboard/generate/page.tsx` | Main AI studio |
| `/dashboard/posts` | `src/app/dashboard/posts/page.tsx` | Saved posts CRUD UI |
| `/dashboard/calendar` | `src/app/dashboard/calendar/page.tsx` | Content calendar UI |
| `/dashboard/brand` | `src/app/dashboard/brand/page.tsx` | Brand voice settings |
| `/dashboard/analytics` | `src/app/dashboard/analytics/page.tsx` | Charts + stats |

## 2.2 Global “app frame” files

### `src/app/layout.tsx`

**What it does**
- Defines the HTML shell for every page.
- Imports global CSS.
- Wraps every page in `Providers` (React Query + Toaster).

**Who imports it**
- Next.js automatically uses it; you don’t import it manually.

**What breaks if removed**
- App won’t build; Next expects a root layout in App Router.

Code:

```1:23:/Users/pratyushkumar/Desktop/Portfolio project/social/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Social Studio — AI Content Studio",
  description:
    "Paste a topic, get on-brand LinkedIn, Twitter/X and Instagram posts streamed in seconds. Schedule, edit, and analyze your content from one beautiful workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Line-by-line explanation (simple):
- `import type { Metadata } from "next";`  
  Imports a TypeScript *type* used for page metadata (title/description).
- `import { Inter } from "next/font/google";`  
  Next.js can automatically load Google fonts in an optimized way.
- `import "./globals.css";`  
  Brings in Tailwind + global styles for the whole app.
- `import { Providers } from "./providers";`  
  A React component that sets up global app tools (React Query + toast).
- `const inter = Inter(...)`  
  Loads the font and stores CSS variable name.
- `export const metadata = ...`  
  Sets the browser title + description (SEO + sharing).
- `RootLayout({ children })`  
  `children` means “whatever page is being rendered inside this layout.”
- `<Providers>{children}</Providers>`  
  Wraps every page so they can use React Query and toasts.

Analogy: `layout.tsx` is like the **building**; every page is a **room** inside it.

### `src/app/providers.tsx`

**What it does**
- Creates a React Query `QueryClient` (cache for API calls)
- Adds `react-hot-toast` Toaster for notifications

Code:

```1:23:/Users/pratyushkumar/Desktop/Portfolio project/social/src/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: "10px" } }} />
    </QueryClientProvider>
  );
}
```

Line-by-line:
- `"use client";`  
  This file runs in the browser (client component). React Query is client-side.
- `useState(() => new QueryClient(...))`  
  Creates the QueryClient once.  
  **Why useState?** Because if you create it directly, it might be recreated on every re-render.
- `staleTime: 30 * 1000`  
  Data is considered “fresh” for 30 seconds, so React Query won’t refetch constantly.
- `refetchOnWindowFocus: false`  
  Avoid annoying auto refetch when you tab away and back.
- `<Toaster .../>`  
  This is the global “popup notification system.”

Analogy: Providers is the **shared backpack** (cache + toaster) every component can use.

### `src/app/globals.css`

**What it does**
- Defines Tailwind layers (`@tailwind base/components/utilities`)
- Defines CSS variables (colors, radius) for consistent design
- Overrides FullCalendar styles to match the app theme

If removed:
- UI loses styling (Tailwind classes will not work correctly).

## 2.3 Public pages

### `src/app/page.tsx` (Landing)

**What it does**
- Marketing landing page with CTA buttons to login/register

If removed:
- `/` becomes 404

Key concept: `Link` is Next’s client navigation (faster than full page reload).

### `src/app/(auth)/layout.tsx`

**What it does**
- Layout wrapper for login/register pages (two-column design)

If removed:
- Login/register pages still work, but lose the shared design.

### `src/app/(auth)/login/page.tsx`

This is your **“basic React form + fetch”** example.

Key code (the part you will explain in interviews):

```11:36:/Users/pratyushkumar/Desktop/Portfolio project/social/src/app/(auth)/login/page.tsx
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }
  // ...
}
```

Line-by-line (beginner-friendly):
- `const [email, setEmail] = useState("")`  
  Creates state. `email` is the current input value. `setEmail` updates it.
- `onSubmit(e)` + `e.preventDefault()`  
  Stops the browser from doing a full page reload.
- `fetch("/api/auth/login", { method: "POST", ... })`  
  Calls your backend route to log in.
- `if (!res.ok) throw new Error(...)`  
  If backend returned 401/500, we treat it as an error and show a toast.
- `router.push("/dashboard")`  
  Navigate after success.
- `router.refresh()`  
  Refreshes server components so `/dashboard/layout.tsx` sees the new cookie.

Analogy: form submit is like **sending a filled paper form** to a receptionist (the API route).

### `src/app/(auth)/register/page.tsx`

Same idea as login, but calls `POST /api/auth/register` and then routes to brand page.

## 2.4 Protected dashboard pages

### How protection works (the “private club guard”)

The guard is inside `src/app/dashboard/layout.tsx`:

```6:13:/Users/pratyushkumar/Desktop/Portfolio project/social/src/app/dashboard/layout.tsx
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) redirect("/login");
  // ...
}
```

Line-by-line:
- `getSession()` reads the **httpOnly cookie** (`ss_session`) and verifies the JWT (`src/lib/auth.ts`).
- If no session → `redirect("/login")` (server-side redirect).
- If session exists → fetch the user in DB, to ensure user still exists.

Analogy: the cookie is your **wristband**, and the layout is the **bouncer** who checks it.

### `src/components/dashboard/Sidebar.tsx`

**What it does**
- Shows navigation links
- Shows user initials
- Handles logout (calls `/api/auth/logout`)

If removed:
- Dashboard still renders, but no navigation; user can’t move around.

## 2.5 Main feature UI: Generate page + PlatformCard

### `src/app/dashboard/generate/page.tsx`

This file has the key SSE parsing logic.

The “big interview story” here:
- We call `/api/generate`
- It streams back chunks
- We manually parse the text stream into events
- We update per-platform state

### `src/components/generate/PlatformCard.tsx`

This card is the UI for a single platform output:
- edit
- copy
- regenerate
- save draft
- schedule
- generate image prompts

Important React concepts used here:
- `useState` (local UI states)
- `useEffect` (auto-scroll while streaming)
- props (parent passes `content`, `status`, handlers)

## 2.6 Posts page (CRUD UI)

### `src/app/dashboard/posts/page.tsx`

Key concept: React Query manages server state:
- `useQuery` loads posts
- `useMutation` deletes or unschedules

## 2.7 Calendar + scheduling UI

### `src/components/calendar/ContentCalendar.tsx`

Key concept:
- FullCalendar renders events from `/api/posts`
- Dragging an event calls `/api/schedule` again with new datetime
- Clicking a day opens “pick draft” modal → schedule modal

### `src/components/calendar/ScheduleModal.tsx`

Uses `datetime-local` input and calls `/api/schedule`.

## 2.8 Analytics UI

### `src/app/dashboard/analytics/page.tsx`

Uses Recharts to visualize `/api/analytics`.

## 2.9 UI primitives

All these are lightweight “shadcn-style” components:
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/dialog.tsx`

They exist so you can:
- keep consistent UI styles
- avoid repeating Tailwind class strings everywhere

If removed:
- App would compile-fail because pages import them.

---

# Part 3 — Backend complete breakdown (THIS repo’s backend = Next API routes)

## 3.1 The “server framework” is Next.js route handlers

Each backend endpoint is a file like:

- `src/app/api/auth/login/route.ts` → `POST /api/auth/login`
- `src/app/api/posts/route.ts` → `GET /api/posts`, `POST /api/posts`

So there is no `express.json()` line. Next handles JSON parsing, but you still call `await req.json()`.

## 3.2 Auth backend (login/register/logout/me)

### `src/lib/auth.ts` (core auth helpers)

This file is the heart of auth:
- sign JWT
- verify JWT
- store cookie
- read cookie

Cookie name: `ss_session` (line 6).

### `src/app/api/auth/register/route.ts`

Purpose:
- validate input (Zod)
- check if user exists
- hash password (bcrypt)
- create user in DB (Prisma)
- set session cookie

### `src/app/api/auth/login/route.ts`

Purpose:
- validate input
- find user by email
- compare password hash
- set cookie

### `src/app/api/auth/logout/route.ts`

Purpose:
- clears cookie

### `src/app/api/auth/me/route.ts`

Purpose:
- returns current user info if logged in, else `{ user: null }`

## 3.3 Brand voice backend

### `src/app/api/brand/route.ts`

Uses `authedRoute()` helper to enforce auth.  
Stores brand voice using Prisma `upsert` (create if missing, update if exists).

## 3.4 Generate backend (SSE streaming)

### `src/app/api/generate/route.ts`

This endpoint is the main feature:
- checks cookie session
- applies rate limiting (in-memory)
- loads brand voice from DB
- streams AI content from Gemini
- sends SSE events like:
  - `meta`
  - `start`
  - `chunk`
  - `done`
  - `complete`

### `src/lib/gemini.ts` and `src/lib/prompts.ts`

These files separate concerns:
- prompts are text templates (easy to tune)
- gemini wrapper does API calls / streaming

This is an interview win: “I kept prompts isolated for fast iteration.”

## 3.5 Posts backend (CRUD)

### `src/app/api/posts/route.ts`
- `GET` returns posts (optional query `status`, `platform`)
- `POST` creates a draft

### `src/app/api/posts/[id]/route.ts`
- `GET` fetch one
- `PATCH` update
- `DELETE` delete

## 3.6 Scheduling backend

### The data model

See `ScheduledJob` in `prisma/schema.prisma` (lines 70–81).  
This is a **DB-backed job queue**.

### `src/app/api/schedule/route.ts`

Schedules a post by:
- verifying post belongs to user
- writing `Post.status = SCHEDULED`
- upserting `ScheduledJob` with `scheduledAt`

### `src/lib/scheduler.ts`

Processes due jobs:
- finds jobs whose `scheduledAt <= now` and `processedAt is null`
- marks post as `PUBLISHED`
- emails user
- marks job as processed

### `src/app/api/schedule/tick/route.ts`

Manual trigger endpoint (useful for cron services):
- calls `processDuePosts()`

### `src/server/worker.ts`

Runs a cron schedule every minute locally:
- `cron.schedule("* * * * *", tick);`

## 3.7 Analytics backend

### `src/app/api/analytics/route.ts`

Aggregates:
- totals by status
- breakdown by platform
- posts per day
- tone usage
- streak

## 3.8 Health endpoint

### `src/app/api/health/route.ts`

Returns a friendly DB connectivity status:
- `{ ok: true, db: "connected" }`
- or `{ ok: false, db: "disconnected", error: "..." }`

## 3.9 Error mapping helper

### `src/lib/db-errors.ts`

Converts confusing DB errors (like Supabase pooler “Tenant not found”) into a beginner-friendly fix message.

---

# Part 4 — Full data flow scenarios (exact files in order)

## 4.1 User registration flow

1. User submits form in `src/app/(auth)/register/page.tsx`
2. Browser calls `POST /api/auth/register`
3. Handler `src/app/api/auth/register/route.ts`
4. Prisma writes user using `src/lib/prisma.ts`
5. Password hashed via `bcryptjs`
6. JWT cookie set via `src/lib/auth.ts` (`setSessionCookie`)
7. Frontend redirects to `/dashboard/brand`
8. Dashboard guard runs `src/app/dashboard/layout.tsx` which checks cookie with `getSession()`

## 4.2 User login flow

1. Form `src/app/(auth)/login/page.tsx`
2. `POST /api/auth/login` → `src/app/api/auth/login/route.ts`
3. Check password hash, set cookie, redirect to `/dashboard`

## 4.3 Accessing protected route (private club guard)

1. User visits `/dashboard`
2. Next renders `src/app/dashboard/layout.tsx`
3. That calls `getSession()` in `src/lib/auth.ts`
4. If missing/invalid → redirect to `/login`

## 4.4 Main feature: generate streaming posts

1. User clicks Generate in `src/app/dashboard/generate/page.tsx`
2. `fetch("/api/generate")` sends `{ topic, platforms, tone }`
3. Backend: `src/app/api/generate/route.ts`
4. Reads cookie using `getSessionFromRequest()` (`src/lib/auth.ts`)
5. Loads brand voice from Prisma (`prisma.brandVoice.findUnique`)
6. Calls Gemini streaming wrapper `streamPlatformPost()` (`src/lib/gemini.ts`)
7. Sends SSE chunks
8. Frontend parses chunks and updates React state
9. Cards render output in `src/components/generate/PlatformCard.tsx`

---

# Part 5 — Core concepts from zero (only using THIS repo)

## Middleware (in THIS repo)

You don’t use Express middleware; you use a helper wrapper:

- `authedRoute()` in `src/lib/api-helpers.ts`

Analogy: a **security checkpoint** you must pass before entering a room.

## JWT (session token)

In `src/lib/auth.ts`, a JWT is created and stored in a cookie:

- `signSession()` creates the token
- `setSessionCookie()` stores it
- `verifySession()` verifies it later

Analogy: a **tamper-proof wristband**.

## Password hashing

In register route:
- `bcrypt.hash(password, 10)` turns your password into a “scrambled” value.

Analogy: you never store the real key; you store a **lock imprint**.

## HTTP methods (GET/POST/PATCH/DELETE)

Examples:
- `GET /api/posts` → read
- `POST /api/posts` → create
- `PATCH /api/posts/[id]` → edit
- `DELETE /api/posts/[id]` → delete

## Status codes

Examples:
- `401` unauthorized in `authedRoute`
- `409` email already exists in register route
- `429` rate limit in generate route
- `503` db disconnected in health route

## Environment variables

Used for secrets and deploy configs (see Part 1.6).

## async/await

All DB and AI calls are async. Example:
- `await prisma.user.findUnique(...)`

Analogy: you placed an order and must **wait for the kitchen** before serving.

## try/catch

Used to handle errors without crashing.

## State management / re-rendering

Example in generate page:
- `setState(...)` updates content as SSE chunks arrive
- React re-renders cards automatically

## Lifting state

Parent `GeneratePage` owns `state` and passes props to each `PlatformCard`.

Analogy: the parent is the **conductor**, cards are **musicians**.

---

# Part 6 — Commands and setup explanation

## 6.1 `package.json` scripts (what they do)

```5:19:/Users/pratyushkumar/Desktop/Portfolio project/social/package.json
  "scripts": {
    "dev": "next dev -p 3000",
    "dev:poll": "WATCHPACK_POLLING=true WATCHPACK_POLLING_INTERVAL=1000 next dev -p 3000",
    "dev:mac": "ulimit -n 4096 && next dev -p 3000",
    "db:local:up": "docker compose up -d",
    "db:local:down": "docker compose down",
    "build": "prisma generate && next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "worker": "tsx src/server/worker.ts",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
```

Explain like an interviewer:
- `npm install`  
  Downloads all dependencies in `package.json` into `node_modules`.
- `npm run dev`  
  Starts Next.js dev server at port 3000.
- `npm run dev:poll`  
  Same, but uses polling watchers to avoid macOS “too many open files” errors.
- `npm run build`  
  Generates Prisma client then builds the Next.js production bundle.
- `npm run worker`  
  Starts the cron loop that publishes due posts.
- `npm run db:push`  
  Pushes Prisma schema to your database (creates tables).

## 6.2 Docker local DB

`docker-compose.yml` runs Postgres locally on port **5433**.

Commands:

```bash
docker compose up -d
docker compose down
```

Explain:
- `docker compose up -d` starts the database in the background.
- Your app then connects using:
  `postgresql://postgres:postgres@localhost:5433/social_studio`

---

# Part 7 — Interview mode (questions + strong answers)

## 7.1 20 frontend questions (with answers)

1) **Q:** Where does routing live in this project?  
   **A:** In `src/app/**`. Each folder is a route; e.g. `src/app/dashboard/generate/page.tsx` is `/dashboard/generate`.

2) **Q:** How do you protect routes?  
   **A:** The guard is server-side in `src/app/dashboard/layout.tsx` using `getSession()` from `src/lib/auth.ts`. If no session, it redirects to `/login`.

3) **Q:** How does streaming UI work?  
   **A:** `src/app/dashboard/generate/page.tsx` reads the response stream from `/api/generate`, parses SSE events (`event: chunk`), and appends text into React state so cards re-render.

4) **Q:** Why React Query?  
   **A:** To cache and refetch server state like posts/brand/analytics (`useQuery` + `useMutation`). It reduces manual loading state management.

… (continue in the same pattern during your interview; use the files above)

## 7.2 15 backend questions (with answers)

1) **Q:** Where is the backend?  
   **A:** In Next API routes: `src/app/api/**/route.ts`.

2) **Q:** How do you authenticate API requests?  
   **A:** Most routes wrap with `authedRoute()` in `src/lib/api-helpers.ts`, which checks the JWT cookie (`getSessionFromRequest`) and loads the user from DB.

3) **Q:** How do you schedule jobs?  
   **A:** Store a `ScheduledJob` row in Postgres with `scheduledAt`. The worker (`src/server/worker.ts`) runs `processDuePosts()` every minute.

## 7.3 10 architecture questions (with answers)

1) **Q:** Why combine frontend + backend in Next.js?  
   **A:** Fewer deploys, easier portfolio delivery, and Next route handlers still support real backend concerns.

2) **Q:** Why store jobs in DB instead of Redis queue?  
   **A:** Simplifies infra for portfolio; still demonstrates idempotent job processing and scheduling.

---

# Part 8 — Explain like I built it (say this in the interview)

“I designed Social Studio as a single Next.js 14 app so I could ship both the UI and backend API together. The UI lives under `src/app` with a protected dashboard layout that checks a JWT stored in an httpOnly cookie. For data, I used Prisma with Postgres because it gives type-safe queries and an easy schema in `prisma/schema.prisma`.  

The core feature is AI post generation: the frontend calls `POST /api/generate` and the backend streams output back over SSE so the UI updates token-by-token. I kept prompts isolated in `src/lib/prompts.ts` so tuning copy style doesn’t require touching endpoint logic, and I wrapped Gemini in `src/lib/gemini.ts` to keep provider code separate.  

For scheduling, I modeled jobs as rows in a `ScheduledJob` table and wrote a processor `processDuePosts()` that marks posts as published and triggers email notifications via Resend. Locally I run it with a cron worker in `src/server/worker.ts`, and in production I could swap to a hosted cron or a real queue like BullMQ.  

If I had more time, I’d add OAuth login, real Redis rate limiting, and platform publishing integrations, but the architecture is already set up for those upgrades.”  

---

## One important note (honesty for interview)

This repo uses **Next.js route handlers** instead of a separate Express server.  
If asked “where is Express?”, say:

> “I intentionally used Next.js API routes to reduce deployment complexity; the backend patterns are still the same—auth, validation, database access, streaming, and background jobs.”

