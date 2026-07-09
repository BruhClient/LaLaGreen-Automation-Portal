# Graph Report - automation-portal  (2026-07-10)

## Corpus Check
- 82 files · ~35,809 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 555 nodes · 1301 edges · 37 communities (15 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `260e2543`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Shared UI Components & Layout Shell|Shared UI Components & Layout Shell]]
- [[_COMMUNITY_PPC Top-Up Automation|PPC Top-Up Automation]]
- [[_COMMUNITY_Auth & Staff Management|Auth & Staff Management]]
- [[_COMMUNITY_Package Dependencies (package.json)|Package Dependencies (package.json)]]
- [[_COMMUNITY_Sponsored Brands Upload - Campaign Data|Sponsored Brands Upload - Campaign Data]]
- [[_COMMUNITY_shadcnui Component Registry Config|shadcn/ui Component Registry Config]]
- [[_COMMUNITY_PPC Schedule AI Import|PPC Schedule AI Import]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Dashboard, Projects & Tools Registry|Dashboard, Projects & Tools Registry]]
- [[_COMMUNITY_Sponsored Brands Bulk XLSX Builder|Sponsored Brands Bulk XLSX Builder]]
- [[_COMMUNITY_Project Docs & External References|Project Docs & External References]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_File Icon Asset|File Icon Asset]]
- [[_COMMUNITY_Globe Icon Asset|Globe Icon Asset]]
- [[_COMMUNITY_Next.js Logo Asset|Next.js Logo Asset]]
- [[_COMMUNITY_Vercel Logo Asset|Vercel Logo Asset]]
- [[_COMMUNITY_Window Icon Asset|Window Icon Asset]]
- [[_COMMUNITY_LaLaGreen Automation Portal — Developer Guide|LaLaGreen Automation Portal — Developer Guide]]
- [[_COMMUNITY_sp-api.ts|sp-api.ts]]
- [[_COMMUNITY_README|README.md]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_Next.js Breaking Changes Notice|Next.js Breaking Changes Notice]]
- [[_COMMUNITY_Admin Role Restriction Policy|Admin Role Restriction Policy]]
- [[_COMMUNITY_portal_session JWT Cookie|portal_session JWT Cookie]]
- [[_COMMUNITY_LaLaGreen Automation Portal (Project Overview)|LaLaGreen Automation Portal (Project Overview)]]
- [[_COMMUNITY_No Self-Service Signup Policy|No Self-Service Signup Policy]]
- [[_COMMUNITY_Server Actions {data, error} Return Shape Convention|Server Actions {data, error} Return Shape Convention]]
- [[_COMMUNITY_Supabase staff Table|Supabase staff Table]]
- [[_COMMUNITY_Geist Font (nextfont)|Geist Font (next/font)]]
- [[_COMMUNITY_Next.js Documentation|Next.js Documentation]]
- [[_COMMUNITY_create-next-app Bootstrapped Project|create-next-app Bootstrapped Project]]
- [[_COMMUNITY_Vercel Platform|Vercel Platform]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 78 edges
2. `getSession()` - 31 edges
3. `createServiceClient()` - 28 edges
4. `createClient()` - 27 edges
5. `requireStaff()` - 18 edges
6. `compilerOptions` - 16 edges
7. `LaLaGreen Automation Portal — Developer Guide` - 12 edges
8. `getMyPermissions()` - 11 edges
9. `assertItemAccess()` - 11 edges
10. `currentSlotSgt()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `PpcTopUpLayout()` --calls--> `assertItemAccess()`  [EXTRACTED]
  app/(portal)/automations/ppc-top-up/layout.tsx → lib/permissions.ts
- `PriceChangePlansLayout()` --calls--> `assertItemAccess()`  [EXTRACTED]
  app/(portal)/automations/price-change-plans/layout.tsx → lib/permissions.ts
- `MasterListLayout()` --calls--> `assertItemAccess()`  [EXTRACTED]
  app/(portal)/configuration/master-list/layout.tsx → lib/permissions.ts
- `TeamPage()` --calls--> `getStaffDirectory()`  [EXTRACTED]
  app/(portal)/team/page.tsx → lib/actions/staff.ts
- `SponsoredBrandsUploadLayout()` --calls--> `assertItemAccess()`  [EXTRACTED]
  app/(portal)/tools/sponsored-brands-upload/layout.tsx → lib/permissions.ts

## Import Cycles
- None detected.

## Communities (37 total, 22 thin omitted)

### Community 0 - "Shared UI Components & Layout Shell"
Cohesion: 0.06
Nodes (50): daysRemaining(), EditPricePlanForm(), formatDate(), formatPrice(), HistoryTable(), NewPricePlanSheet(), PlanCard(), PlansList() (+42 more)

### Community 1 - "PPC Top-Up Automation"
Cohesion: 0.08
Nodes (53): isManualTopUpFuture(), LiveProjectionCard(), nextUpcomingSlot(), PpcTopUpPage(), relativeDayLabel(), statusBadgeClass(), toNumericAmount(), PpcTopUpCharts() (+45 more)

### Community 2 - "Auth & Staff Management"
Cohesion: 0.07
Nodes (40): ChatPanel(), markdownComponents, LoginForm(), AlertDialogMedia(), AlertDialogOverlay(), Avatar(), AvatarBadge(), AvatarFallback() (+32 more)

### Community 3 - "Package Dependencies (package.json)"
Cohesion: 0.05
Nodes (38): dependencies, @anthropic-ai/sdk, @base-ui/react, bcryptjs, class-variance-authority, clsx, jose, lucide-react (+30 more)

### Community 4 - "Sponsored Brands Upload - Campaign Data"
Cohesion: 0.09
Nodes (41): distributeKeywords(), GenerateForm(), shuffle(), COUNTRIES, STEPS, WizardStep, Asset, Block (+33 more)

### Community 5 - "shadcn/ui Component Registry Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "PPC Schedule AI Import"
Cohesion: 0.10
Nodes (28): AMOUNT_HINTS, analyzeScheduleImport(), ColumnDetectSchema, ColumnMapping, COUNTRY_ALIASES, COUNTRY_HINTS, detectColumnsHeuristically(), detectColumnsWithAi() (+20 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Dashboard, Projects & Tools Registry"
Cohesion: 0.06
Nodes (63): IncomingCampaign, POST(), ACCESS_SECTIONS, accessSummary(), ManageUsersPage(), StaffMember, PpcTopUpLayout(), PriceChangePlansLayout() (+55 more)

### Community 11 - "Sponsored Brands Bulk XLSX Builder"
Cohesion: 0.26
Nodes (11): POST(), POST(), toRole(), clearSessionCookie(), getSecretKey(), SessionPayload, setSessionCookie(), signSession() (+3 more)

### Community 23 - "LaLaGreen Automation Portal — Developer Guide"
Cohesion: 0.08
Nodes (25): Adding a New Project, Adding a new staff member, Adding a New Tool, Architecture, Auth System, Database (Supabase), Environment variables, graphify (+17 more)

### Community 24 - "sp-api.ts"
Cohesion: 0.12
Nodes (28): cancelPricePlan(), createPricePlan(), listPricePlans(), PriceType, requireStaff(), updatePricePlan(), fetchSkuPricing(), requireStaff() (+20 more)

### Community 27 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **155 isolated node(s):** `StaffMember`, `ACCESS_SECTIONS`, `PRICE_TYPES`, `PriceTypeOption`, `DirectoryEntry` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Auth & Staff Management` to `Shared UI Components & Layout Shell`, `Dashboard, Projects & Tools Registry`, `PPC Top-Up Automation`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies (package.json)` to `PPC Top-Up Automation`, `PPC Schedule AI Import`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `xlsx` connect `PPC Schedule AI Import` to `Shared UI Components & Layout Shell`, `Package Dependencies (package.json)`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **What connects `StaffMember`, `ACCESS_SECTIONS`, `PRICE_TYPES` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Components & Layout Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.06151062867480778 - nodes in this community are weakly interconnected._
- **Should `PPC Top-Up Automation` be split into smaller, more focused modules?**
  _Cohesion score 0.08317307692307692 - nodes in this community are weakly interconnected._
- **Should `Auth & Staff Management` be split into smaller, more focused modules?**
  _Cohesion score 0.06663141195134849 - nodes in this community are weakly interconnected._