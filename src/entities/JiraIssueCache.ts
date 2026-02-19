import { Entity, BaseEntity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm'

/**
 * Local cache for Jira issues to reduce API round-trips.
 * Entries are upserted on every successful fetch and queried before hitting the API.
 */
@Entity()
export class JiraIssueCache extends BaseEntity {
  @PrimaryColumn()
  issueKey: string

  @Column()
  projectKey: string

  @Column('simple-json')
  issueData: object

  @UpdateDateColumn()
  lastUpdated: Date
}
