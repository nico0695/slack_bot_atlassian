/**
 * Fluent builder for JQL (Jira Query Language) queries
 */
export class JQLBuilder {
  private conditions: string[] = []
  private orderByClause: string | null = null

  project(key: string): this {
    this.conditions.push(`project = "${key}"`)
    return this
  }

  assignedTo(user: string): this {
    this.conditions.push(`assignee = "${user}"`)
    return this
  }

  inStatus(...statuses: string[]): this {
    const statusList = statuses.map((s) => `"${s}"`).join(', ')
    this.conditions.push(`status IN (${statusList})`)
    return this
  }

  withPriority(...priorities: string[]): this {
    const priorityList = priorities.map((p) => `"${p}"`).join(', ')
    this.conditions.push(`priority IN (${priorityList})`)
    return this
  }

  inSprint(sprintName: string): this {
    this.conditions.push(`sprint = "${sprintName}"`)
    return this
  }

  inOpenSprints(): this {
    this.conditions.push('sprint in openSprints()')
    return this
  }

  noSprint(): this {
    this.conditions.push('sprint is EMPTY')
    return this
  }

  notInStatus(...statuses: string[]): this {
    const statusList = statuses.map((s) => `"${s}"`).join(', ')
    this.conditions.push(`status NOT IN (${statusList})`)
    return this
  }

  createdAfter(date: Date): this {
    this.conditions.push(`created >= "${date.toISOString().split('T')[0]}"`)
    return this
  }

  hasLabel(...labels: string[]): this {
    labels.forEach((label) => {
      this.conditions.push(`labels = "${label}"`)
    })
    return this
  }

  textSearch(text: string): this {
    // Escape backslashes first, then double quotes to prevent JQL injection
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    this.conditions.push(`(summary ~ "${escaped}" OR description ~ "${escaped}")`)
    return this
  }

  unresolved(): this {
    this.conditions.push('resolution = "Unresolved"')
    return this
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `ORDER BY ${field} ${direction}`
    return this
  }

  build(): string {
    const where = this.conditions.join(' AND ')
    return this.orderByClause ? `${where} ${this.orderByClause}` : where
  }
}
