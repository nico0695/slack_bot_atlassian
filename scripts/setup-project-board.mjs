#!/usr/bin/env node
/**
 * setup-project-board.mjs
 *
 * Creates GitHub Issues for all Atlassian integration stages and adds them to
 * the project board at https://github.com/users/nico0695/projects/4
 *
 * PREREQUISITES
 * ─────────────
 * 1. Create a GitHub Personal Access Token (PAT) with these scopes:
 *    • repo          (to create issues)
 *    • project       (to read/write project items)
 *
 * 2. Set the token as an environment variable:
 *    export GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
 *
 * USAGE
 * ─────
 *    node scripts/setup-project-board.mjs
 *
 * The script is idempotent for issues that already exist (it checks by title),
 * but will create new ones if they don't exist yet.
 */

import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const https = require('https')

// ─── Configuration ──────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_PAT
const REPO_OWNER = 'nico0695'
const REPO_NAME = 'slack_bot_atlassian'
const PROJECT_NUMBER = 4

if (!GITHUB_TOKEN) {
  console.error('❌  GITHUB_PAT environment variable is required.')
  console.error('    Create a PAT with repo + project scopes and set it:')
  console.error('    export GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxx')
  process.exit(1)
}

// ─── Issue definitions ───────────────────────────────────────────────────────

/**
 * Status values must match the column names in your project board.
 * Common defaults: 'Todo', 'In Progress', 'Done'
 */
