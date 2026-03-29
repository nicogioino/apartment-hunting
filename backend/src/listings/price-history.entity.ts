import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('price_history')
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  listingId: string;

  @Column({ type: 'decimal', nullable: true })
  priceArs: number;

  @Column({ type: 'decimal', nullable: true })
  priceUsd: number;

  @Column({ type: 'decimal', nullable: true })
  blueRate: number;

  @CreateDateColumn()
  recordedAt: Date;
}
