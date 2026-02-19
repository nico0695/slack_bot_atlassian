/**
 * Builder for Jira Query Language (JQL) strings.
 * Allows chaining conditions and builds the final query string.
 */
export class JQLBuilder {
  private conditions: string[] = []

  assignedTo(user: string): JQLBuilder {
    this.conditions.push(`assignee = "${user}"`)
    return this
  }

  inStatus(status: string): JQLBuilder {
    this.conditions.push(`status = "${status}"`)
    return this
  }

  inSprint(sprint: string): JQLBuilder {
    this.conditions.push(`sprint = "${sprint}"`)
    return this
  }

  inProject(projectKey: string): JQLBuilder {
    this.conditions.push(`project = "${projectKey}"`)
    return this
  }

  build(): string {
    return this.conditions.join(' AND ')
  }
}
