# Atlassian Integration — Status Tracker

> Overall status of Atlassian integration plan implementation progress.

---

## Previous Step

**Stage 1 — API and Services Configuration (COMPLETED)**

All Stage 1 items implemented. Jira and Bitbucket modules are fully scaffolded and ready for Stage 2 core features.

### Completed (Stage 1)
- Jira credentials in `.env.example` (JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY)
- Bitbucket credentials in `.env.example` (BITBUCKET_WORKSPACE, BITBUCKET_USERNAME, BITBUCKET_APP_PASSWORD, BITBUCKET_DEFAULT_REPO)
- Dependencies: `jira-client`, `@types/jira-client`, `axios` (already present)
- Module `src/modules/jira/` — controller (Slack + Web), service, repository, constants, interfaces, schemas
- Jira utilities: `jiraFormatters.ts`, `jql.builder.ts`
- Jira cache: `src/modules/jira/repositories/database/jiraCache.dataSource.ts`
- Jira Slack controller: `src/modules/jira/controller/jira.controller.ts`
- TypeORM cache entities: `JiraIssueCache`, `BitbucketPRCache` in `src/entities/`
- Module `src/modules/bitbucket/` — controller (Slack + Web), service, repository, constants, interfaces, schemas
- Endpoints `GET /jira/test`, `GET /jira/project` registered in `app.ts`
- Endpoints `GET /bitbucket/test`, `GET /bitbucket/repositories`, `GET /bitbucket/pullrequests`, `POST /bitbucket/pullrequests` registered in `app.ts`
- Slack listeners: `.jira test`, `.jira project`, `.bb test`, `.bb repos`, `.bb prs <repo>` in `slackConfig.ts` and `app.ts`
- 18 unit tests for JiraServices + BitbucketServices (all passing)
- Structured logging with Pino
- TypeScript compiles without errors, ESLint clean

---

## Current Step

**Stage 2 — Base Modules and Core Functionality (COMPLETED)**

### Completed (Stage 2)
- Jira: `GET /jira/issues/:issueKey`, `GET /jira/issues/assigned-to-me`, `GET /jira/issues/search?jql=...`, `GET /jira/sprints/active`, `GET /jira/backlog`
- Bitbucket: `GET /bitbucket/repositories/:slug/branches`, `GET /bitbucket/repositories/:slug/commits`, `GET /bitbucket/pullrequests/:slug/:id`
- Slack commands: `.jira issue PROJ-123`, `.jira list`, `.jira sprint`, `.jira backlog`, `.bb branches <repo>`, `.bb commits <repo> [branch]`
- Redis cache layer: `jiraCache.redis.ts` (issues 5min, sprint 10min, user-issues 2min), `bitbucketCache.redis.ts` (branches 15min, PRs 3min)
- Extended `JiraApiRepository` with `getIssue`, `searchIssues`, `getAssignedToMe`, `getActiveSprint`, `getBacklog`
- Extended `BitbucketApiRepository` with `getBranches`, `getCommits`, `getPR`
- Added `IJiraSearchResult` to `jira.interfaces.ts`
- Added `IBitbucketBranch`, `IBitbucketCommit` to `bitbucket.interfaces.ts`
- Added `issueKeyParamSchema` to `jira.schemas.ts`
- Added `prParamsSchema`, `repoSlugParamSchema`, `getCommitsQuerySchema` to `bitbucket.schemas.ts`
- 21 new unit tests (472 total, all passing)
- ESLint clean

---

## Current Step

**Stage 3 — Rich Read Experience: Deep Links, Text Search & Commit Details (PENDING)**

### Pending (Stage 3)
- Jira: add `url` field to all issue responses (deep link to `https://{host}/browse/{issueKey}`)
- Bitbucket: add `url` field to all PR and commit responses (deep link to Bitbucket web UI)
- Bitbucket: add `url` field to branch responses (deep link to source view)
- Jira: `.jira search "text"` Slack command — full-text search by summary/description using JQL `~` operator
- Jira: `JQLBuilder.textSearch(text)` utility method
- Slack formatters: show clickable deep links for all Jira issues and Bitbucket PRs/commits
- Bitbucket: `GET /bitbucket/repositories/:slug/commits/:hash` — commit detail endpoint (with URL, message, author)

---

## Next Step

**Stage 4 — Resource Creation and Modification (DEFERRED)**

Write operations intentionally moved after the read/search MVP is complete and stable.

### Pending (Stage 4)
- Jira: `POST /jira/issues` — create issue with Zod validation
- Jira: `PUT /jira/issues/:issueKey/transition` — move issue to new status
- Jira: `POST /jira/issues/:issueKey/comments` — add comment
- Bitbucket: PR approval, merge, and comment endpoints
- Slack commands: `.jira create`, `.jira move PROJ-123 "In Progress"`, `.jira comment PROJ-123 "..."`, `.bb pr approve/merge`
- Robust error handling and rollback on failure

---

### Observations
- One pre-existing test fails (`conversations.controller.test.ts`) due to missing Slack `APP_TOKEN` in test environment — not related to Atlassian integration.
- Cache-aside pattern implemented for Jira issues, sprint, user-issues, and Bitbucket branches/PRs.
- `JQLBuilder` powers all Jira search operations (assigned-to-me, sprint, backlog).
- `formatIssueForSlack` / `formatIssueListForSlack` used in Slack responses.

---

*Last updated: 2026-02-21*
