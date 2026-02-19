import { Entity, BaseEntity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm'

import { BitbucketPRStatus } from '../modules/bitbucket/shared/constants/bitbucket.constants'

/**
 * Local cache for Bitbucket pull requests to reduce API round-trips.
 * Entries are upserted on every successful fetch and queried before hitting the API.
 */
@Entity()
export class BitbucketPRCache extends BaseEntity {
  @PrimaryColumn()
  prId: number

  @Column()
  repoSlug: string

  @Column('simple-json')
  prData: object

  @UpdateDateColumn()
  lastUpdated: Date

  @Column({ default: BitbucketPRStatus.OPEN })
  status: string
}
