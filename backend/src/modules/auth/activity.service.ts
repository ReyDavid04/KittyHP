import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ActivityService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        user_id INT UNSIGNED NOT NULL,
        last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async record(userId: number): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO user_activity (user_id, last_seen_at)
       VALUES (?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP`,
      [userId],
    );
  }

  async activeUsers(): Promise<{ count: number; windowMinutes: number; checkedAt: string }> {
    const windowMinutes = 5;
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM user_activity
       WHERE last_seen_at >= (CURRENT_TIMESTAMP - INTERVAL 5 MINUTE)`,
    ) as Array<{ total: number | string }>;

    return { count: Number(rows[0]?.total ?? 0), windowMinutes, checkedAt: new Date().toISOString() };
  }
}
