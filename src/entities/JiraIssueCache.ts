import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('jira_issue_cache')
export class JiraIssueCache {
  @PrimaryColumn()
  issueKey: string

  @Column({ type: 'simple-json' })
  issueData: object

  @Column()
  lastUpdated: Date

  @Column()
  projectKey: string
}
