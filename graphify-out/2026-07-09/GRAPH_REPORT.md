# Graph Report - automation-portal  (2026-07-09)

## Corpus Check
- 76 files · ~32,052 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 515 nodes · 1137 edges · 39 communities (17 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9d41d476`
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
1. `cn()` - 78 edges
2. `getSession()` - 28 edges
3. `createServiceClient()` - 27 edges
4. `createClient()` - 24 edges
5. `requireStaff()` - 18 edges
6. `compilerOptions` - 16 edges
7. `LaLaGreen Automation Portal — Developer Guide` - 12 edges
8. `getSkuPricing()` - 11 edges
9. `currentSlotSgt()` - 11 edges
10. `LiveProjectionCard()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `DashboardPage()` --calls--> `getSession()`  [EXTRACTED]
  app/(portal)/dashboard/page.tsx → lib/session.ts
- `AvatarImage()` --calls--> `cn()`  [EXTRACTED]
  components/ui/avatar.tsx → lib/utils.ts
- `AvatarBadge()` --calls--> `cn()`  [EXTRACTED]
  components/ui/avatar.tsx → lib/utils.ts
- `AvatarGroup()` --calls--> `cn()`  [EXTRACTED]
  components/ui/avatar.tsx → lib/utils.ts
- `AvatarGroupCount()` --calls--> `cn()`  [EXTRACTED]
  components/ui/avatar.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Communities (39 total, 22 thin omitted)

### Community 0 - "Shared UI Components & Layout Shell"
Cohesion: 0.06
Nodes (53): PpcTopUpPage(), toNumericAmount(), daysRemaining(), formatDate(), formatPrice(), HistoryTable(), PlanCard(), progressPercent() (+45 more)

### Community 1 - "PPC Top-Up Automation"
Cohesion: 0.15
Nodes (30): isManualTopUpFuture(), LiveProjectionCard(), nextUpcomingSlot(), relativeDayLabel(), statusBadgeClass(), PpcTopUpCharts(), assertCountryExists(), CountryConfig (+22 more)

### Community 2 - "Auth & Staff Management"
Cohesion: 0.10
Nodes (18): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), DropdownMenu(), DropdownMenuCheckboxItem() (+10 more)

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
Cohesion: 0.18
Nodes (17): AMOUNT_HINTS, analyzeScheduleImport(), ColumnDetectSchema, ColumnMapping, COUNTRY_ALIASES, COUNTRY_HINTS, detectColumnsHeuristically(), detectColumnsWithAi() (+9 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Dashboard, Projects & Tools Registry"
Cohesion: 0.08
Nodes (28): DashboardPage(), SidebarContent(), Sidebar(), Separator(), sendAiChatMessage(), ChatMessage, generateAssistantReply(), chatToolDefinitions (+20 more)

### Community 10 - "Chart UI Primitive (Recharts wrapper)"
Cohesion: 0.21
Nodes (12): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+4 more)

### Community 11 - "Sponsored Brands Bulk XLSX Builder"
Cohesion: 0.08
Nodes (38): POST(), POST(), IncomingCampaign, POST(), ManageUsersPage(), StaffMember, PortalLayout(), DirectoryEntry (+30 more)

### Community 23 - "LaLaGreen Automation Portal — Developer Guide"
Cohesion: 0.08
Nodes (25): Adding a New Project, Adding a new staff member, Adding a New Tool, Architecture, Auth System, Database (Supabase), Environment variables, graphify (+17 more)

### Community 24 - "sp-api.ts"
Cohesion: 0.12
Nodes (30): cancelPricePlan(), createPricePlan(), listPricePlans(), PricePlan, requireStaff(), fetchSkuDetail(), fetchSkuPricing(), requireStaff() (+22 more)

### Community 26 - "sku-list.ts"
Cohesion: 0.18
Nodes (16): NewPricePlanSheet(), addSkus(), ColumnDetectSchema, ColumnMapping, deleteSku(), detectColumnHeuristically(), detectColumnWithAi(), DetectedSkuSheet (+8 more)

### Community 27 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **149 isolated node(s):** `StaffMember`, `DirectoryEntry`, `COUNTRIES`, `WizardStep`, `STEPS` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Shared UI Components & Layout Shell` to `Dashboard, Projects & Tools Registry`, `Auth & Staff Management`, `Chart UI Primitive (Recharts wrapper)`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies (package.json)` to `Chart UI Primitive (Recharts wrapper)`, `sku-list.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `xlsx` connect `sku-list.ts` to `Package Dependencies (package.json)`, `Sponsored Brands Bulk XLSX Builder`, `PPC Schedule AI Import`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `StaffMember`, `DirectoryEntry`, `COUNTRIES` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Components & Layout Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.062421972534332085 - nodes in this community are weakly interconnected._
- **Should `Auth & Staff Management` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies (package.json)` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._