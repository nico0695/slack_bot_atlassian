import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('bitbucket_pr_cache')
export class BitbucketPRCache {
  @PrimaryColumn()
  prId: number

  @Column()
  repoSlug: string

  @Column({ type: 'simple-json' })
  prData: object

  @Column()
  lastUpdated: Date

  @Column()
  status: string
}
