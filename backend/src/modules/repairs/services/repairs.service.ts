import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateRepairCatalogItemDto } from '../dto/create-repair-catalog-item.dto';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairCatalogItemDto } from '../dto/update-repair-catalog-item.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairRepository } from '../repositories/repair.repository';
import { CreateRepairUseCase } from '../use-cases/create-repair.use-case';

export type RepairCatalogType = 'family' | 'top_issue' | 'category' | 'major_part' | 'failure_factor';

const CATALOG_TYPES: RepairCatalogType[] = ['family', 'top_issue', 'category', 'major_part', 'failure_factor'];

const CATALOG_RELATIONS: Record<RepairCatalogType, {
  textColumn: string;
  idColumn: string;
  indexName: string;
  foreignKeyName: string;
  label: string;
}> = {
  family: {
    textColumn: 'family',
    idColumn: 'family_catalog_item_id',
    indexName: 'idx_repairs_family_catalog_item_id',
    foreignKeyName: 'fk_repairs_family_catalog_item',
    label: 'Family',
  },
  top_issue: {
    textColumn: 'top_issue',
    idColumn: 'top_issue_catalog_item_id',
    indexName: 'idx_repairs_top_issue_catalog_item_id',
    foreignKeyName: 'fk_repairs_top_issue_catalog_item',
    label: 'Top Issue',
  },
  category: {
    textColumn: 'category',
    idColumn: 'category_catalog_item_id',
    indexName: 'idx_repairs_category_catalog_item_id',
    foreignKeyName: 'fk_repairs_category_catalog_item',
    label: 'Category',
  },
  major_part: {
    textColumn: 'major_part',
    idColumn: 'major_part_catalog_item_id',
    indexName: 'idx_repairs_major_part_catalog_item_id',
    foreignKeyName: 'fk_repairs_major_part_catalog_item',
    label: 'Major Part',
  },
  failure_factor: {
    textColumn: 'failure_factor',
    idColumn: 'failure_factor_catalog_item_id',
    indexName: 'idx_repairs_failure_factor_catalog_item_id',
    foreignKeyName: 'fk_repairs_failure_factor_catalog_item',
    label: 'Failure Factor',
  },
};

type RepairCatalogRow = {
  catalogType: RepairCatalogType;
  value: string;
};

