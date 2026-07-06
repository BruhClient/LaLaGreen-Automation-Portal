@AGENTS.md

# LaLaGreen Automation Portal — Developer Guide

## Project Overview

Internal automation portal for LaLaGreen. Staff log in and access automation tools — each tool has its own dedicated page with custom controls. The only shared UI is the header/sidebar.

---

## Architecture

```
automation-portal/
├── app/
│   ├── layout.tsx                          # Root layout (fonts, metadata)
│   ├── page.tsx                            # Redirects to /dashboard
│   ├── login/page.tsx                      # Login page (username + password)
│   ├── api/auth/
│   │   ├── login/route.ts                  # POST /api/auth/login
│   │   └── logout/route.ts                 # POST /api/auth/logout
│   └── (portal)/                           # All protected pages live here
│       ├── layout.tsx                      # Sidebar + topbar shell
│       ├── dashboard/page.tsx              # Project grid (auto-populated)
│       ├── team/page.tsx                   # Read-only staff directory (username + role), visible to all staff
│       ├── admin/users/page.tsx            # Create staff accounts + manage roles (admin only)
│       └── automations/
│           └── ppc-top-up/page.tsx
├── components/
│   ├── ui/                                 # Base UI (Button, Input, Card, Skeleton, etc.)
│   ├── page-header.tsx                     # Shared page header for every automation
│   ├── sidebar.tsx / sidebar-content.tsx
│   ├── topbar.tsx                          # Mobile nav
│   ├── login-form.tsx
│   └── user-menu.tsx
├── lib/
│   ├── projects.ts                         # Single source of truth for all projects
│   ├── session.ts                          # JWT sign/verify/cookie helpers
│   ├── supabase/
│   │   ├── client.ts                       # Browser Supabase client
│   │   └── server.ts                       # Server Supabase client (Next.js cookies)
│   └── actions/
│       ├── index.ts                        # Re-exports all actions
│       └── staff.ts                        # listStaff, createStaffMember, getStaffDirectory, updateStaffMember, resetPassword, deleteStaffMember, getCurrentUser
├── middleware.ts                           # Route protection
└── .env.local                              # Secrets (see Environment Variables below)
```

---

## Auth System

### How it works

- **JWT** tokens signed with `JWT_SECRET` (via `jose`), stored as an HTTP-only cookie named `portal_session`
- Cookie is valid for **7 days**, secure in production, `sameSite=lax`
- `middleware.ts` runs on every request, redirects to `/login` if no valid session
- Staff accounts are stored in the Supabase `staff` table, identified by **username** (no email); passwords are bcrypt-hashed (cost 10)
- Roles: `"admin"` or `"user"` — only admins can access `/admin/*`. There are exactly two admins today (Travis, Dobie); every other account is `"user"`
- There is no self-service signup or email/invite flow — admins create every account directly from `/admin/users`
- **Admins can only create `"user"` accounts.** Granting `"admin"` (whether creating a new account or promoting an existing one) is blocked in `createStaffMember`/`updateStaffMember` and must be done directly in the Supabase `staff` table — this is intentional, not a bug. The UI only ever offers demoting an admin to user, never the reverse

### Public routes (no auth required)

`/login`, `/api/auth/login`

### Login flow

1. User submits username + password → `POST /api/auth/login`
2. Server queries `staff` table by `username` (lowercased), verifies password with `bcryptjs`
3. On success: signs JWT with `{ username, role }`, sets `portal_session` cookie
4. Client redirects to `/dashboard`

### Adding a new staff member

Go to `/admin/users` → click **Create User** → enter a username and password. The account is created immediately as a `"user"` role — no email or confirmation step, and no way to make it an admin from the UI. Every staff member (any role) can see the full account list, read-only, at `/team`.

### Reading the session server-side

```typescript
import { getSession } from "@/lib/session";

const session = await getSession(); // { username, role } | null
```

### Environment variables

```bash
# .env.local
JWT_SECRET=<64-character hex string>
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Database (Supabase)

Project ID: `fuynizhfhfnvbdzwihgp`

### `staff` table

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, auto-generated |
| `username` | `text` | Unique, lowercase, `^[a-z0-9_-]{3,32}$` |
| `password_hash` | `text` | bcrypt, cost 10 |
| `role` | `text` | `"admin"` or `"user"` |
| `created_at` | `timestamptz` | Auto |

### Supabase clients

```typescript
// Server components / actions / API routes
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client components (browser)
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

---

## Server Actions

All server actions live in `lib/actions/` and follow the `{ data, error }` return shape.

```typescript
import { listStaff, createStaffMember, getCurrentUser } from "@/lib/actions/staff";

const { data, error } = await listStaff();
```

