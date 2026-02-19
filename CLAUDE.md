# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multi-functional Slack bot integrating AI services (OpenAI, Gemini) for conversational AI, image generation, alerts, tasks, notes, and links management. The system includes both Slack integration and a web interface with real-time communication via Socket.io.

**Tech Stack:**

- Node.js + TypeScript
- Slack Bolt SDK (Socket Mode)
- Express + Socket.io for web interface
- TypeORM with SQLite (configurable for Supabase)
- Redis for conversation caching
- Pino for structured JSON logging (pino-http for HTTP requests)
- Web Push for notifications

## Development Commands

```bash
# Development
npm run dev          # Start with nodemon + ts-node (hot reload)
redis-server         # Start Redis (required for conversation caching)

# Building & Production
npm run build        # Compile TypeScript to /build
npm start            # Run compiled code (runs build first)

# Code Quality
npm run lint         # ESLint check
npm run prebuild     # TSLint with auto-fix (runs before build)

# Testing
npm run test         # Run all Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate test coverage report

# Docker
./build-docker.sh    # Build Docker image
```

**Environment Setup:**
Copy `.env copy` to `.env` and configure:

- Slack tokens (SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, APP_TOKEN)
- AI API keys (OPENAI_API_KEY, GEMINI_API_KEY, LEAP_API_KEY)
- Image generation provider (IMAGE_REPOSITORY_TYPE: OPENAI | GEMINI | LEAP, defaults to OPENAI)
- Database (SUPABASE_URL, SUPABASE_TOKEN or local SQLite)
- Redis (REDIS_HOST, defaults to local)
- Web Push (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
- Search API (SEARCH_API_KEY, SEARCH_API_KEY_CX)
- Logging (LOG_LEVEL: override log level, defaults to silent/debug/info by environment)

## Architecture

### Core Application Flow (src/app.ts)

1. **Controllers Initialization**: All module controllers are singletons, instantiated in App constructor
2. **Express Server**: Runs on port 4000 with Socket.io for real-time web communication
3. **Slack Bot**: Runs on port 3001 using Socket Mode (no webhook required)
4. **Cron Jobs**: Alert notifications run every minute
5. **TypeORM**: Auto-syncs entities from `/src/entities` on startup

### Module Structure

Each feature module follows a consistent layered architecture:

```
src/modules/{feature}/
├── controller/          # HTTP/Slack event handlers
│   ├── {feature}.controller.ts      # Slack interactions
│   └── {feature}Web.controller.ts   # Express REST endpoints
├── services/            # Business logic
│   └── {feature}.services.ts
├── repositories/        # Data access layer
│   ├── database/        # TypeORM entities
│   ├── redis/           # Conversation caching
│   ├── openai/          # OpenAI API
│   ├── gemini/          # Gemini API
│   └── search/          # Google Search API
└── shared/
    ├── constants/       # Feature-specific constants
    └── interfaces/      # TypeScript interfaces
```

**Available Modules:**

- `conversations` - AI chat (OpenAI/Gemini), conversation flow management
- `alerts` - Time-based reminders with cron notifications
- `tasks` - Task management
- `notes` - Note-taking
- `links` - URL/link storage for read-later (Wallabag-style), with status tracking (unread/read/archived)
- `images` - AI image generation (OpenAI/DALL-E 3, Gemini/Imagen 3, Leap - **supports multiple providers**)
- `textToSpeech` - TTS functionality
- `summary` - Text summarization
- `users` - User management
- `constants` - System-wide constants management
- `system` - Infrastructure endpoints (health check) — controller-only, no services/repositories

### Key Architectural Patterns

**1. Singleton Controllers & Services**
All controllers and services use the singleton pattern via `getInstance()`. They are instantiated once in `src/app.ts` and reused throughout the application lifecycle.

**2. Conversation Management**

- **Redis Keys**: Conversations stored with keys like `${conversationFlowPrefix}:${channelId}` or `rConvo:${userId}`
- **AI Repository Abstraction**: `ConversationsServices` can switch between OpenAI and Gemini via `AIRepositoryType` enum
- **Conversation Flow**:
  - Slack: Message listeners defined in `slackConfig.ts` (regex patterns like `/^cb?\b/`)
  - Web: Socket.io events (`send_message`, `send_assistant_message`)
- **Assistant System**: Supports flags and variables in messages for task/alert/note/link operations

**3. Image Generation Management**

The images module follows the same repository abstraction pattern as conversations, supporting multiple AI image generation providers:

- **Repository Interface**: All image repositories implement `IImageRepository` interface
- **Available Providers**:
  - **OpenAI DALL-E 3**: High-quality images with prompt rewriting, supports 1024x1024/1024x1792/1792x1024 sizes (requires OpenAI API key with billing)
  - **Gemini Imagen 3**: Photorealistic and artistic images, excellent for multiple styles (⚠️ requires Google Cloud billing enabled)
  - **Leap API**: Legacy provider (maintained for backward compatibility)
- **Factory Pattern**: `ImageRepositoryType` enum + `ImageRepositoryByType` map for provider selection
- **Configuration**: Set `IMAGE_REPOSITORY_TYPE` env var (OPENAI | GEMINI | LEAP), defaults to OPENAI
- **Service Abstraction**: `ImagesServices` uses `private imageRepository: IImageRepository` interface
- **Unified Response**: All providers return `IImageGenerationResponse` with standardized format:
  ```typescript
  {
    images: IGeneratedImage[],  // [{url, id, createdAt}]
    provider: ImageProvider,     // 'openai' | 'gemini' | 'leap'
    inferenceId?: string         // Optional job tracking ID
  }
  ```
- **Polling Logic**: Provider-specific (e.g., Leap requires polling, DALL-E 3/Imagen 3 are synchronous)
- **Repository Structure**:
  ```
  src/modules/images/repositories/
  ├── openai/
  │   ├── openaiImages.repository.ts    # DALL-E 3 implementation
  │   └── __tests__/
  ├── gemini/
  │   ├── geminiImages.repository.ts    # Imagen 3 implementation
  │   └── __tests__/
  └── leap/
      └── leap.repository.ts             # Legacy Leap API
  ```
- **Slack Command**: `img ${prompt}` triggers image generation with configured provider
- **Response Format**: `"Imágenes generadas con {provider}:\nImagen #1: {url}"`

**4. Links Module (Read-Later)**

The links module allows users to save URLs for later reading, similar to Wallabag/Pocket:

- **Entity**: `Links` with fields: `url`, `title`, `description`, `tag`, `status` (unread/read/archived), soft-delete support
- **Status Tracking**: `LinkStatus` enum (`UNREAD`, `READ`, `ARCHIVED`) in `links.constants.ts`
- **Slack Commands**: `.link/.lk <url>` to save, flags: `-tt` (title), `-d` (description), `-t` (tag), `-l` (list), `-lt` (list by tag)
- **REST API**: `GET/POST /links`, `PUT/DELETE /links/:id` with query params `tag`, `status`
- **Overflow Menu Actions**: Ver Detalles, Marcar leído, Eliminar (action_id: `link_actions:${id}`)
- **Assistant Integration**: Intent fallback supports `link.create` (requires `url` field) and `link.list`
- **User Context**: Links appear in `DATOS_USUARIO` as `[L:count] #id"title"[tag]`
- **Quick Help Panel**: Shows total links count and unread count
- **Structure**:
  ```
  src/modules/links/
  ├── controller/
  │   └── linksWeb.controller.ts      # REST endpoints
  ├── services/
  │   └── links.services.ts
  ├── repositories/
  │   └── database/
  │       └── links.dataSource.ts
  └── shared/
      ├── constants/
      │   └── links.constants.ts       # LinkStatus enum
      └── interfaces/
          └── links.interfaces.ts      # ILink interface
  ```

**5. Dual Interface Pattern**
Most features expose two controllers:

- **Slack Controller**: Handles Slack events, messages, and interactive actions
- **Web Controller**: Express routes + Socket.io events for web interface

**6. Progress Callback Pattern (Assistant Flow)**

Long-running assistant operations use an optional `ProgressCallback` to send intermediate feedback before the final response:

- **Type**: `ProgressCallback = (message: string) => void` (defined in `converstions.ts`)
- **Propagation**: Controller creates the callback with transport-specific logic, then passes it through the chain: `controller → services → messageProcessor`
- **Slack transport**: `(msg) => say(msg)` — sends a Slack message immediately
- **Web transport**: `(msg) => io.in(channel).emit('receive_assistant_progress', msg)` — emits a dedicated Socket.io event separate from `receive_assistant_message`
- **Usage**: Called via optional chaining (`onProgress?.('...')`) before slow operations. Fast operations (alert/task/note CRUD) do NOT call it.
- **Messages**:
  | Operation | Message |
  |-----------|---------|
  | Image generation (.img / intent) | `'Generando imagen...'` |
  | AI question (.q / intent) | `'Pensando...'` |
  | Intent classification (fallback) | `'Analizando mensaje...'` |
  | Web search (intent) | `'Buscando información...'` |

**7. Database Configuration**

- **SQLite** (default): `src/database/database.sqlite`
- **Production**: Override with `DB_URL` env var for Supabase/Postgres
- **Entities**: Auto-loaded from `src/entities/*{.ts,.js}`
- **Decorators**: Uses TypeORM decorators (`@Entity`, `@Column`, etc.) with `experimentalDecorators` enabled

**8. Slack Actions Handling**

- **Action Pattern Matching**: `app.ts` defines regex for handling alert/note/task/link actions
- **Interactive Messages**: Uses Slack Block Kit with overflow menus and buttons
- **Helper Message**: `/help` command shows available Slack commands (defined in `slack.constants.ts`)

### Slack Bot Usage Patterns

**Conversation Commands:**

- `cb ${message}` - Send message to AI chatbot
- `cb_show` - Show conversation history
- `cb_clean` - Clear conversation

**Conversation Flow Mode:**

- `start conversation` - Begin flow mode (all messages processed)
- `end conversation` - Exit flow mode
- `+ ${message}` - Add to conversation without AI response

**Link Management:**

- `.link/.lk ${url}` - Save link for later reading
- `.link -tt Title -d Description -t tag` - Save with metadata
- `.link -l` - List all links
- `.link -lt ${tag}` - List links by tag

**Image Generation:**

- `img ${prompt}` - Generate image with AI

### Configuration Files

- **TypeORM**: `src/config/ormconfig.ts` - Entities path, SQLite config
- **Slack**: `src/config/slackConfig.ts` - Bolt app initialization, message regex patterns
- **Redis**: `src/config/redisConfig.ts` - Singleton Redis client
- **Socket.io**: `src/config/socketConfig.ts` - IoServer singleton
- **Logger**: `src/config/logger.ts` - Pino logger with `createModuleLogger(module)` factory, pino-http for HTTP requests
- **Helmet**: `src/config/helmetConfig.ts` - Helmet security headers configured for REST API (CSP/COEP/COOP disabled, CORP cross-origin, HSTS production-only)
- **ESLint**: `.eslintrc.json` - Standard TypeScript with custom rules, `no-console: warn`

### Important Implementation Details

**Error Handling:**

- Uses `express-async-errors` for automatic async error catching
- Custom error classes in `src/shared/utils/errors/` (CustomError, BadRequestError, etc.)
- Global error handler: `src/shared/middleware/errors.ts`

**Socket.io Rooms:**

- Web conversations: Users join channel-based rooms
- Assistant conversations: User-specific rooms with padded userId (`userId.toString().padStart(8, '9')`)

**Cron Jobs:**

- Alert notifications: `src/modules/alerts/utils/cronJob.ts`
- Runs every minute (`'* * * * *'`) via node-cron

**Redis Conversation Keys:**

- Flow conversations: `${conversationFlowPrefix}:${channelId}`
- User conversations: `${rConversationKey}:${userId}`

### Development Notes

- **TypeScript Compilation**: Output goes to `/build` directory
- **Linters**: Both TSLint (prebuild) and ESLint (lint) are configured
- **Logging**: Pino structured JSON logger. Use `createModuleLogger('module.name')` for child loggers with context. Levels: `silent` (test), `debug` (dev), `info` (prod), overridable via `LOG_LEVEL` env. `pino-pretty` transport in dev only. ESLint `no-console: warn` enforced — use `log.info/error/warn/debug` instead of `console.*`
- **Socket Mode**: Slack bot uses WebSocket connection (no public webhook needed)
- **Hot Reload**: `nodemon` watches TypeScript files in development
- **Private Fields**: Codebase uses TypeScript `private`/`protected` extensively (avoid JS `#` fields)
- **Environment Variables**: Some variables have defaults in config files (e.g., REDIS_HOST falls back to local connection)
- **Testing**: Jest configured with ts-jest preset, tests located in `__tests__/` directories within each module layer (controllers, services, repositories, utils)
- **Pre-commit Hooks**: Husky runs linting and tests automatically before commits (skipped in production via NODE_ENV check)

### Docker Deployment

The Dockerfile expects:

1. Code compiled to `/build` directory (run `npm run build` first)
2. Build args for all environment variables
3. Redis accessible at `redis://host.docker.internal`
4. SQLite database at `/database/database.sqlite`
5. Ports 4000 (Express/Socket.io) and 3001 (Slack) exposed
6. `HEALTHCHECK` instruction uses `GET /health` to verify the container is running

## Code Guidelines

- Don't add personal information in code (name, email, and other personal info)
