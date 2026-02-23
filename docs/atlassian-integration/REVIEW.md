# Atlassian Integration — Deep-Dive Review

> **Branch reviewed:** `dev` · **Review date:** 2026-02-23
> Covers all code changes introduced between `main` and `dev` for the Atlassian integration feature.

---

## 1. Summary of the Integration

### What it is
A read-first integration that turns the existing Slack bot + REST API into a **Project Manager Assistant** for Jira and Bitbucket. Users can query issues, sprints, backlog, pull requests, branches, and commits from Slack commands or REST endpoints without leaving their workflow.

### Final objective
Replace a significant portion of daily manual navigation between Jira / Bitbucket / Slack by:
- Reading project state (issues, sprints, PRs, commits) directly from Slack
- Creating and modifying resources (issues, PRs, comments, transitions) from Slack or the web interface
- Receiving proactive notifications via webhooks
- Getting AI-powered code review, documentation, and deadline predictions
- Providing analytics dashboards with team velocity, burndown, and DORA metrics

### Architecture summary
Two full modules — `src/modules/jira/` and `src/modules/bitbucket/` — each following the project's established layered pattern:

```
controller/         ← Slack commands + REST endpoints
services/           ← business logic + cache-aside orchestration
repositories/
  ├── *Api.repository.ts   ← HTTP API calls (jira-client / axios)
  ├── database/            ← TypeORM entities (JiraIssueCache, BitbucketPRCache)
  └── redis/               ← Redis cache (JiraCacheRedis, BitbucketCacheRedis)
shared/
  ├── constants/           ← cache TTLs, enums (PRState, MergeStrategy, JiraIssueType…)
  ├── interfaces/          ← IJiraIssue, IBitbucketPR, IBitbucketCommitDetail…
  └── schemas/             ← Zod validation schemas for all REST inputs
utils/
  ├── jiraFormatters.ts    ← Slack-friendly message builders
  └── jql.builder.ts       ← Fluent JQL builder with injection-safe escaping
```

Both modules are registered in `src/app.ts` (singleton instances) and `src/config/slackConfig.ts` (regex listeners).

---

## 2. Implemented Features — Status Review

### Jira

| # | Feature | Interface | Status | Notes |
|---|---------|-----------|--------|-------|
| J-01 | `GET /jira/test` — API connectivity check | REST + Slack (`.jira test`) | ✅ OK | Uses `jira-client` `getServerInfo()` |
| J-02 | `GET /jira/project` — configured project info | REST + Slack (`.jira project`) | ✅ OK | Falls back to `JIRA_PROJECT_KEY` env |
| J-03 | `GET /jira/issues/:issueKey` — single issue | REST + Slack (`.jira issue PROJ-123`) | ✅ OK | Redis cache 5 min; deep link in response |
| J-04 | `GET /jira/issues/assigned-to-me` | REST + Slack (`.jira list`) | ⚠️ Review | Uses static configured email, **not** caller's identity |
| J-05 | `GET /jira/issues/search?jql=...` | REST | ✅ OK | Zod-validated `jql`, `maxResults`, `startAt` |
| J-06 | `GET /jira/sprints/active` — active sprint | REST + Slack (`.jira sprint`) | ⚠️ Review | Uses `sprint in openSprints()` — **requires Jira Software**, not Jira Work Management |
| J-07 | `GET /jira/backlog` — backlog issues | REST + Slack (`.jira backlog`) | ✅ OK | JQL `sprint is EMPTY AND status NOT IN ("Done")` |
| J-08 | Full-text search (`.jira search "text"`) | Slack + REST `/search` | ✅ OK | `JQLBuilder.textSearch()` — injection-safe escaping |
| J-09 | Deep links (`url` field) on all issue responses | Both | ✅ OK | `https://{JIRA_HOST}/browse/{issueKey}` |
| J-10 | Slack formatters with clickable links | Slack | ✅ OK | `<url\|PROJ-123>` Slack mrkdwn syntax |
| J-11 | Redis cache (issues 5 min, sprint 10 min, user-issues 2 min) | Internal | ✅ OK | Cache-aside, silent failure on error |
| J-12 | Zod schemas for REST inputs | REST | ✅ OK | `issueKeyParamSchema`, `searchJiraIssuesSchema`, `createJiraIssueSchema` (prep) |
| J-13 | `JQLBuilder` fluent API | Internal | ✅ OK | 10 methods; well-tested implicitly via service tests |
| J-14 | Pino structured logging | Both | ✅ OK | `createModuleLogger('jira.*')` throughout |
| J-15 | 395-line service unit test file | Testing | ✅ OK | Covers all service methods; cache hit/miss paths |