Admin-only actions (`listStaff`, `createStaffMember`, `updateStaffMember`, `resetPassword`, `deleteStaffMember`) call `requireAdmin()` internally and return `{ data: null, error: "Unauthorized" }` if the session role isn't `"admin"`. `getStaffDirectory` (backs `/team`) and `getCurrentUser` only require a valid session — any authenticated staff member, not just admins.

---

## Adding a New Project

Every project needs two things: a definition in `lib/projects.ts` and a page file.

### Step 1 — Define the project (`lib/projects.ts`)

```typescript
import { BarChart3 } from "lucide-react"; // pick any lucide icon

export const salesMetrics = defineProject({
  name: "Sales Metrics",
  description: "Real-time sales performance dashboard",
  icon: BarChart3,
});

// Add it to the projects array — this auto-updates sidebar + dashboard
export const projects: AutomationProject[] = [
  ppcAdUpdates,
  inventoryReports,
  salesMetrics, // <-- add here
];
```

The `id` and `href` are auto-derived from the name (e.g. `"Sales Metrics"` → `id: "sales-metrics"`, `href: "/automations/sales-metrics"`).

### Step 2 — Create the page

Create `app/(portal)/automations/sales-metrics/page.tsx`:

```typescript
"use client"; // only needed if the page has interactivity

import { PageHeader } from "@/components/page-header";
import { salesMetrics } from "@/lib/projects";

export default function SalesMetricsPage() {
  return (
    <>
      <PageHeader
        icon={salesMetrics.icon}
        title={salesMetrics.name}
        description={salesMetrics.description}
      />
      {/* Everything below here is completely custom — no shared layout constraints */}
      <div className="p-6 md:p-8">
        {/* your controls, tables, forms, etc. */}
      </div>
    </>
  );
}
```

That's it. The project now appears in the sidebar and dashboard automatically.

### Step 3 — Add an API route (if needed)

Create `app/api/your-route/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // your logic here
  return NextResponse.json({ data: [] });
}
```

---

## Adding a New Tool

The sidebar and dashboard also have a separate "Tools" section, below Automations, sourced from `lib/tools.ts`. It follows the exact same pattern as `lib/projects.ts`, just under a different heading and route prefix. The "Tools" heading always renders (like "Automations"), even when the `tools` array is empty.

### Step 1 — Define the tool (`lib/tools.ts`)

```typescript
import { Wrench } from "lucide-react"; // pick any lucide icon

export const labelPrinter = defineTool({
  name: "Label Printer",
  description: "Print shipping labels in bulk",
  icon: Wrench,
});

// Add it to the tools array — this auto-updates sidebar + dashboard
export const tools: AutomationTool[] = [
  labelPrinter, // <-- add here
];
```

The `id` and `href` are auto-derived from the name (e.g. `"Label Printer"` → `id: "label-printer"`, `href: "/tools/label-printer"`).

### Step 2 — Create the page

Create `app/(portal)/tools/label-printer/page.tsx` following the same `<PageHeader>` pattern as an automation page (see "Adding a New Project" above) — just import from `@/lib/tools` instead of `@/lib/projects`.

---

## Page Header Component

Every automation page uses `<PageHeader>` at the top:

```typescript
import { PageHeader } from "@/components/page-header";

<PageHeader
  icon={project.icon}               // LucideIcon component
  title={project.name}              // string
  description={project.description} // string
/>
```

Below `<PageHeader>`, each page is entirely custom — there are no shared layout constraints.

---

## Key Conventions

| Pattern | Detail |
|---|---|
| Server components | Default for pages and layouts |
| Client components | Add `"use client"` at top when using hooks/state/events |
| Server actions | `"use server"` in `lib/actions/`; return `{ data, error }` |
| Icons | Always from `lucide-react` |
| Styling | Tailwind CSS utilities; `cn()` from `@/lib/utils` to merge classes |
| Path aliases | `@/` maps to project root |
| UI primitives | `components/ui/` (Button, Input, Card, Skeleton, Badge, etc.) |

---

## Key File Reference

| File | Purpose |
|---|---|
| `lib/projects.ts` | Add/edit automation projects |
| `lib/tools.ts` | Add/edit tools (separate "Tools" nav section) |
| `lib/session.ts` | JWT sign/verify/cookie helpers |
| `lib/supabase/server.ts` | Supabase client for server-side code |
| `lib/supabase/client.ts` | Supabase client for browser code |
| `lib/actions/staff.ts` | Staff CRUD, `createStaffMember`, `getStaffDirectory`, `getCurrentUser` |
| `middleware.ts` | Route protection + role-based redirects |
| `app/(portal)/layout.tsx` | Sidebar + topbar shell |
| `app/(portal)/admin/users/page.tsx` | Create staff accounts and manage roles |
| `app/(portal)/team/page.tsx` | Read-only staff directory (visible to all staff) |
| `components/page-header.tsx` | Shared header for automation pages |
| `.env.local` | All secrets and env config |
