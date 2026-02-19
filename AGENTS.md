# AGENTS.md

This repository supports contributions from AI coding agents. This document defines how agents should work within the codebase and where to find key information.

Scope: The guidance below applies to the entire repository. When in doubt, follow these rules in this order of precedence: direct task instructions > this AGENTS.md > existing repository docs.

## Project Structure & Module Organization

- Core TypeScript sources live in `src/`.
- Domain logic occupies `src/modules` (alerts, conversations, images, links, notes, summary, tasks, textToSpeech, users).
- Shared cross-cutting helpers sit under `src/shared` (constants, middleware, services, utils).
- Infrastructure adapters and bootstrapping stay in `src/config`, `src/app.ts`, and `src/index.ts`.
- Database entities and migrations live in `src/entities` and `src/database`.
- Assets belong in `src/assets`; automation scripts in `src/scripts`.
- The compiler emits artifacts to `build/`, while runtime logs are stored under `logs/`.

## Build, Test & Development Commands

- `npm install` seeds dependencies after cloning.
- `npm run dev` boots the Slack Bolt + Express stack via Nodemon.
- `npm run build` transpiles to `build/` and runs `tslint` through the `prebuild` hook.
- `npm run start` executes the compiled bundle.
- `npm run lint` applies ESLint across `.ts` files.
- Test flows with `npm run test`, `npm run test:watch`, or `npm run test:coverage`.
- `build-docker.sh` builds the container image; ensure Redis is available when running locally or in Docker.

## Coding Style & Naming Conventions

- TypeScript style: 2-space indentation, single quotes, no trailing semicolons.
- Use `camelCase` for variables/functions, `PascalCase` for classes, and mirror the current file naming convention (`imagesWeb.controller.ts`, `conversation.service.ts`).
- Interfaces follow the `I<Thing>` prefix and live in `src/shared/interfaces`.
- Before committing, run `npm run lint` and address ESLint + TypeScript warnings.
- When formatting manually, run `npx prettier --write "src/**/*.ts"` to stay consistent.

### Input Validation (Web Controllers)

- All web controller endpoints must validate input using **Zod** schemas before processing business logic.
- Use the shared helpers from `src/shared/utils/validation.ts`: `validateBody(schema, req.body)`, `validateQuery(schema, req.query)`, `validateParams(schema, req.params)`.
- Define schemas in the module's `shared/schemas/{feature}.schemas.ts` file.
- Use `z.string().min(1)` for required strings, `z.nativeEnum(Enum)` for TS enums, `z.string().url()` for URLs, `z.coerce.date()` for date fields, and `z.coerce.number().int().positive()` for numeric IDs.
- For paginated list endpoints, use the shared `paginationSchema`. For route `:id` params, use the shared `idParamSchema`.
- Validation errors are automatically converted to `BadRequestError` with field-level context — no manual `if (!field)` checks needed.
- Do NOT add validation in services or repositories — keep it at the controller boundary.

### Logging

- Use Pino via `createModuleLogger('module.name')` from `src/config/logger.ts`.
- Never use `console.log/error` — ESLint `no-console: warn` is enforced.
- Log errors as `log.error({ err: error }, 'description')` using Pino's structured object-first format.

## Testing Guidelines

- Jest with `ts-jest` drives the test suite.
- Place specs alongside the code they cover using the `*.test.ts` pattern (see `jest.config.ts`).
- Mock Slack and Redis integrations to keep tests deterministic.
- Every feature addition should include positive, negative, and regression coverage for the associated module.
- Validate coverage locally with `npm run test:coverage` and review the generated `coverage/` folder before opening a PR.

## Progress Callback Pattern

Long-running assistant operations (image generation, AI completion, web search, intent classification) use an optional `ProgressCallback` (`(message: string) => void`, defined in `src/modules/conversations/shared/interfaces/converstions.ts`) to send intermediate user feedback before the final response.

- The callback is created by the caller with transport-specific logic (Slack `say` / Socket.io `emit('receive_assistant_progress', msg)`) and propagated through the chain: controller → services → `MessageProcessor`.
- Inside `MessageProcessor`, invoke via optional chaining (`onProgress?.('...')`) before each slow operation.
- Fast operations (alert/task/note CRUD) do not trigger it.
- When adding new long-running operations to the assistant flow, follow the same pattern: accept `onProgress?: ProgressCallback` as the last parameter and call it before the slow call.

## Configuration & Secrets

- Environment variables listed in `README.md` drive external services. Store them in `.env` files and never commit real keys.
- Redis must be running locally (`redis-server`) before invoking `npm run dev`.
- For shared environments, prefer Docker plus secret injection (`./build-docker.sh`) rather than embedding credentials in code.
- Do not add personal information to code (name, mail, or other personal info).

## Agent Workflow Notes (Claude or similar agents)

- Keep changes minimal and focused; follow the existing modular architecture and naming conventions.
- Place new domain logic under `src/modules/<feature>/`; share common logic via `src/shared`.
- Follow the logging and progress callback patterns when integrating long-running operations.
- Add or update tests alongside changed files; mock Slack/Redis/HTTP where needed.
- Do not introduce secrets; reference `.env` keys and update `.env.example` or README snippets if new keys are required.
- When adding user-facing or developer-facing docs, place them under `docs/` (not `doc/`).
- Follow Conventional Commits in commit messages (e.g., `feat(slack): improve cron alert message`).

## Related Documentation

- See `docs/DEVELOPMENT.md` for local dev tips.
- See `docs/DEPLOYMENT.md` for deployment.
- See `docs/ARCHITECTURE.md` for system overview.
- See `docs/API_REFERENCE.md` for API details.
- See `docs/EXTERNAL_STORAGE.md` for file persistence details.
