import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RepairReturnMigrationService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureColumn('return_yes_qty', `INT UNSIGNED NOT NULL DEFAULT 0 AFTER return_status`);
    await this.ensureColumn('return_no_qty', `INT UNSIGNED NOT NULL DEFAULT 0 AFTER return_yes_qty`);
    await this.migrateLegacyReturnValues();
  }

  private async ensureColumn(columnName: string, definition: string): Promise<void> {
    const rows = await this.dataSource.query<Array<{ total: number | string }>>(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'repairs'
         AND COLUMN_NAME = ?`,
      [columnName],
    );

    if (Number(rows[0]?.total ?? 0) === 0) {
      await this.dataSource.query(`ALTER TABLE repairs ADD COLUMN ${columnName} ${definition}`);
    }
  }

  private async migrateLegacyReturnValues(): Promise<void> {
    await this.dataSource.query(`
      UPDATE repairs
      SET return_yes_qty = CASE
            WHEN UPPER(TRIM(COALESCE(return_status, ''))) = 'YES' THEN failure_qty
            ELSE return_yes_qty
          END,
          return_no_qty = CASE
            WHEN UPPER(TRIM(COALESCE(return_status, ''))) = 'NO' THEN failure_qty
            ELSE return_no_qty
          END
      WHERE return_yes_qty = 0
        AND return_no_qty = 0
        AND UPPER(TRIM(COALESCE(return_status, ''))) IN ('YES', 'NO')
    `);
  }
}
