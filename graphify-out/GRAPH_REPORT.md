# Graph Report - .  (2026-07-06)

## Corpus Check
- Corpus is ~23,157 words - fits in a single context window. You may not need a graph.

## Summary
- 376 nodes · 817 edges · 23 communities (14 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.89)
- Token cost: 326,589 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `cn()` - 55 edges
2. `getSession()` - 21 edges
3. `createClient()` - 21 edges
4. `createServiceClient()` - 21 edges
5. `requireStaff()` - 18 edges
6. `compilerOptions` - 16 edges
7. `currentSlotSgt()` - 11 edges
8. `LiveProjectionCard()` - 9 edges
9. `createManualTopUp()` - 9 edges
10. `CANONICAL_SLOTS` - 9 edges

## Surprising Connections (you probably didn't know these)
- `listStaff()` --references--> `Server Actions {data, error} Return Shape Convention`  [EXTRACTED]
  lib/actions/staff.ts → CLAUDE.md
- `listStaff()` --shares_data_with--> `Supabase staff Table`  [INFERRED]
  lib/actions/staff.ts → CLAUDE.md
- `getStaffDirectory()` --shares_data_with--> `Supabase staff Table`  [INFERRED]
  lib/actions/staff.ts → CLAUDE.md
- `getCurrentUser()` --shares_data_with--> `Supabase staff Table`  [INFERRED]
  lib/actions/staff.ts → CLAUDE.md
- `Admin Role Restriction Policy` --rationale_for--> `createStaffMember()`  [EXTRACTED]
  CLAUDE.md → lib/actions/staff.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Admin-Only Staff Actions Authorization Flow** — lib_actions_staff_liststaff, lib_actions_staff_createstaffmember, lib_actions_staff_updatestaffmember, lib_actions_staff_resetpassword, lib_actions_staff_deletestaffmember, lib_actions_staff_requireadmin [EXTRACTED 1.00]
- **Adding a New Automation Project Pattern** — lib_projects_defineproject, lib_projects_projects, components_page_header_pageheader [EXTRACTED 0.90]
- **Login Authentication Flow** — app_api_auth_login_route_post, lib_session_getsession, database_staff_table, claude_jwt_session_cookie [EXTRACTED 0.90]

## Communities (23 total, 9 thin omitted)

### Community 0 - "Shared UI Components & Layout Shell"
Cohesion: 0.06
Nodes (41): PortalLayout(), LoginForm(), SidebarContent(), Sidebar(), Topbar(), Avatar(), AvatarBadge(), AvatarFallback() (+33 more)

### Community 1 - "PPC Top-Up Automation"
Cohesion: 0.12
Nodes (39): isManualTopUpFuture(), LiveProjectionCard(), nextUpcomingSlot(), PpcTopUpPage(), relativeDayLabel(), statusBadgeClass(), toNumericAmount(), PpcTopUpCharts() (+31 more)

### Community 2 - "Auth & Staff Management"
Cohesion: 0.10
Nodes (36): POST(), POST(), IncomingCampaign, POST(), ManageUsersPage(), StaffMember, DirectoryEntry, TeamPage() (+28 more)

### Community 3 - "Package Dependencies (package.json)"
Cohesion: 0.05
Nodes (36): dependencies, @anthropic-ai/sdk, @base-ui/react, bcryptjs, class-variance-authority, clsx, jose, lucide-react (+28 more)

### Community 4 - "Sponsored Brands Upload - Campaign Data"
Cohesion: 0.15
Nodes (27): COUNTRIES, STEPS, WizardStep, Brand, createBrand(), createKeywordTheme(), createVideoAsset(), deleteBrand() (+19 more)

### Community 5 - "shadcn/ui Component Registry Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "PPC Schedule AI Import"
Cohesion: 0.16
Nodes (18): AMOUNT_HINTS, analyzeScheduleImport(), ColumnDetectSchema, ColumnMapping, COUNTRY_ALIASES, COUNTRY_HINTS, detectColumnsHeuristically(), detectColumnsWithAi() (+10 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Sponsored Brands Upload - Generate Form & Product Blocks"
Cohesion: 0.18
Nodes (12): distributeKeywords(), GenerateForm(), shuffle(), Asset, Block, Brand, newBlock(), Preset (+4 more)

### Community 9 - "Dashboard, Projects & Tools Registry"
Cohesion: 0.17
Nodes (13): DashboardPage(), AutomationProject, defineProject(), ppcTopUp, ProjectInput, projects, slugify(), AutomationTool (+5 more)

### Community 10 - "Chart UI Primitive (Recharts wrapper)"
Cohesion: 0.21
Nodes (12): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+4 more)

### Community 11 - "Sponsored Brands Bulk XLSX Builder"
Cohesion: 0.25
Nodes (10): BaseCampaignInput, budgetFor(), buildSponsoredBrandsBulk(), CampaignInput, dedupeKeywords(), emptyRow(), HEADER, SHEET_NAME (+2 more)

### Community 12 - "Project Docs & External References"
Cohesion: 0.33
Nodes (6): node_modules/next/dist/docs Reference, Next.js Breaking Changes Notice, Geist Font (next/font), Next.js Documentation, create-next-app Bootstrapped Project, Vercel Platform

## Ambiguous Edges - Review These
- `Next.js Breaking Changes Notice` → `create-next-app Bootstrapped Project`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to

## Knowledge Gaps
- **109 isolated node(s):** `StaffMember`, `DirectoryEntry`, `COUNTRIES`, `WizardStep`, `STEPS` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Next.js Breaking Changes Notice` and `create-next-app Bootstrapped Project`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `Shared UI Components & Layout Shell` to `PPC Top-Up Automation`, `Chart UI Primitive (Recharts wrapper)`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies (package.json)` to `Chart UI Primitive (Recharts wrapper)`, `PPC Schedule AI Import`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `getSession()` connect `Auth & Staff Management` to `Shared UI Components & Layout Shell`, `PPC Top-Up Automation`, `Sponsored Brands Upload - Campaign Data`, `PPC Schedule AI Import`, `Dashboard, Projects & Tools Registry`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `StaffMember`, `DirectoryEntry`, `COUNTRIES` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Components & Layout Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.06340326340326341 - nodes in this community are weakly interconnected._
- **Should `PPC Top-Up Automation` be split into smaller, more focused modules?**
  _Cohesion score 0.12411347517730496 - nodes in this community are weakly interconnected._