### Bitbucket

| # | Feature | Interface | Status | Notes |
|---|---------|-----------|--------|-------|
| B-01 | `GET /bitbucket/test` — API connectivity | REST + Slack (`.bb test`) | ✅ OK | Calls `/workspaces/:workspace` |
| B-02 | `GET /bitbucket/repositories` — list repos | REST + Slack (`.bb repos`) | ✅ OK | Hard-coded `pagelen: 50`, no pagination cursor |
| B-03 | `GET /bitbucket/pullrequests?repoSlug=&state=` | REST + Slack (`.bb prs <repo>`) | ✅ OK | Redis cache 3 min; deep links |
| B-04 | `POST /bitbucket/pullrequests` — create PR | REST only | ⚠️ Review | Write op present in Stage 1; **no Slack command** for it |
| B-05 | `GET /bitbucket/pullrequests/:slug/:id` — PR detail | REST | ✅ OK | Redis cache 3 min |
| B-06 | `GET /bitbucket/repositories/:slug/branches` | REST + Slack (`.bb branches <repo>`) | ✅ OK | Redis cache 15 min; default branch detected; deep links |
| B-07 | `GET /bitbucket/repositories/:slug/commits` | REST + Slack (`.bb commits <repo> [branch]`) | ✅ OK | Configurable limit (default 30); deep links |
| B-08 | `GET /bitbucket/repositories/:slug/commits/:hash` — commit detail | REST | ✅ OK | Returns `IBitbucketCommitDetail` with parent hashes |
| B-09 | Deep links on all PR / commit / branch responses | Both | ✅ OK | Direct Bitbucket web UI URLs |
| B-10 | Zod schemas for all REST inputs | REST | ✅ OK | `listPRsSchema`, `createPRSchema`, `prParamsSchema`, `commitParamsSchema`, etc. |
| B-11 | Redis cache (branches 15 min, PRs 3 min) | Internal | ✅ OK | Cache-aside, silent failure on error |
| B-12 | 360-line service unit test file | Testing | ✅ OK | Covers all service methods incl. cache paths |

### Infrastructure / Cross-cutting

| # | Item | Status | Notes |
|---|------|--------|-------|
| I-01 | `src/entities/JiraIssueCache.ts` TypeORM entity | ⚠️ Review | Entity exists and is auto-synced to DB, but `JiraCacheDataSource` is **never called** by service — only Redis is used |
| I-02 | `src/entities/BitbucketPRCache.ts` TypeORM entity | ⚠️ Review | Same as above — entity exists but no service uses it |
| I-03 | `.env.example` updated with all 8 env vars | ✅ OK | `JIRA_*` × 4, `BITBUCKET_*` × 4 |
| I-04 | `slackConfig.ts` — 12 regex listeners | ✅ OK | Properly namespaced `jiraTest`, `bitbucketRepos`, etc. |
| I-05 | `app.ts` — all controllers instantiated and routes registered | ✅ OK | `/jira` and `/bitbucket` Express routers + all Slack listeners |
| I-06 | No `@SlackAuth` decorator on Jira/Bitbucket Slack controllers | ⚠️ Review | All other Slack controllers use `@SlackAuth`; these don't — Jira/BB commands have no user identity / permission check |

---

## 3. Issues & Deviations from Project Standards

These are concrete gaps found during code review. Each is actionable.

### 🔴 High Priority

**#1 — Missing `@SlackAuth` on Jira and Bitbucket Slack controllers**

