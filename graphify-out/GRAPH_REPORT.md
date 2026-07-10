# Graph Report - automation-portal  (2026-07-10)

## Corpus Check
- 88 files · ~41,049 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 622 nodes · 1529 edges · 44 communities (22 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f12a5e0c`
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
- [[_COMMUNITY_product-block.tsx|product-block.tsx]]
- [[_COMMUNITY_Dashboard, Projects & Tools Registry|Dashboard, Projects & Tools Registry]]
- [[_COMMUNITY_utils.ts|utils.ts]]
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
- [[_COMMUNITY_projects.ts|projects.ts]]
- [[_COMMUNITY_chart.tsx|chart.tsx]]
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
- [[_COMMUNITY_build.ts|build.ts]]
- [[_COMMUNITY_sku-list.ts|sku-list.ts]]
- [[_COMMUNITY_tabs.tsx|tabs.tsx]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 88 edges
2. `getSession()` - 33 edges
3. `createClient()` - 30 edges
4. `createServiceClient()` - 30 edges
5. `requireStaff()` - 21 edges
6. `compilerOptions` - 16 edges
7. `Button()` - 13 edges
8. `getMyPermissions()` - 13 edges
9. `LaLaGreen Automation Portal — Developer Guide` - 12 edges
10. `POST()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AlertDialogOverlay()` --calls--> `cn()`  [EXTRACTED]
  components/ui/alert-dialog.tsx → lib/utils.ts
- `AlertDialogMedia()` --calls--> `cn()`  [EXTRACTED]
  components/ui/alert-dialog.tsx → lib/utils.ts
- `DialogOverlay()` --calls--> `cn()`  [EXTRACTED]
  components/ui/dialog.tsx → lib/utils.ts
- `SheetOverlay()` --calls--> `cn()`  [EXTRACTED]
  components/ui/sheet.tsx → lib/utils.ts
- `PpcTopUpLayout()` --calls--> `assertItemAccess()`  [EXTRACTED]
  app/(portal)/automations/ppc-top-up/layout.tsx → lib/permissions.ts

## Import Cycles
- None detected.

## Communities (44 total, 22 thin omitted)

### Community 0 - "Shared UI Components & Layout Shell"
Cohesion: 0.16
Nodes (14): UPLOADABLE_COUNTRIES, UploadResponse, Badge(), badgeVariants, Dialog(), DialogBody(), DialogClose(), DialogContent() (+6 more)

### Community 1 - "PPC Top-Up Automation"
Cohesion: 0.08
Nodes (52): isManualTopUpFuture(), LiveProjectionCard(), nextUpcomingSlot(), PpcTopUpPage(), relativeDayLabel(), statusBadgeClass(), toNumericAmount(), formatPrice() (+44 more)

### Community 2 - "Auth & Staff Management"
Cohesion: 0.14
Nodes (23): AD_GROUP_MEDIA, AD_MEDIA, AdsCountry, adsHeaders(), adsPost(), AdsProfile, CAMPAIGN_MEDIA, createSbAdGroup() (+15 more)

### Community 3 - "Package Dependencies (package.json)"
Cohesion: 0.05
Nodes (38): dependencies, @anthropic-ai/sdk, @base-ui/react, bcryptjs, class-variance-authority, clsx, jose, lucide-react (+30 more)

### Community 4 - "Sponsored Brands Upload - Campaign Data"
Cohesion: 0.12
Nodes (32): BrandRow, COUNTRIES, STEPS, WizardStep, Brand, CampaignProduct, createBrand(), createKeywordTheme() (+24 more)

### Community 5 - "shadcn/ui Component Registry Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "PPC Schedule AI Import"
Cohesion: 0.10
Nodes (28): AMOUNT_HINTS, analyzeScheduleImport(), ColumnDetectSchema, ColumnMapping, COUNTRY_ALIASES, COUNTRY_HINTS, detectColumnsHeuristically(), detectColumnsWithAi() (+20 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "product-block.tsx"
Cohesion: 0.13
Nodes (15): newBlock(), Preset, ProductBlock(), toLines(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent() (+7 more)

### Community 9 - "Dashboard, Projects & Tools Registry"
Cohesion: 0.06
Nodes (75): POST(), POST(), POST(), IncomingCampaign, ResolveErr, resolveMarketplace(), ResolveOk, budgetFor() (+67 more)

### Community 10 - "utils.ts"
Cohesion: 0.19
Nodes (8): ChatPanel(), markdownComponents, Button(), buttonVariants, Input(), Label(), Separator(), Textarea()

### Community 11 - "Sponsored Brands Bulk XLSX Builder"
Cohesion: 0.14
Nodes (20): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), DropdownMenu(), DropdownMenuCheckboxItem() (+12 more)

### Community 23 - "LaLaGreen Automation Portal — Developer Guide"
Cohesion: 0.07
Nodes (26): Adding a New Project, Adding a new staff member, Adding a New Tool, Amazon Advertising API (Sponsored Brands Upload → "Upload to Amazon"), Architecture, Auth System, Database (Supabase), Environment variables (+18 more)

### Community 24 - "sp-api.ts"
Cohesion: 0.08
Nodes (46): daysRemaining(), EditPricePlanForm(), formatDate(), formatPrice(), HistoryTable(), NewPricePlanSheet(), PlanCard(), PlansList() (+38 more)

### Community 25 - "projects.ts"
Cohesion: 0.18
Nodes (11): sendAiChatMessage(), ChatMessage, generateAssistantReply(), chatToolDefinitions, runChatTool(), AutomationProject, defineProject(), ppcTopUp (+3 more)

### Community 26 - "chart.tsx"
Cohesion: 0.21
Nodes (12): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION (+4 more)

### Community 27 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 41 - "build.ts"
Cohesion: 0.18
Nodes (17): blockIssues(), BlockSummary, buildCampaigns(), buildName(), Campaign, campaignCountForBlock(), distributeKeywords(), shuffle() (+9 more)

### Community 42 - "sku-list.ts"
Cohesion: 0.23
Nodes (13): addSkus(), ColumnDetectSchema, ColumnMapping, deleteSku(), detectColumnHeuristically(), detectColumnWithAi(), DetectedSkuSheet, extractSkusFromSheet() (+5 more)

### Community 43 - "tabs.tsx"
Cohesion: 0.33
Nodes (7): SegmentedControl(), SegmentOption, Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger()

## Knowledge Gaps
- **171 isolated node(s):** `StaffMember`, `ACCESS_SECTIONS`, `PRICE_TYPES`, `PriceTypeOption`, `DirectoryEntry` (+166 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Sponsored Brands Bulk XLSX Builder` to `Shared UI Components & Layout Shell`, `PPC Top-Up Automation`, `product-block.tsx`, `Dashboard, Projects & Tools Registry`, `utils.ts`, `tabs.tsx`, `chart.tsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies (package.json)` to `chart.tsx`, `PPC Schedule AI Import`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `getSession()` connect `Dashboard, Projects & Tools Registry` to `PPC Top-Up Automation`, `Sponsored Brands Upload - Campaign Data`, `PPC Schedule AI Import`, `sku-list.ts`, `sp-api.ts`, `projects.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `StaffMember`, `ACCESS_SECTIONS`, `PRICE_TYPES` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PPC Top-Up Automation` be split into smaller, more focused modules?**
  _Cohesion score 0.07534246575342465 - nodes in this community are weakly interconnected._
- **Should `Auth & Staff Management` be split into smaller, more focused modules?**
  _Cohesion score 0.13768115942028986 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies (package.json)` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._