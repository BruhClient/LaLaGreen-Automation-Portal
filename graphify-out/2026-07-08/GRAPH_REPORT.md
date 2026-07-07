# Graph Report - automation-portal  (2026-07-08)

## Corpus Check
- 74 files · ~29,587 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 481 nodes · 1038 edges · 41 communities (19 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77fb4ef0`
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
- [[_COMMUNITY_Sponsored Brands Upload - Generate Form & Product Blocks|Sponsored Brands Upload - Generate Form & Product Blocks]]
- [[_COMMUNITY_Dashboard, Projects & Tools Registry|Dashboard, Projects & Tools Registry]]
- [[_COMMUNITY_Chart UI Primitive (Recharts wrapper)|Chart UI Primitive (Recharts wrapper)]]
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
- [[_COMMUNITY_session.ts|session.ts]]
- [[_COMMUNITY_sku-list.ts|sku-list.ts]]
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
1. `cn()` - 59 edges
2. `getSession()` - 28 edges
3. `createServiceClient()` - 27 edges
4. `createClient()` - 24 edges
5. `requireStaff()` - 18 edges
6. `compilerOptions` - 16 edges
7. `LaLaGreen Automation Portal — Developer Guide` - 12 edges
8. `currentSlotSgt()` - 11 edges
9. `Skeleton()` - 10 edges
10. `LiveProjectionCard()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `PortalLayout()` --calls--> `getSession()`  [EXTRACTED]
  app/(portal)/layout.tsx → lib/session.ts
- `PpcTopUpPage()` --calls--> `computeRunningTotals()`  [EXTRACTED]
  app/(portal)/automations/ppc-top-up/page.tsx → lib/ppc-daily-cap-constants.ts
- `DashboardPage()` --calls--> `getSession()`  [EXTRACTED]
  app/(portal)/dashboard/page.tsx → lib/session.ts
- `TeamPage()` --calls--> `getStaffDirectory()`  [EXTRACTED]
  app/(portal)/team/page.tsx → lib/actions/staff.ts
- `POST()` --calls--> `createClient()`  [EXTRACTED]
  app/api/auth/login/route.ts → lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (41 total, 22 thin omitted)

### Community 0 - "Shared UI Components & Layout Shell"
Cohesion: 0.08
Nodes (32): markdownComponents, LoginForm(), Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage() (+24 more)

### Community 1 - "PPC Top-Up Automation"
Cohesion: 0.17
Nodes (26): isManualTopUpFuture(), LiveProjectionCard(), nextUpcomingSlot(), PpcTopUpCharts(), assertCountryExists(), getDailyCapConfig(), getStaffId(), requireStaff() (+18 more)

### Community 2 - "Auth & Staff Management"
Cohesion: 0.10
Nodes (28): ManageUsersPage(), StaffMember, DashboardPage(), DirectoryEntry, TeamPage(), ChatPanel(), PageHeader(), sendAiChatMessage() (+20 more)

### Community 3 - "Package Dependencies (package.json)"
Cohesion: 0.05
Nodes (38): dependencies, @anthropic-ai/sdk, @base-ui/react, bcryptjs, class-variance-authority, clsx, jose, lucide-react (+30 more)

### Community 4 - "Sponsored Brands Upload - Campaign Data"
Cohesion: 0.09
Nodes (39): distributeKeywords(), GenerateForm(), shuffle(), COUNTRIES, STEPS, WizardStep, Asset, Block (+31 more)

### Community 5 - "shadcn/ui Component Registry Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "PPC Schedule AI Import"
Cohesion: 0.17
Nodes (18): AMOUNT_HINTS, analyzeScheduleImport(), ColumnDetectSchema, ColumnMapping, COUNTRY_ALIASES, COUNTRY_HINTS, detectColumnsHeuristically(), detectColumnsWithAi() (+10 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Sponsored Brands Upload - Generate Form & Product Blocks"
Cohesion: 0.11
Nodes (28): PpcTopUpPage(), relativeDayLabel(), statusBadgeClass(), toNumericAmount(), formatDate(), formatPrice(), NewPricePlanSheet(), PricingUpdatePage() (+20 more)

### Community 9 - "Dashboard, Projects & Tools Registry"
Cohesion: 0.12
Nodes (16): PortalLayout(), SidebarContent(), Sidebar(), Topbar(), ConfigurationItem, ConfigurationItemInput, configurationItems, defineConfigurationItem() (+8 more)

### Community 10 - "Chart UI Primitive (Recharts wrapper)"
Cohesion: 0.21
Nodes (12): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+4 more)

### Community 11 - "Sponsored Brands Bulk XLSX Builder"
Cohesion: 0.22
Nodes (12): IncomingCampaign, POST(), BaseCampaignInput, budgetFor(), buildSponsoredBrandsBulk(), CampaignInput, dedupeKeywords(), emptyRow() (+4 more)

### Community 23 - "LaLaGreen Automation Portal — Developer Guide"
Cohesion: 0.08
Nodes (25): Adding a New Project, Adding a new staff member, Adding a New Tool, Architecture, Auth System, Database (Supabase), Environment variables, graphify (+17 more)

### Community 24 - "sp-api.ts"
Cohesion: 0.15
Nodes (21): cancelPricePlan(), createPricePlan(), listPricePlans(), PricePlan, requireStaff(), fetchSkuPricing(), requireStaff(), callSpApi() (+13 more)

### Community 25 - "session.ts"
Cohesion: 0.25
Nodes (10): POST(), POST(), clearSessionCookie(), getSecretKey(), SessionPayload, setSessionCookie(), signSession(), verifySessionToken() (+2 more)

### Community 26 - "sku-list.ts"
Cohesion: 0.26
Nodes (12): addSkus(), ColumnDetectSchema, ColumnMapping, deleteSku(), detectColumnHeuristically(), detectColumnWithAi(), DetectedSkuSheet, extractSkusFromSheet() (+4 more)

### Community 27 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **148 isolated node(s):** `StaffMember`, `DirectoryEntry`, `COUNTRIES`, `WizardStep`, `STEPS` (+143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Shared UI Components & Layout Shell` to `Sponsored Brands Upload - Generate Form & Product Blocks`, `Dashboard, Projects & Tools Registry`, `Auth & Staff Management`, `Chart UI Primitive (Recharts wrapper)`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies (package.json)` to `Chart UI Primitive (Recharts wrapper)`, `PPC Schedule AI Import`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `xlsx` connect `PPC Schedule AI Import` to `Package Dependencies (package.json)`, `sku-list.ts`, `Sponsored Brands Bulk XLSX Builder`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `StaffMember`, `DirectoryEntry`, `COUNTRIES` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Components & Layout Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.08081632653061224 - nodes in this community are weakly interconnected._
- **Should `Auth & Staff Management` be split into smaller, more focused modules?**
  _Cohesion score 0.10121457489878542 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies (package.json)` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._