const ISSUES = [
  // ── Stage 1: Configuración de APIs y Servicios (DONE) ──────────────────
  {
    title: '[Stage 1] Configuración de credenciales y dependencias',
    body: `## Descripción
Setup inicial de credenciales de Jira y Bitbucket en \`.env.example\` e instalación de dependencias.

## Tareas
- [x] Agregar variables de entorno: \`JIRA_HOST\`, \`JIRA_EMAIL\`, \`JIRA_API_TOKEN\`, \`JIRA_PROJECT_KEY\`
- [x] Agregar variables de entorno: \`BITBUCKET_WORKSPACE\`, \`BITBUCKET_USERNAME\`, \`BITBUCKET_APP_PASSWORD\`
- [x] Instalar \`jira-client\` + \`@types/jira-client\`

## Referencia
Ver Stage 1.1 y 1.2 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-1'],
    status: 'Done',
  },
  {
    title: '[Stage 1] Módulo Jira base + entidad JiraIssueCache',
    body: `## Descripción
Scaffolding completo del módulo Jira siguiendo la arquitectura modular existente (controller/service/repository/shared).

## Tareas
- [x] Crear \`src/modules/jira/\` con estructura completa
- [x] \`jiraApi.repository.ts\` — wrapper tipado sobre \`jira-client\`
- [x] \`jira.services.ts\` — testConnection, getProjects, getIssue
- [x] \`jiraWeb.controller.ts\` — GET /jira/test, /jira/projects, /jira/issues/:issueKey
- [x] \`src/entities/JiraIssueCache.ts\` — entidad TypeORM para cache local
- [x] \`utils/jiraFormatters.ts\` + \`utils/jql.builder.ts\`
- [x] Registrar módulo en \`app.ts\`

## Referencia
Ver Stage 1.3, 1.5 y 1.6 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-1', 'jira'],
    status: 'Done',
  },
  {
    title: '[Stage 1] Módulo Bitbucket base + entidad BitbucketPRCache',
    body: `## Descripción
Scaffolding completo del módulo Bitbucket siguiendo la arquitectura modular existente.

## Tareas
- [x] Crear \`src/modules/bitbucket/\` con estructura completa
- [x] \`bitbucketApi.repository.ts\` — wrapper axios sobre Bitbucket Cloud REST v2
- [x] \`bitbucket.services.ts\` — testConnection, getRepositories, getPullRequests
- [x] \`bitbucketWeb.controller.ts\` — GET /bitbucket/test, /bitbucket/repositories, /bitbucket/repositories/:slug/pullrequests
- [x] \`src/entities/BitbucketPRCache.ts\` — entidad TypeORM para cache local
- [x] \`utils/bitbucketFormatters.ts\`
- [x] Registrar módulo en \`app.ts\`

## Referencia
Ver Stage 1.4, 1.5 y 1.6 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-1', 'bitbucket'],
    status: 'Done',
  },

  // ── Stage 2: Funcionalidades Core de Lectura (TODO) ─────────────────────
  {
    title: '[Stage 2] Comandos Slack y endpoints core de Jira',
    body: `## Descripción
Implementar las funcionalidades básicas de lectura de Jira disponibles desde Slack y como REST endpoints.

## Tareas
- [ ] Slack: \`.jira issue PROJ-123\` — ver detalle
- [ ] Slack: \`.jira list\` — mis issues asignadas
- [ ] Slack: \`.jira search "jql"\` — búsqueda JQL
- [ ] Slack: \`.jira sprint\` — issues del sprint actual
- [ ] REST: \`GET /jira/issues/assigned-to-me\`
- [ ] REST: \`GET /jira/issues/search?jql=...\`
- [ ] REST: \`GET /jira/sprints/active\`
- [ ] Cache Redis: \`jira:issue:*\` (TTL 5min), \`jira:sprint:active\` (TTL 10min)

## Referencia
Ver Stage 2.1 y 2.3 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-2', 'jira'],
    status: 'Todo',
  },
  {
    title: '[Stage 2] Comandos Slack y endpoints core de Bitbucket',
    body: `## Descripción
Implementar las funcionalidades básicas de lectura de Bitbucket disponibles desde Slack y como REST endpoints.

## Tareas
- [ ] Slack: \`.bb pr list\` — PRs abiertas
- [ ] Slack: \`.bb pr ID\` — detalle de PR
- [ ] Slack: \`.bb commits branch\` — últimos commits
- [ ] Slack: \`.bb branches\` — branches activas
- [ ] REST: \`GET /bitbucket/pullrequests/:id\`
- [ ] REST: \`GET /bitbucket/repositories/:slug/commits\`
- [ ] REST: \`GET /bitbucket/repositories/:slug/branches\`
- [ ] Cache Redis: \`bb:pr:*\` (TTL 3min), \`bb:repo:*:branches\` (TTL 15min)

## Referencia
Ver Stage 2.2 y 2.3 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-2', 'bitbucket'],
    status: 'Todo',
  },

  // ── Stage 3: Creación y Modificación de Recursos (TODO) ─────────────────
  {
    title: '[Stage 3] CRUD de issues Jira desde Slack',
    body: `## Descripción
Habilitar creación, transición y actualización de issues Jira desde Slack y el assistant de AI.

## Tareas
- [ ] Slack: \`.jira create -t Task -s "Título" -d "Desc" -a email\`
- [ ] Slack: \`.jira move PROJ-123 "In Progress"\`
- [ ] Slack: \`.jira assign PROJ-123 @username\`
- [ ] Slack: \`.jira comment PROJ-123 "texto"\`
- [ ] Slack: \`.jira update PROJ-123 -p High\`
- [ ] Intent AI: \`jira.create\` y \`jira.update\`
- [ ] Zod schemas: \`createIssueSchema\` con validación completa
- [ ] Error handling y rollback en caso de falla

## Referencia
Ver Stage 3.1, 3.2 y 3.4 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-3', 'jira'],
    status: 'Todo',
  },
  {
    title: '[Stage 3] CRUD de PRs Bitbucket desde Slack',
    body: `## Descripción
Habilitar creación, aprobación y merge de pull requests de Bitbucket desde Slack.

## Tareas
- [ ] Slack: \`.bb pr create -s feature/branch -t develop -title "..."\`
- [ ] Slack: \`.bb pr approve PR-ID\`
- [ ] Slack: \`.bb pr comment PR-ID "LGTM"\`
- [ ] Slack: \`.bb pr merge PR-ID\`
- [ ] REST: \`POST /bitbucket/repositories/:slug/pullrequests\`
- [ ] Validaciones y audit log de cambios

## Referencia
Ver Stage 3.3 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-3', 'bitbucket'],
    status: 'Todo',
  },

  // ── Stage 4: Webhooks y Notificaciones (TODO) ────────────────────────────
  {
    title: '[Stage 4] Webhook listeners de Jira y Bitbucket',
    body: `## Descripción
Configurar endpoints que reciban webhooks de Jira y Bitbucket para procesar eventos en tiempo real.

## Tareas
- [ ] \`POST /webhooks/jira\` — recibir eventos de Jira
- [ ] Handlers: issueCreated, issueUpdated, issueTransitioned, commentAdded
- [ ] \`POST /webhooks/bitbucket\` — recibir eventos de Bitbucket
- [ ] Handlers: prCreated, prMerged, prDeclined, commitPushed
- [ ] Rate limiting y verificación de firma de webhooks

## Referencia
Ver Stage 4.1 y 4.2 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-4'],
    status: 'Todo',
  },
  {
    title: '[Stage 4] Sistema de suscripciones y notification manager',
    body: `## Descripción
Permitir a usuarios suscribirse a eventos específicos y recibir notificaciones en Slack o web.

## Tareas
- [ ] Entidad \`WebhookSubscription\` (TypeORM)
- [ ] REST: \`POST /webhooks/subscriptions\` — crear suscripción
- [ ] \`NotificationManager\` — procesar eventos y enviar notificaciones
- [ ] Notificaciones Slack (via \`say()\`)
- [ ] Notificaciones web (via Socket.io \`emit\`)
- [ ] Filtros por projectKey, issueType, priority, repoSlug

## Referencia
Ver Stage 4.3 y 4.4 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-4'],
    status: 'Todo',
  },

  // ── Stage 5: AI Enhancements (TODO) ─────────────────────────────────────
  {
    title: '[Stage 5] Clasificadores de intent y comandos AI (Jira + Bitbucket)',
    body: `## Descripción
Extender el clasificador de intents existente con intents específicos de project management.

## Tareas
- [ ] Nuevos intents: \`jira.create\`, \`jira.update\`, \`jira.search\`, \`bitbucket.pr.create\`, \`bitbucket.review\`
- [ ] Intent: \`sprint.analyze\`, \`deadline.predict\`
- [ ] Integrar con MessageProcessor existente
- [ ] Tests de accuracy >85%

## Referencia
Ver Stage 5.1 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-5', 'ai'],
    status: 'Todo',
  },
  {
    title: '[Stage 5] Generación de documentación y code review asistido',
    body: `## Descripción
Usar AI para generar sprint reports, release notes y asistir en code reviews de PRs.

## Tareas
- [ ] Slack: \`.docs sprint\` — generar sprint report con AI
- [ ] Slack: \`.docs release v1.x.x\` — release notes automáticas desde PRs
- [ ] Slack: \`.bb review PR-ID --ai\` — análisis de complejidad, bugs, security
- [ ] Análisis predictivo: velocity trend, burndown prediction
- [ ] Slack: \`.jira predict deadline PROJ-123\`

## Referencia
Ver Stage 5.2, 5.3 y 5.4 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-5', 'ai'],
    status: 'Todo',
  },

  // ── Stage 6: Analytics y Dashboards (TODO) ──────────────────────────────
  {
    title: '[Stage 6] Analytics module y dashboards (Jira + Bitbucket)',
    body: `## Descripción
Módulo de analytics con dashboards visuales, métricas de equipo y exportación de reportes.

## Tareas
- [ ] Módulo \`src/modules/analytics/\` con estructura completa
- [ ] Métricas Jira: velocity, burndown, cycle time, sprint completion rate
- [ ] Métricas Bitbucket: PR merge time, code frequency, contributors activity
- [ ] Métricas combinadas: DORA metrics (deployment frequency, MTTR, etc.)
- [ ] Charts: burndown, velocity, cycle time (chart.js)
- [ ] Export: \`GET /analytics/custom-report\` (PDF/CSV)
- [ ] Slack: \`.analytics velocity --last 6\`

## Referencia
Ver Stage 6 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-6'],
    status: 'Todo',
  },

  // ── Stage 7: Advanced Features (TODO) ───────────────────────────────────
  {
    title: '[Stage 7] Auto-healing, custom workflows y wiki auto-generada',
    body: `## Descripción
Features avanzadas: auto-asignación inteligente, workflow DSL, y wiki auto-generada desde Jira/Bitbucket.

## Tareas
- [ ] AutoAssigner: sugerir assignee basado en expertise e histórico
- [ ] SmartPrioritizer: auto-priorización por keywords e impacto
- [ ] StalePRDetector: detectar PRs abandonadas y notificar owners
- [ ] Workflow DSL: trigger/conditions/actions configurable por YAML
- [ ] Auto-link: detectar \`PROJ-123\` en PR title y vincular en Jira
- [ ] Wiki: \`.wiki generate project/architecture/api\`
- [ ] Optimizaciones: batch operations, incremental sync, connection pooling

## Referencia
Ver Stage 7 en \`docs/atlassian-integration/IMPLEMENTATION_STAGES.md\``,
    labels: ['atlassian', 'stage-7'],
    status: 'Todo',
  },
]

