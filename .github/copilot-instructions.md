# GitHub Copilot Code Review Instructions

## Project Overview

This repository is a modular Slack bot built with Node.js and TypeScript. It integrates AI services (OpenAI, Gemini), supports image generation, alerts, tasks, notes, and provides both Slack and web interfaces (Express + Socket.io). The project uses TypeORM (SQLite/Supabase), Redis for caching, and follows layered architecture.

## Architecture & Patterns

- Modular structure: Each feature in `src/modules/{feature}` with controller, service, repository, and shared folders.
- Singleton pattern for controllers/services (`getInstance()`).
- Repository, Service, and Controller patterns.
- Dual interface: Slack (Bolt) and Web (Express/Socket.io).
- TypeORM entities in `src/entities`.
- Redis for conversation caching.
- Cron jobs for alerts.
- Error handling via custom error classes and global middleware.
- Long-running assistant operations use a progress callback pattern propagated controller → services → message processor.
- Image and conversation modules abstract AI providers behind repositories selected via configuration.

**Do:**

- Keep business logic in services, not controllers.
- Use repositories for all data access (DB, Redis, APIs).
- Follow the singleton pattern for controllers/services.
- Use environment variables for secrets/configuration.
- Validate and sanitize all user input.
- Use custom error classes and global error middleware.
- Write tests for all new features and bug fixes.

**Don't:**

- Put business logic in controllers.
- Access the database directly from controllers/services (use repositories).
- Hardcode secrets, tokens, or personal information.
- Commit code with lint or type errors.
- Skip writing tests for new code.

## Input Validation (Web Controllers)

- Validate all Express REST inputs with Zod schemas before calling services.
- Use helpers from `src/shared/utils/validation.ts` (`validateBody`, `validateQuery`, `validateParams`).
- Define schemas under `src/modules/{feature}/shared/schemas` (e.g., `{feature}.schemas.ts`).
- Use shared schemas where available (e.g., `paginationSchema`, `idParamSchema`).
- Do not add ad-hoc `if (!field)` checks in controllers, services, or repositories for request shape.

## Coding Standards

- TypeScript, 2-space indentation, single quotes, no trailing semicolons.
- `camelCase` for variables/functions, `PascalCase` for classes.
- Interfaces prefixed with `I`, located in `src/shared/interfaces`.
- File naming: `{feature}.controller.ts`, `{feature}.service.ts`, etc.
- No personal information in code (names, emails, etc.).
- Use environment variables for secrets/configuration.
- Run `npm run lint` and address all warnings before merging.
- Format code with Prettier: `npx prettier --write "src/**/*.ts"`.

## Logging

- Use Pino via `createModuleLogger('module.name')` from `src/config/logger.ts`.
- Never use `console.log` / `console.error`; logging is enforced via ESLint.
- Log errors as `log.error({ err: error }, 'description')` using structured objects.
- Prefer module-specific loggers over creating new logger instances ad hoc.

## Testing

- Jest with `ts-jest`, tests in `*.test.ts` files alongside code.
- Mock Slack and Redis integrations.
- Cover positive, negative, and regression cases.
- Validate coverage with `npm run test:coverage`.
- Strive for >80% coverage on new modules.
- Prefer unit tests for business logic, integration tests for controllers.

Run tests with the provided npm scripts:

- `npm test`, `npm run test:watch`, `npm run test:coverage`.

## Commit & PR Guidelines

- Use Conventional Commits (e.g., `feat(slack): improve cron alert message`).
- Summarize intent, list manual test commands, link issues, and attach screenshots for user-facing flows.
- Document environment changes and update `.env.example` or README as needed.

## Security & Privacy

- Never log or expose secrets, tokens, or personal information.
- Sanitize all user input and output.
- Use HTTPS for external API calls when possible.
- Validate permissions for sensitive actions.

## Performance

- Avoid blocking calls in event handlers.
- Use Redis efficiently for caching and conversation state.
- Profile and optimize slow queries or API calls.

## Accessibility & Internationalization

- Ensure web interface is accessible (ARIA, keyboard navigation).
- Support internationalization where possible.

## Skills, Templates & Agents

- When adding new functionality, prefer existing patterns and skills documented in:
  - `.github/skills/*/SKILL.md` (e.g., `express-rest-api`, `slack-bot-builder`, `nodejs-backend-patterns`, `typescript-advanced-types`, `async-patterns`).
  - `custom-skills/*/SKILL.md` for project-specific guidance (`new-module`, `rest-endpoint`, `slack-feature`).
- For new modules, follow the structure and templates from the `new-module` skills:
  - Controllers under `src/modules/{feature}/controller` (Slack + Web variants when applicable).
  - Services under `src/modules/{feature}/services` containing business logic.
  - Repositories under `src/modules/{feature}/repositories` for all external/data access.
  - Shared constants, interfaces, and schemas under `src/modules/{feature}/shared`.
- For new REST endpoints, use the `express-rest-api` and `rest-endpoint` skills as blueprints (routing, validation with Zod, error handling, pagination, and filtering).
- For new Slack features, use the `slack-bot-builder` and `slack-feature` skills (Bolt patterns, message formats, actions, and commands).
- When designing reusable utilities or abstractions, consult `typescript-advanced-types` and `nodejs-backend-patterns` skills before introducing new patterns.
- If implementing AI agents or tool-like capabilities, follow the concepts from `AGENTS_AND_SKILLS.md`:
  - Keep skills atomic and reusable, with clear inputs and outputs.
  - Implement skills under `src/modules/ai/skills/{category}` and register them centrally when such infrastructure is present.
  - Implement higher-level agents under `src/modules/ai/agents` that orchestrate multiple skills.
  - Prefer orchestrating existing skills rather than duplicating logic.

## Review Instructions

- Ensure new code matches the modular structure and patterns above.
- Check for proper error handling and use of custom error classes.
- Validate that environment variables are used for secrets.
- Confirm code style and formatting.
- Require tests for new features and bug fixes.
- No personal information should be present.
- Review for security, maintainability, and adherence to architecture.
- Leave actionable, constructive feedback and suggest refactoring if needed.
