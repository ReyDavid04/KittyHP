import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairRepository } from '../repositories/repair.repository';
import { CreateRepairUseCase } from '../use-cases/create-repair.use-case';

type RepairCatalogType = 'top_issue' | 'category' | 'major_part' | 'failure_factor';

type RepairCatalogRow = {
  catalogType: RepairCatalogType;
  value: string;
};

export type RepairCatalogs = {
  topIssues: string[];
  categories: string[];
  majorParts: string[];
  failureFactors: string[];
};

const EMPTY_CATALOGS: RepairCatalogs = {
  topIssues: [],
  categories: [],
  majorParts: [],
  failureFactors: [],
};

@Injectable()
export class RepairsService implements OnModuleInit {
  constructor(
    private readonly repairRepository: RepairRepository,
    private readonly createRepairUseCase: CreateRepairUseCase,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCatalogTable();
    await this.syncCatalogsFromRepairs();
  }

  create(createRepairDto: CreateRepairDto) {
    return this.createRepairUseCase.execute(createRepairDto, this.repairRepository);
  }

  findAll() {
    return this.repairRepository.findAll();
  }

  async getCatalogs(): Promise<RepairCatalogs> {
    await this.ensureCatalogTable();
    await this.syncCatalogsFromRepairs();

    const rows = await this.dataSource.query<RepairCatalogRow[]>(
      `SELECT catalog_type AS catalogType, value
       FROM repair_catalog_items
       WHERE is_active = 1
       ORDER BY catalog_type, sort_order, value`,
    );

    return rows.reduce<RepairCatalogs>((catalogs, row) => {
      switch (row.catalogType) {
        case 'top_issue':
          catalogs.topIssues.push(row.value);
          break;
        case 'category':
          catalogs.categories.push(row.value);
          break;
        case 'major_part':
          catalogs.majorParts.push(row.value);
          break;
        case 'failure_factor':
          catalogs.failureFactors.push(row.value);
          break;
      }

      return catalogs;
    }, {
      topIssues: [...EMPTY_CATALOGS.topIssues],
      categories: [...EMPTY_CATALOGS.categories],
      majorParts: [...EMPTY_CATALOGS.majorParts],
      failureFactors: [...EMPTY_CATALOGS.failureFactors],
    });
  }

  findById(id: string) {
    return this.repairRepository.findById(id);
  }

  update(id: string, updateRepairDto: UpdateRepairDto) {
    return this.repairRepository.update(id, updateRepairDto);
  }

  delete(id: string) {
    return this.repairRepository.delete(id);
  }

  private async ensureCatalogTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS repair_catalog_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        catalog_type VARCHAR(40) NOT NULL,
        value VARCHAR(255) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_repair_catalog_type_value (catalog_type, value),
        KEY idx_repair_catalog_type_active (catalog_type, is_active, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  private async syncCatalogsFromRepairs(): Promise<void> {
    const catalogColumns: Array<{ type: RepairCatalogType; column: string }> = [
      { type: 'top_issue', column: 'top_issue' },
      { type: 'category', column: 'category' },
      { type: 'major_part', column: 'major_part' },
      { type: 'failure_factor', column: 'failure_factor' },
    ];

    for (const catalog of catalogColumns) {
      await this.dataSource.query(
        `INSERT IGNORE INTO repair_catalog_items (catalog_type, value)
         SELECT ?, TRIM(${catalog.column})
         FROM repairs
         WHERE ${catalog.column} IS NOT NULL
           AND TRIM(${catalog.column}) <> ''
         GROUP BY TRIM(${catalog.column})`,
        [catalog.type],
      );
    }
  }
}
