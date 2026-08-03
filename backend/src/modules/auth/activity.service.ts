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

  async activeUsers(): Promise<{
    count: number;
    windowMinutes: number;
    checkedAt: string;
    users: Array<{ id: number; email: string; role: string; lastSeenAt: string }>;
  }> {
    const windowMinutes = 5;
    const rows = await this.dataSource.query(
      `SELECT u.id, u.email, u.role, ua.last_seen_at AS lastSeenAt
       FROM user_activity ua
       INNER JOIN users u ON u.id = ua.user_id
       WHERE ua.last_seen_at >= (CURRENT_TIMESTAMP - INTERVAL 5 MINUTE)
         AND u.is_active = 1
       ORDER BY ua.last_seen_at DESC`,
    ) as Array<{ id: number | string; email: string; role: string; lastSeenAt: Date | string }>;

    return {
      count: rows.length,
      windowMinutes,
      checkedAt: new Date().toISOString(),
      users: rows.map((row) => ({
        id: Number(row.id),
        email: row.email,
        role: row.role,
        lastSeenAt: new Date(row.lastSeenAt).toISOString(),
      })),
    };
  }
}