`JiraController` and `BitbucketController` do not use `@SlackAuth` and do not extend `GenericController`. Every other Slack controller in the project (`conversations.controller.ts`) uses `@SlackAuth`. This means:
- No user identity is resolved from Slack before executing Jira/BB commands
- Any user who can message the bot can query Jira issues and Bitbucket repos
- `this.userData` is unavailable — blocking future per-user features (see #2)

**#2 — No user-to-Jira/Bitbucket identity mapping**

The problem statement explicitly requires: *"you can tell what is your user from Slack to relate with any email user in the projects like Jira/Bitbucket."*

Currently:
- `.jira list` (assigned-to-me) uses the static `JIRA_EMAIL` env var — returns the same issues for all users
- `Users` entity has no `jiraEmail` or `bitbucketUsername` fields
- No command to register a personal mapping (e.g. `.jira me user@company.com`)

This is arguably the most important missing capability for the multi-user scenario.

### 🟡 Medium Priority

**#3 — `JiraIssueCache` and `BitbucketPRCache` TypeORM entities are dead code**

Both entities are auto-synced to SQLite on startup (creating two extra tables), but `JiraCacheDataSource` is never called by `JiraServices` and there is no equivalent for Bitbucket. All caching happens via Redis. The DB entities serve no purpose in the current implementation and create confusion.

**#4 — `getActiveSprint` requires Jira Software (Agile)**

The JQL `sprint in openSprints()` only works with Jira Software / Jira Agile projects. Jira Work Management and Jira Service Management projects don't have sprints. The endpoint will silently return 0 results (no error) on non-Software projects, which is confusing. No graceful fallback or error message exists.

**#5 — `POST /bitbucket/pullrequests` (create PR) has no Slack command**

A write operation exists in Stage 1 REST code but is absent from the Slack interface, making it invisible to Slack users. The Slack controller doesn't bind `createPullRequest` at all.

### 🔵 Low Priority / Style

**#6 — `IMPLEMENTATION_STAGES.md` has stale status markers**

Stage 3's validation checklist still shows `GET /bitbucket/repositories/:slug/commits/:hash` as "pending" even though it was implemented. The Bitbucket Stage 1 tasks are also still marked with ❌ Pending despite being complete.

**#7 — `listRepositories` uses hard-coded `pagelen: 50`**

No cursor-based pagination for the repository list. For workspaces with >50 repos, only the first 50 are returned without indication that more exist.

---

## 4. Next Steps — Grouped by Stage

### Stage 4 — Write Operations *(Current priority)*

> **Goal:** Enable issue and PR creation/mutation from Slack or REST.
> **Estimated time:** 5–7 days

| Task | Priority | Notes |
|------|----------|-------|
| Fix `@SlackAuth` gap — add auth to Jira/BB Slack controllers | 🔴 Critical | Blocking for user-scoped operations |
| Add `jiraEmail` / `bitbucketUsername` to `Users` entity + mapping command | 🔴 Critical | Core stated requirement; enables per-user queries |
| `.jira create -t Task -s "Summary"` + `POST /jira/issues` | 🟡 High | `createJiraIssueSchema` already exists |
| `.jira move PROJ-123 "In Progress"` + `PUT /jira/issues/:key/transition` | 🟡 High | Needs available transition IDs endpoint |
| `.jira comment PROJ-123 "text"` + `POST /jira/issues/:key/comments` | 🟡 High | — |
| `.bb pr approve <repo> <id>` + `POST /bitbucket/pullrequests/:slug/:id/approve` | 🟡 High | `mergePRSchema` prep already in schemas |
| `.bb pr merge <repo> <id>` + `POST /bitbucket/pullrequests/:slug/:id/merge` | 🟡 High | — |
| Add Slack command for existing `POST /bitbucket/pullrequests` | 🔵 Medium | Command is missing for an already-working endpoint |
| Clean up unused TypeORM cache entities or connect them | 🔵 Medium | Either use them or remove `JiraIssueCache` / `BitbucketPRCache` |
| Graceful message when `sprint in openSprints()` returns 0 results | 🔵 Medium | Detect non-Software project type |

### Stage 5 — Webhooks & Real-Time Notifications

> **Goal:** Receive push events from Jira and Bitbucket; notify relevant Slack users.
> **Estimated time:** 5–7 days

| Task | Priority | Notes |
|------|----------|-------|
| `POST /webhooks/jira` — receive and parse Jira events | 🟡 High | Issue created/updated/transitioned |
| `POST /webhooks/bitbucket` — receive Bitbucket events | 🟡 High | PR opened/merged/declined, push |
| Slack notification dispatch on relevant events | 🟡 High | Uses per-user mapping from Stage 4 |
| `WebhookSubscription` entity — user-channel-event filter table | 🔵 Medium | Allows per-user opt-in notifications |
| Rate limiting / deduplication for webhook events | 🔵 Medium | Prevent notification spam |

### Stage 6 — AI Enhancements

> **Goal:** Let users ask natural-language questions about Jira and Bitbucket via the AI assistant.
> **Estimated time:** 7–10 days

| Task | Priority | Notes |
|------|----------|-------|
| Add Jira/BB intents to the conversation intent classifier | 🟡 High | e.g. `jira.search`, `jira.create`, `bitbucket.pr.list` |
| Wire new intents into `MessageProcessor` | 🟡 High | Same pattern as existing `task.create`, `note.create` |
| `onProgress` callback for Jira/BB intent calls | 🔵 Medium | Show "Buscando en Jira…" before slow API calls |
| AI code review (`.bb review PR-123 --ai`) | 🔵 Medium | Requires Stage 5 PR retrieval + diff fetching |
| Sprint analysis + deadline prediction | 🔵 Low | High effort, low certainty value |

### Stage 7 — Analytics & Dashboards

> **Goal:** Web-facing dashboards with team velocity, PR merge times, DORA metrics.
> **Estimated time:** 7–10 days

| Task | Priority | Notes |
|------|----------|-------|
| `src/modules/analytics/` module scaffold | 🔵 Medium | Separate module; re-uses Jira/BB services |
| Velocity / burndown charts (chart.js) | 🔵 Medium | REST + web Socket.io push |
| PR merge time + code frequency metrics | 🔵 Medium | — |
| Combined DORA metrics endpoint | 🔵 Low | Requires webhook data from Stage 5 |
| PDF / CSV export | 🔵 Low | — |

### Stage 8 — Advanced Features

> **Estimated time:** 10–15 days (ongoing)

| Task | Priority | Notes |
|------|----------|-------|
| Auto-link Jira issue ↔ Bitbucket PR by issue key in PR title | 🟡 High | High value, medium effort; requires Stage 4+5 |
| Stale PR detector + Slack notification | 🔵 Medium | Cron job using existing Bitbucket service |
| Auto-assign suggestions (AI based on history) | 🔵 Low | Stage 6 dependency |
| Custom workflow DSL (trigger/condition/action) | 🔵 Low | High complexity |
| Wiki / knowledge base generator | 🔵 Low | Stage 6 dependency |

---

## 5. Recommended Features Not in the Original Plan

These features are not explicitly described in the planning docs but would deliver concrete value and fit naturally into the existing architecture.

| # | Feature | Why it matters | Suggested stage |
|---|---------|----------------|-----------------|
| R-01 | **User identity mapping**: `Users` entity gains `jiraEmail` + `bitbucketUsername` columns; new Slack command `.jira me user@company.com` or web endpoint to register it | Enables `.jira list` to show *your* issues, not the bot admin's. This is the cornerstone of the multi-user use case stated in the requirements. | Stage 4 |
| R-02 | **`.jira transitions PROJ-123`** — list available transitions before moving | Transitions are project-specific; users can't guess them. A read-only "list transitions" call makes `.jira move` discoverable. | Stage 4 |
| R-03 | **Slack `/help jira` and `/help bb`** — inline command reference | The existing `/help` command covers only original bot features. Adding Atlassian sections reduces onboarding friction. | Stage 4 |
| R-04 | **Cache invalidation on write operations** — bust Redis keys after `createIssue`, `transition`, `addComment`, `mergePR` | Without invalidation, write operations won't be visible to subsequent read commands until TTL expires. Currently there are no writes, but this must be built in from the start of Stage 4. | Stage 4 |
| R-05 | **Bitbucket pipeline / build status**: `GET /bitbucket/repositories/:slug/pipelines` + `.bb pipelines <repo>` | Developers check CI status constantly. Easy read-only endpoint; high visibility. | Stage 5 (alongside webhooks) |
| R-06 | **Per-request Jira project override** — allow `?projectKey=OTHER` query param on sprint/backlog/assigned-to-me endpoints | Service methods already accept an optional `projectKey` argument; exposing it in the REST API costs almost nothing and supports multi-project setups. | Stage 4 |
| R-07 | **`GET /jira/issues/search?text=...` convenience alias** | REST callers must write raw JQL today. A `text` query param that auto-builds the `summary ~ ... OR description ~ ...` JQL mirrors the `.jira search` Slack command and is far more approachable. | Stage 4 |
| R-08 | **Slack Block Kit interactive messages for Jira issues** — overflow menu with "Move to In Progress", "Assign to me", "Open in Jira" | Consistent with the existing pattern for tasks / notes / links (overflow menus with action IDs). Makes Jira issue responses actionable without typing follow-up commands. | Stage 4–5 |

---

## 6. Summary Table

| Category | Count | Detail |
|----------|-------|--------|
| Implemented features (all good) | 20 | J-01–J-15 (minus J-04, J-06) + B-01–B-09, B-11–B-12 |
| Implemented with caveats (`⚠️ Review`) | 6 | J-04, J-06, B-04, I-01, I-02, I-06 |
| Stage 4 tasks | 10 | Write ops, user mapping, auth fix |
| Stage 5 tasks | 5 | Webhooks, notifications |
| Stage 6 tasks | 5 | AI intents, code review |
| Stage 7 tasks | 5 | Analytics, dashboards |
| Stage 8 tasks | 5 | Auto-link, advanced automation |
| Recommended extras not in plan | 8 | R-01 to R-08 |
| Test lines (service layer only) | 755 | jira.services.test.ts (395) + bitbucket.services.test.ts (360) |
| Missing test layers | — | No controller tests for Jira or Bitbucket |

### Status by stage

| Stage | Status | Readiness |
|-------|--------|-----------|
| 1 — API & Module scaffold | ✅ Complete | Production-ready |
| 2 — Core read features + cache | ✅ Complete | Production-ready |
| 3 — Deep links, text search, commit detail | ✅ Complete | Production-ready |
| 4 — Write operations | ❌ Pending | Partially in code (createPR), no Slack commands |
| 5 — Webhooks & notifications | ❌ Pending | — |
| 6 — AI enhancements | ❌ Pending | — |
| 7 — Analytics | ❌ Pending | — |
| 8 — Advanced features | ❌ Pending | — |

---

## 7. Production Readiness of the Current State (Stages 1–3)

### What works in production right now

The read-only MVP (Stages 1–3) is solid and **ready for production use** with the following assumptions:
- Redis is running (required for cache)
- `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` are configured
- `BITBUCKET_WORKSPACE`, `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD` are configured
- Jira instance is Jira Software (for sprint commands — J-06)

All code follows the project's architectural conventions: singleton controllers/services, Zod validation on all REST inputs, Pino structured logging, `GenericResponse<T>` from all services, no `console.log`, proper TypeScript interfaces.

### What to fix before going multi-user

1. **`@SlackAuth` gap** (issue #1) — add auth + `extends GenericController` to `JiraController` and `BitbucketController`
2. **User identity mapping** (issue #2) — without this, `.jira list` is shared for all users
3. **Remove or connect DB cache entities** (issue #3) — pick one: use them for analytics or delete them

### Known limitations

- `getActiveSprint` silently returns 0 for non-Jira-Software projects (#4)
- Bitbucket repository list is capped at 50 without pagination (#7)
- `POST /bitbucket/pullrequests` is not exposed via Slack (#5)
- No controller-layer tests for Jira or Bitbucket (only service tests)

---

## 8. Complete Conclusion

### What was built
A clean, well-structured read-only Atlassian integration covering **all P0 features** from the original roadmap (10 features). Both Jira and Bitbucket modules are fully scaffolded following the project's modular layered architecture. Every REST endpoint has Zod validation, every response includes deep links for one-click navigation, Redis cache-aside pattern is implemented consistently, and 755 lines of service unit tests cover all code paths.

### What the architecture gets right
- **Separation of concerns** is clean: API calls are in repositories, orchestration in services, formatting in utils, I/O in controllers
- **JQLBuilder** is a well-designed utility — fluent, testable, and injection-safe
- **Deep links everywhere** is a excellent UX decision that pays dividends in all subsequent stages
- **Redis TTL tuning** (issue: 5 min, sprint: 10 min, user issues: 2 min, branches: 15 min, PRs: 3 min) reflects the real-world staleness of each resource type

### What needs the most attention
1. **User identity (R-01 / issue #2)** — the most impactful missing piece. Until Slack users are mapped to Jira/Bitbucket identities, the integration is effectively single-user (bot credentials only). This affects every "my issues", "my PRs", "assign to me" use case.
2. **Authentication on Slack commands (issue #1)** — Jira and Bitbucket Slack commands currently have no auth gate, unlike every other module in the project. Adding `@SlackAuth` is low effort and high importance.
3. **Write operations (Stage 4)** — the integration is powerful for read/search, but the ability to create issues, transition status, and approve/merge PRs from Slack is what will drive daily adoption. Stage 4 is the next recommended milestone.
4. **Webhooks (Stage 5)** — proactive notifications (e.g. "your PR was approved", "issue transitioned to Done") would transform the integration from a pull tool to a push tool, dramatically increasing perceived value with minimal additional read logic.

### Recommended next sprint (2 weeks)
1. Add `@SlackAuth` to Jira/Bitbucket Slack controllers
2. Add `jiraEmail` + `bitbucketUsername` to `Users` entity + `.jira me` / `.bb me` registration commands
3. `POST /jira/issues` + `.jira create` Slack command
4. `PUT /jira/issues/:key/transition` + `.jira move` Slack command
5. `GET /jira/issues/:key/transitions` (read available statuses)
6. Slack command for existing `POST /bitbucket/pullrequests`
7. Remove or fully connect the dead DB cache entities

With these additions the integration crosses from a **read-only demo** to a genuinely useful **daily-driver project management tool**.
