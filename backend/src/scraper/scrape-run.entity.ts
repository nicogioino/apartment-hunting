import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('scrape_runs')
export class ScrapeRun {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ default: 0 })
  listingsFound: number;

  @Column({ default: 0 })
  newListings: number;

  @Column({ default: 'running' })
  status: string;
}
