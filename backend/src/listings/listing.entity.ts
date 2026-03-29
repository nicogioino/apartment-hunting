import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('listings')
export class Listing {
  @PrimaryColumn()
  id: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'decimal', nullable: true })
  priceUsd: number;

  @Column({ type: 'decimal', nullable: true })
  priceArs: number;

  @Column({ nullable: true })
  expensesDisplay: string;

  @Column({ nullable: true })
  neighborhood: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'decimal', nullable: true })
  totalAreaM2: number;

  @Column({ type: 'decimal', nullable: true })
  coveredAreaM2: number;

  @Column({ nullable: true })
  rooms: number;

  @Column({ nullable: true })
  bedrooms: number;

  @Column({ nullable: true })
  bathrooms: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  imageUrls: string[];

  @Column({ type: 'jsonb', nullable: true, default: [] })
  features: string[];

  @Column({ nullable: true })
  publisherName: string;

  // Scores (1-10)
  @Column({ type: 'decimal', nullable: true })
  scoreValue: number;

  @Column({ type: 'decimal', nullable: true })
  scoreLocation: number;

  @Column({ type: 'decimal', nullable: true })
  scoreAesthetics: number;

  @Column({ type: 'decimal', nullable: true })
  scoreOverall: number;

  @Column({ type: 'text', nullable: true })
  rankingNotes: string;

  @CreateDateColumn()
  firstSeen: Date;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  lastSeen: Date;

  @Column({ type: 'timestamp', nullable: true })
  rankedAt: Date;

  // Price tracking: USD change since first seen (negative = price dropped)
  @Column({ type: 'decimal', nullable: true, default: 0 })
  priceChangeUsd: number;

  @Column({ default: true })
  isActive: boolean;
}