type RepairCatalogItemRow = {
  id: string | number;
  catalogType: RepairCatalogType;
  value: string;
  isActive: boolean | number;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type RepairCatalogItem = {
  id: string;
  catalogType: RepairCatalogType;
  value: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type RepairCatalogs = {
  families: string[];
  topIssues: string[];
  categories: string[];
  majorParts: string[];
  failureFactors: string[];
};

const EMPTY_CATALOGS: RepairCatalogs = {
  families: [],
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
    await this.ensureRepairFamilyColumn();
    await this.ensureCatalogTable();
    await this.seedCatalogsFromRepairsIfEmpty();
    await this.ensureMissingHistoricalCatalogItems();
    await this.ensureRepairCatalogRelationColumns();
    await this.backfillRepairCatalogRelations();
    await this.ensureRepairCatalogForeignKeys();
  }

  create(createRepairDto: CreateRepairDto, createdByUserId: number) {
    return this.createRepairUseCase.execute(createRepairDto, createdByUserId, this.repairRepository);
  }

  findAll() {
    return this.repairRepository.findAll();
  }

  async getCatalogs(): Promise<RepairCatalogs> {
    await this.ensureCatalogTable();

    const rows = await this.dataSource.query<RepairCatalogRow[]>(
      `SELECT catalog_type AS catalogType, value
       FROM repair_catalog_items
       WHERE is_active = 1
       ORDER BY catalog_type, sort_order, value`,
    );

    return rows.reduce<RepairCatalogs>((catalogs, row) => {
      switch (row.catalogType) {
        case 'family':
          catalogs.families.push(row.value);
          break;
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
      families: [...EMPTY_CATALOGS.families],
      topIssues: [...EMPTY_CATALOGS.topIssues],
      categories: [...EMPTY_CATALOGS.categories],
      majorParts: [...EMPTY_CATALOGS.majorParts],
      failureFactors: [...EMPTY_CATALOGS.failureFactors],
    });
  }

  async getCatalogItems(type: string): Promise<RepairCatalogItem[]> {
    const catalogType = this.parseCatalogType(type);
    await this.ensureCatalogTable();

    const rows = await this.dataSource.query<RepairCatalogItemRow[]>(
      `SELECT id,
              catalog_type AS catalogType,
              value,
              is_active AS isActive,
              sort_order AS sortOrder,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM repair_catalog_items
       WHERE catalog_type = ?
       ORDER BY sort_order, value`,
      [catalogType],
    );

    return rows.map((row) => this.normalizeCatalogItem(row));
  }

  async createCatalogItem(type: string, dto: CreateRepairCatalogItemDto): Promise<RepairCatalogItem> {
    const catalogType = this.parseCatalogType(type);
    const value = dto.value.trim();

    if (!value) {
      throw new BadRequestException('El valor del catálogo es obligatorio');
    }

    try {
      const result = await this.dataSource.query(
        `INSERT INTO repair_catalog_items (catalog_type, value, is_active, sort_order)
         VALUES (?, ?, ?, ?)`,
        [catalogType, value, dto.isActive === false ? 0 : 1, dto.sortOrder ?? 0],
      ) as { insertId?: string | number };

      return this.getCatalogItemOrFail(catalogType, String(result.insertId));
    } catch (error) {
      if (this.isDuplicateEntry(error)) {
        throw new ConflictException('Ese valor ya existe en el catálogo');
      }

      throw error;
    }
  }

  async updateCatalogItem(type: string, id: string, dto: UpdateRepairCatalogItemDto): Promise<RepairCatalogItem> {
    const catalogType = this.parseCatalogType(type);
    const currentItem = await this.getCatalogItemOrFail(catalogType, id);
    const assignments: string[] = [];
    const parameters: unknown[] = [];
    let nextValue: string | undefined;

    if (dto.value !== undefined) {
      nextValue = dto.value.trim();

      if (!nextValue) {
        throw new BadRequestException('El valor del catálogo es obligatorio');
      }

      assignments.push('value = ?');
      parameters.push(nextValue);
    }

    if (dto.isActive !== undefined) {
      assignments.push('is_active = ?');
      parameters.push(dto.isActive ? 1 : 0);
    }

    if (dto.sortOrder !== undefined) {
      assignments.push('sort_order = ?');
      parameters.push(dto.sortOrder);
    }

    if (!assignments.length) {
      return currentItem;
    }

    parameters.push(catalogType, id);

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `UPDATE repair_catalog_items
           SET ${assignments.join(', ')}
           WHERE catalog_type = ? AND id = ?`,
          parameters,
        );

        if (nextValue !== undefined && nextValue !== currentItem.value) {
          const relation = CATALOG_RELATIONS[catalogType];
          await manager.query(
            `UPDATE repairs SET ${relation.textColumn} = ? WHERE ${relation.idColumn} = ?`,
            [nextValue, id],
          );
        }
      });
    } catch (error) {
      if (this.isDuplicateEntry(error)) {
        throw new ConflictException('Ese valor ya existe en el catálogo');
      }

      throw error;
    }

    return this.getCatalogItemOrFail(catalogType, id);
  }

  async deleteCatalogItem(type: string, id: string): Promise<{ deleted: true }> {
    const catalogType = this.parseCatalogType(type);
    await this.getCatalogItemOrFail(catalogType, id);
    const relation = CATALOG_RELATIONS[catalogType];
    const usageRows = await this.dataSource.query<Array<{ total: number | string }>>(
      `SELECT COUNT(*) AS total FROM repairs WHERE ${relation.idColumn} = ?`,
      [id],
    );

    if (Number(usageRows[0]?.total ?? 0) > 0) {
      throw new ConflictException(
        `${relation.label} está relacionado con reportes y no puede eliminarse. Puedes desactivarlo.`,
      );
    }

    const result = await this.dataSource.query(
      `DELETE FROM repair_catalog_items WHERE catalog_type = ? AND id = ?`,
      [catalogType, id],
    ) as { affectedRows?: number };

    if (!result.affectedRows) {
      throw new NotFoundException('Elemento de catálogo no encontrado');
    }

    return { deleted: true };
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

  private async ensureRepairFamilyColumn(): Promise<void> {
    const rows = await this.dataSource.query<Array<{ total: number | string }>>(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'repairs'
         AND COLUMN_NAME = 'family'`,
    );

    if (Number(rows[0]?.total ?? 0) === 0) {
      await this.dataSource.query(
        `ALTER TABLE repairs
         ADD COLUMN family VARCHAR(255) NULL AFTER record_date`,
      );
    }
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

  private async seedCatalogsFromRepairsIfEmpty(): Promise<void> {
    const rows = await this.dataSource.query<Array<{ total: number | string }>>(
      'SELECT COUNT(*) AS total FROM repair_catalog_items',
    );

    if (Number(rows[0]?.total ?? 0) > 0) {
      return;
    }

    for (const type of CATALOG_TYPES) {
      const relation = CATALOG_RELATIONS[type];
      await this.dataSource.query(
        `INSERT IGNORE INTO repair_catalog_items (catalog_type, value)
         SELECT ?, TRIM(${relation.textColumn})
         FROM repairs
         WHERE ${relation.textColumn} IS NOT NULL
           AND TRIM(${relation.textColumn}) <> ''
         GROUP BY TRIM(${relation.textColumn})`,
        [type],
      );
    }
  }

  private async ensureMissingHistoricalCatalogItems(): Promise<void> {
    for (const type of CATALOG_TYPES) {
      const relation = CATALOG_RELATIONS[type];
      await this.dataSource.query(
        `INSERT INTO repair_catalog_items (catalog_type, value, is_active, sort_order)
         SELECT ?, TRIM(r.${relation.textColumn}), 0, 0
         FROM repairs r
         LEFT JOIN repair_catalog_items c
           ON c.catalog_type = ?
          AND LOWER(TRIM(c.value)) = LOWER(TRIM(r.${relation.textColumn}))
         WHERE r.${relation.textColumn} IS NOT NULL
           AND TRIM(r.${relation.textColumn}) <> ''
           AND c.id IS NULL
         GROUP BY TRIM(r.${relation.textColumn})`,
        [type, type],
      );
    }
  }

  private async ensureRepairCatalogRelationColumns(): Promise<void> {
    for (const type of CATALOG_TYPES) {
      const relation = CATALOG_RELATIONS[type];
      const columnRows = await this.dataSource.query<Array<{ total: number | string }>>(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'repairs'
           AND COLUMN_NAME = ?`,
        [relation.idColumn],
      );

      if (Number(columnRows[0]?.total ?? 0) === 0) {
        await this.dataSource.query(
          `ALTER TABLE repairs ADD COLUMN ${relation.idColumn} BIGINT UNSIGNED NULL AFTER ${relation.textColumn}`,
        );
      }

      const indexRows = await this.dataSource.query<Array<{ total: number | string }>>(
        `SELECT COUNT(*) AS total
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'repairs'
           AND INDEX_NAME = ?`,
        [relation.indexName],
      );

      if (Number(indexRows[0]?.total ?? 0) === 0) {
        await this.dataSource.query(
          `ALTER TABLE repairs ADD INDEX ${relation.indexName} (${relation.idColumn})`,
        );
      }
    }
  }

  private async backfillRepairCatalogRelations(): Promise<void> {
    for (const type of CATALOG_TYPES) {
      const relation = CATALOG_RELATIONS[type];
      await this.dataSource.query(
        `UPDATE repairs r
         INNER JOIN repair_catalog_items c
           ON c.catalog_type = ?
          AND LOWER(TRIM(c.value)) = LOWER(TRIM(r.${relation.textColumn}))
         SET r.${relation.idColumn} = c.id
         WHERE r.${relation.idColumn} IS NULL
           AND r.${relation.textColumn} IS NOT NULL
           AND TRIM(r.${relation.textColumn}) <> ''`,
        [type],
      );
    }
  }

  private async ensureRepairCatalogForeignKeys(): Promise<void> {
    for (const type of CATALOG_TYPES) {
      const relation = CATALOG_RELATIONS[type];
      const constraintRows = await this.dataSource.query<Array<{ total: number | string }>>(
        `SELECT COUNT(*) AS total
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = DATABASE()
           AND TABLE_NAME = 'repairs'
           AND CONSTRAINT_TYPE = 'FOREIGN KEY'
           AND CONSTRAINT_NAME = ?`,
        [relation.foreignKeyName],
      );

      if (Number(constraintRows[0]?.total ?? 0) === 0) {
        await this.dataSource.query(
          `ALTER TABLE repairs
           ADD CONSTRAINT ${relation.foreignKeyName}
           FOREIGN KEY (${relation.idColumn})
           REFERENCES repair_catalog_items(id)
           ON UPDATE CASCADE
           ON DELETE RESTRICT`,
        );
      }
    }
  }

  private parseCatalogType(type: string): RepairCatalogType {
    if (!CATALOG_TYPES.includes(type as RepairCatalogType)) {
      throw new BadRequestException('Tipo de catálogo no válido');
    }

    return type as RepairCatalogType;
  }

  private async getCatalogItemOrFail(type: RepairCatalogType, id: string): Promise<RepairCatalogItem> {
    const rows = await this.dataSource.query<RepairCatalogItemRow[]>(
      `SELECT id,
              catalog_type AS catalogType,
              value,
              is_active AS isActive,
              sort_order AS sortOrder,
              created_at AS createdAt,
              updated_at AS updatedAt
       FROM repair_catalog_items
       WHERE catalog_type = ? AND id = ?
       LIMIT 1`,
      [type, id],
    );

    if (!rows.length) {
      throw new NotFoundException('Elemento de catálogo no encontrado');
    }

    return this.normalizeCatalogItem(rows[0]);
  }

  private normalizeCatalogItem(row: RepairCatalogItemRow): RepairCatalogItem {
    return {
      id: String(row.id),
      catalogType: row.catalogType,
      value: row.value,
      isActive: Boolean(row.isActive),
      sortOrder: Number(row.sortOrder),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private isDuplicateEntry(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
  }
}