// ─── GraphQL helpers ─────────────────────────────────────────────────────────

function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables })
    const options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        Authorization: `bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'setup-project-board-script',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.errors) {
            reject(new Error(JSON.stringify(parsed.errors, null, 2)))
          } else {
            resolve(parsed.data)
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function restPost(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'POST',
      headers: {
        Authorization: `bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'User-Agent': 'setup-project-board-script',
        Accept: 'application/vnd.github+json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

function restGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'setup-project-board-script',
        Accept: 'application/vnd.github+json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀  Setting up GitHub Project board...\n')

  // 1. Ensure required labels exist
  console.log('📌  Creating labels...')
  const labelColors = {
    atlassian: '0052CC',
    'stage-1': '0075CA',
    'stage-2': '006B75',
    'stage-3': 'E4E669',
    'stage-4': 'D93F0B',
    'stage-5': '5319E7',
    'stage-6': 'F9D0C4',
    'stage-7': 'BFD4F2',
    jira: '0052CC',
    bitbucket: '205081',
    ai: '9B59B6',
  }

  const existingLabels = await restGet(`/repos/${REPO_OWNER}/${REPO_NAME}/labels?per_page=100`)
  const existingLabelNames = new Set(existingLabels.map((l) => l.name))

  for (const [name, color] of Object.entries(labelColors)) {
    if (!existingLabelNames.has(name)) {
      await restPost(`/repos/${REPO_OWNER}/${REPO_NAME}/labels`, {
        name,
        color,
        description: `Atlassian integration — ${name}`,
      })
      console.log(`  ✅  Label created: ${name}`)
    } else {
      console.log(`  ⏭   Label exists:  ${name}`)
    }
  }

  // 2. Fetch existing issues to avoid duplicates
  console.log('\n📋  Fetching existing issues...')
  const existingIssues = await restGet(
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&per_page=100`
  )
  const existingTitles = new Map(existingIssues.map((i) => [i.title, i.node_id]))

  // 3. Get project info (node ID + status field)
  console.log('\n🔍  Fetching project details...')
  const projectData = await graphql(`
    query {
      user(login: "${REPO_OWNER}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          title
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `)

  const project = projectData.user.projectV2
  console.log(`  Project: "${project.title}" (${project.id})`)

  const statusField = project.fields.nodes.find(
    (f) => f.name === 'Status' || f.name === 'Estado' || f.name === 'estado'
  )

  if (!statusField) {
    console.error('  ❌  Could not find Status field in the project.')
    console.error('      Available fields:', project.fields.nodes.map((f) => f.name).join(', '))
    process.exit(1)
  }

  console.log(`  Status field: "${statusField.name}" (${statusField.id})`)
  console.log(`  Options: ${statusField.options.map((o) => o.name).join(', ')}`)

  // Build a map of status name → option id (case-insensitive)
  const statusOptions = new Map(statusField.options.map((o) => [o.name.toLowerCase(), o.id]))

  // 4. Create issues and add to project
  console.log('\n📝  Creating issues and adding to project board...\n')

  for (const issue of ISSUES) {
    let nodeId

    if (existingTitles.has(issue.title)) {
      nodeId = existingTitles.get(issue.title)
      console.log(`  ⏭   Already exists: "${issue.title}"`)
    } else {
      // Create the issue
      const created = await restPost(`/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
      })

      if (created.errors || !created.node_id) {
        console.error(`  ❌  Failed to create issue: "${issue.title}"`)
        console.error('      ', JSON.stringify(created))
        continue
      }

      nodeId = created.node_id
      console.log(`  ✅  Created issue #${created.number}: "${issue.title}"`)
    }

    // Add to project
    const addResult = await graphql(
      `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item {
            id
          }
        }
      }
    `,
      { projectId: project.id, contentId: nodeId }
    )

    const itemId = addResult.addProjectV2ItemById?.item?.id
    if (!itemId) {
      console.warn(`  ⚠️   Could not add to project: "${issue.title}"`)
      continue
    }

    // Set status
    const statusKey = issue.status.toLowerCase()
    const optionId = statusOptions.get(statusKey)

    if (!optionId) {
      const available = [...statusOptions.keys()].join(', ')
      console.warn(
        `  ⚠️   Status "${issue.status}" not found (available: ${available}) — skipping status update`
      )
      continue
    }

    await graphql(
      `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }) {
          projectV2Item {
            id
          }
        }
      }
    `,
      {
        projectId: project.id,
        itemId,
        fieldId: statusField.id,
        optionId,
      }
    )

    console.log(`  📌  Added to project board with status: ${issue.status}`)
  }

  console.log('\n✅  Done! Visit your board at:')
  console.log(`    https://github.com/users/${REPO_OWNER}/projects/${PROJECT_NUMBER}/views/1\n`)
}

main().catch((err) => {
  console.error('❌  Script failed:', err.message)
  process.exit(1)
})
