import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'repairs' })
export class RepairEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ name: 'record_date', type: 'date' })
  recordDate!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  family!: string | null;

  @Column({ name: 'family_catalog_item_id', type: 'bigint', unsigned: true, nullable: true })
  familyCatalogItemId!: string | null;

  @Column({ name: 'top_issue', type: 'varchar', length: 255 })
  topIssue!: string;

  @Column({ name: 'top_issue_catalog_item_id', type: 'bigint', unsigned: true, nullable: true })
  topIssueCatalogItemId!: string | null;

  @Column({ name: 'failure_qty', type: 'int', unsigned: true, default: 0 })
  failureQty!: number;

  @Column({ name: 'build_qty', type: 'int', unsigned: true, default: 0 })
  buildQty!: number;

  @Column({ name: 'fr_percentage', type: 'decimal', precision: 8, scale: 2, default: 0 })
  frPercentage!: string;

  @Column({ type: 'varchar', length: 120 })
  category!: string;

  @Column({ name: 'category_catalog_item_id', type: 'bigint', unsigned: true, nullable: true })
  categoryCatalogItemId!: string | null;

  @Column({ name: 'return_status', type: 'varchar', length: 50, nullable: true })
  returnStatus!: string | null;

  @Column({ name: 'return_yes_qty', type: 'int', unsigned: true, default: 0 })
  returnYesQty!: number;

  @Column({ name: 'return_no_qty', type: 'int', unsigned: true, default: 0 })
  returnNoQty!: number;

  @Column({ name: 'fail_picture', type: 'varchar', length: 255, nullable: true })
  failPicture!: string | null;

  @Column({ name: 'major_part', type: 'varchar', length: 255, nullable: true })
  majorPart!: string | null;

  @Column({ name: 'major_part_catalog_item_id', type: 'bigint', unsigned: true, nullable: true })
  majorPartCatalogItemId!: string | null;

  @Column({ name: 'repair_result', type: 'varchar', length: 255, nullable: true })
  repairResult!: string | null;

  @Column({ name: 'failure_factor', type: 'varchar', length: 255, nullable: true })
  failureFactor!: string | null;

  @Column({ name: 'failure_factor_catalog_item_id', type: 'bigint', unsigned: true, nullable: true })
  failureFactorCatalogItemId!: string | null;

  @Column({ type: 'text', nullable: true })
  actions!: string | null;

  @Column({ name: 'evidence_picture', type: 'varchar', length: 255, nullable: true })
  evidencePicture!: string | null;

  @Column({ name: 'created_by_user_id', type: 'int', unsigned: true, nullable: true })
  createdByUserId!: number | null;

  @Column({ name: 'source_payload', type: 'json', nullable: true })
  sourcePayload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
