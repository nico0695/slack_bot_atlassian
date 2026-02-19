# Gemini CLI - Project Context

This document provides context for the Gemini CLI to understand and interact with this project.

## Project Overview

This is a Slack bot that integrates with several AI services, including OpenAI and Gemini, to provide conversational AI, image generation, link management, and other features. It also has a web interface with real-time communication using Socket.io. The bot uses Redis for caching and a database (likely Supabase, based on the `README.md`) for persistence.

The project is built with Node.js and TypeScript. It uses the Bolt framework for Slack integration and Express for the web server.

## Building and Running

The following commands are available to build and run the project:

- **`npm run dev`**: Starts the application in development mode using `ts-node` and `nodemon`.
- **`npm run build`**: Compiles the TypeScript code to JavaScript.
- **`npm start`**: Starts the application from the compiled JavaScript code.
- **`npm run lint`**: Lints the codebase using ESLint.

Before running the application, make sure to install the dependencies with `npm install` and set up the environment variables as described in the `README.md` file.

## Development Conventions

- **Language:** TypeScript
- **Frameworks:**
  - Node.js
  - Express
  - Slack Bolt
  - Socket.io
  - TypeORM
  - Zod (input validation)
  - Pino (structured logging)
- **Project Structure:** The project follows a modular structure, with each feature in its own directory under `src/modules` (alerts, conversations, images, links, notes, tasks, etc.).
- **Design Patterns:**
  - Dependency Injection
  - Repository Pattern
  - Controller Pattern
  - Service Pattern
- **Database:** The project uses a database for persistence, configured via TypeORM. The `README.md` suggests that Supabase is used.
- **Caching:** Redis is used for caching.
- **Logging:** Pino structured JSON logger (`src/config/logger.ts`). Use `createModuleLogger('name')` for child loggers. ESLint `no-console: warn` enforced.
- **Linting:** ESLint is used for linting, with the configuration in `.eslintrc.json`.

- **Progress Callback Pattern:** Long-running assistant operations (image generation, AI completion, web search, intent classification) accept an optional `ProgressCallback` (`(message: string) => void`, from `converstions.ts`) as the last parameter. The caller creates it with transport logic (Slack `say` / Socket.io `emit('receive_assistant_progress')`), and it propagates through controller → services → `MessageProcessor`. Call via `onProgress?.('...')` before slow operations. Fast operations (CRUD) skip it. Follow this pattern when adding new slow operations.

- **Input Validation:** Web controllers validate input using Zod schemas at the controller boundary. Use `validateBody(schema, req.body)`, `validateQuery(schema, req.query)`, and `validateParams(schema, req.params)` from `src/shared/utils/validation.ts`. Define schemas in each module's `shared/schemas/{feature}.schemas.ts`. Use shared `paginationSchema` and `idParamSchema` for common patterns. Validation errors are automatically converted to `BadRequestError` with field-level context. Do not use manual `if (!field)` checks — use Zod schemas instead.

- Dont add personal information on code (name, mail, and other personal info)
