import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SaveProductionWeekDto } from './dto/save-production-week.dto';

type ProductionSeriesRow = {
  id: string | number;
  name: string;
  sortOrder: number | string;
};

type ProductionWeekEntryRow = {
  seriesId: string | number;
  recordDate: Date | string;
  inputQuantity: number | string;
  defectQuantity: number | string;
};

export interface ProductionWeekCell {
  inputQuantity: number;
  defectQuantity: number;
}

export interface ProductionWeekSeries {
  id: string;
  name: string;
  sortOrder: number;
  entries: Record<string, ProductionWeekCell>;
}

export interface ProductionWeekResponse {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  days: string[];
  series: ProductionWeekSeries[];
}

const DEFAULT_PRODUCTION_SERIES = [
  'BANFF_V72 1.0',
  'BANFF_X72 1.0',
  'G12 800',
  'GEMTREE',
  'MERINO',
  'OBAN30',
];

@Injectable()
export class ProductionService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTables();
    await this.seedProductionSeries();
  }

  async getWeek(startValue: string): Promise<ProductionWeekResponse> {
    const weekStartDate = this.startOfIsoWeek(this.parseDate(startValue));
    const days = this.buildWeekDays(weekStartDate);
    const weekStart = days[0];
    const weekEnd = days[6];

    const seriesRows = await this.dataSource.query<ProductionSeriesRow[]>(
      `SELECT id, name, sort_order AS sortOrder
       FROM production_series
       WHERE is_active = 1
       ORDER BY sort_order, name`,
    );

    const entryRows = await this.dataSource.query<ProductionWeekEntryRow[]>(
      `SELECT production_series_id AS seriesId,
              record_date AS recordDate,
              input_quantity AS inputQuantity,
              defect_quantity AS defectQuantity
       FROM production_defect_entries
       WHERE record_date BETWEEN ? AND ?`,
      [weekStart, weekEnd],
    );

    const entriesBySeries = new Map<string, Map<string, ProductionWeekCell>>();
    for (const row of entryRows) {
      const seriesId = String(row.seriesId);
      const recordDate = this.toDateOnly(row.recordDate);
      const seriesEntries = entriesBySeries.get(seriesId) ?? new Map<string, ProductionWeekCell>();
      seriesEntries.set(recordDate, {
        inputQuantity: Number(row.inputQuantity ?? 0),
        defectQuantity: Number(row.defectQuantity ?? 0),
      });
      entriesBySeries.set(seriesId, seriesEntries);
    }

    const series = seriesRows.map<ProductionWeekSeries>((row) => {
      const id = String(row.id);
      const existingEntries = entriesBySeries.get(id);
      const entries = days.reduce<Record<string, ProductionWeekCell>>((result, day) => {
        result[day] = existingEntries?.get(day) ?? { inputQuantity: 0, defectQuantity: 0 };
        return result;
      }, {});

      return {
        id,
        name: row.name,
        sortOrder: Number(row.sortOrder ?? 0),
        entries,
      };
    });

    return {
      weekStart,
      weekEnd,
      weekNumber: this.getIsoWeekNumber(weekStartDate),
      days,
      series,
    };
  }

  async saveWeek(dto: SaveProductionWeekDto, userId: number): Promise<ProductionWeekResponse> {
    const weekStartDate = this.startOfIsoWeek(this.parseDate(dto.weekStart));
    const days = this.buildWeekDays(weekStartDate);
    const allowedDates = new Set(days);

    const activeSeriesRows = await this.dataSource.query<Array<{ id: string | number }>>(
      'SELECT id FROM production_series WHERE is_active = 1',
    );
    const activeSeriesIds = new Set(activeSeriesRows.map((row) => String(row.id)));

    for (const entry of dto.entries) {
      const seriesId = String(entry.seriesId);
      const recordDate = this.toDateOnly(entry.recordDate);

      if (!activeSeriesIds.has(seriesId)) {
        throw new BadRequestException(`La serie de producción ${seriesId} no existe o está inactiva.`);
      }

      if (!allowedDates.has(recordDate)) {
        throw new BadRequestException(`La fecha ${recordDate} no pertenece a la semana seleccionada.`);
      }

      if (entry.defectQuantity > entry.inputQuantity) {
        throw new BadRequestException(
          `Defect Quantity no puede ser mayor que Input Quantity para la fecha ${recordDate}.`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      for (const entry of dto.entries) {
        await manager.query(
          `INSERT INTO production_defect_entries (
             production_series_id,
             record_date,
             input_quantity,
             defect_quantity,
             created_by_user_id,
             updated_by_user_id
           ) VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             input_quantity = VALUES(input_quantity),
             defect_quantity = VALUES(defect_quantity),
             updated_by_user_id = VALUES(updated_by_user_id),
             updated_at = CURRENT_TIMESTAMP`,
          [
            entry.seriesId,
            this.toDateOnly(entry.recordDate),
            entry.inputQuantity,
            entry.defectQuantity,
            userId,
            userId,
          ],
        );
      }
    });

    return this.getWeek(days[0]);
  }

  private async ensureTables(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS production_series (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(120) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_production_series_name (name),
        KEY idx_production_series_active_order (is_active, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS production_defect_entries (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        production_series_id BIGINT UNSIGNED NOT NULL,
        record_date DATE NOT NULL,
        input_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        defect_quantity INT UNSIGNED NOT NULL DEFAULT 0,
        created_by_user_id INT UNSIGNED NULL,
        updated_by_user_id INT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_production_defect_series_date (production_series_id, record_date),
        KEY idx_production_defect_record_date (record_date),
        KEY idx_production_defect_created_by (created_by_user_id),
        KEY idx_production_defect_updated_by (updated_by_user_id),
        CONSTRAINT fk_production_defect_series
          FOREIGN KEY (production_series_id)
          REFERENCES production_series(id)
          ON UPDATE CASCADE
          ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  private async seedProductionSeries(): Promise<void> {
    await this.dataSource.query(`UPDATE production_series SET is_active = 0 WHERE name NOT IN (${DEFAULT_PRODUCTION_SERIES.map(() => '?').join(',')})`, DEFAULT_PRODUCTION_SERIES);
    await this.dataSource.query(`UPDATE production_series SET name = 'CHIRON' WHERE LOWER(name) = 'chiron'`);
    await this.dataSource.query(`UPDATE production_series SET is_active = 0 WHERE LOWER(name) IN ('gemtree 16', 'gemtree 18') OR (UPPER(name) LIKE 'LAMPAS%' AND UPPER(name) <> 'LAMPAS')`);
    for (let index = 0; index < DEFAULT_PRODUCTION_SERIES.length; index += 1) {
      await this.dataSource.query(
        `INSERT INTO production_series (name, is_active, sort_order)
         VALUES (?, 1, ?)
         ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)`,
        [DEFAULT_PRODUCTION_SERIES[index], index + 1],
      );
    }
    // Consolidate historical variants into their canonical family series.
    const prefixes: Array<[string, string[]]> = [
      ['G12 800', ['MACHU%', 'LAPAZ%']],
      ['GEMTREE', ['GEMTREE%']],
      ['CHIRON', ['CHIRON%']],
      ['MERINO', ['MERINO%']],
      ['LAMPAS', ['LAMPAS%']],
      ['CASHMERE', ['CASHMERE%']],
      ['HELM', ['HELM%']],
      ['WAFFLE', ['WAFFLE%']],
    ];
    for (const [canonical, patterns] of prefixes) {
      const conditions = patterns.map(() => 'UPPER(source.name) LIKE ?').join(' OR ');
      await this.dataSource.query(
        `INSERT INTO production_defect_entries (production_series_id, record_date, input_quantity, defect_quantity)
         SELECT target.id, entries.record_date, SUM(entries.input_quantity), SUM(entries.defect_quantity)
         FROM production_defect_entries entries
         JOIN production_series source ON source.id = entries.production_series_id
         JOIN production_series target ON target.name = ?
         WHERE (${conditions}) AND UPPER(source.name) <> UPPER(?)
         GROUP BY target.id, entries.record_date
         ON DUPLICATE KEY UPDATE input_quantity = VALUES(input_quantity), defect_quantity = VALUES(defect_quantity)`,
        [canonical, ...patterns, canonical],
      );
      await this.dataSource.query(
        `UPDATE production_series SET is_active = 0 WHERE UPPER(name) <> UPPER(?) AND (${conditions.replaceAll('source.name', 'name')})`,
        [canonical, ...patterns],
      );
    }
  }

  private parseDate(value: string): Date {
    const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      throw new BadRequestException('La fecha de la semana debe tener el formato YYYY-MM-DD.');
    }

    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La fecha de la semana no es válida.');
    }

    return date;
  }

  private startOfIsoWeek(value: Date): Date {
    const date = new Date(value.getTime());
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date;
  }

  private buildWeekDays(weekStart: Date): string[] {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart.getTime());
      date.setUTCDate(date.getUTCDate() + index);
      return this.formatDate(date);
    });
  }

  private getIsoWeekNumber(value: Date): number {
    const target = new Date(value.getTime());
    const dayNumber = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNumber + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const firstThursdayDayNumber = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNumber + 3);
    return 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  }

  private formatDate(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toDateOnly(value: Date | string): string {
    if (value instanceof Date) {
      return this.formatDate(value);
    }

    const match = String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/);
    if (!match) {
      throw new BadRequestException('Se recibió una fecha no válida.');
    }

    return match[0];
  }
}
