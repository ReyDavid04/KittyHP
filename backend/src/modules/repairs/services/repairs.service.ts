import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateRepairCatalogItemDto } from '../dto/create-repair-catalog-item.dto';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairCatalogItemDto } from '../dto/update-repair-catalog-item.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairRepository } from '../repositories/repair.repository';
import { CreateRepairUseCase } from '../use-cases/create-repair.use-case';
import * as XLSX from 'xlsx';
import { unlink } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

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
    await this.dataSource.query('ALTER TABLE repairs MODIFY fail_picture TEXT NULL, MODIFY evidence_picture TEXT NULL');
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

  async confirmImport(records: CreateRepairDto[], userId: number) {
    const saved = [];
    for (const record of records) {
      await this.ensureImportedCatalogValue('family', record.family);
      await this.ensureImportedCatalogValue('top_issue', record.topIssue);
      await this.ensureImportedCatalogValue('category', record.category);
      await this.ensureImportedCatalogValue('major_part', record.majorPart);
      saved.push(await this.create(record, userId));
    }
    return { created: saved.length, records: saved };
  }

  async importWorkbook(buffer: Buffer, createdByUserId: number, preview = false, exclusions: Record<string, string[]> = {}) {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const rawFailRows = this.sheetRows(workbook, 'Station-50_Fail');
    const inputRows = this.sheetRows(workbook, 'Station-50_Input');
    if (!workbook.Sheets['Station-50_Fail'] || !workbook.Sheets['Station-50_Input']) {
      throw new BadRequestException(`El archivo debe contener las pestañas Station-50_Fail y Station-50_Input. Detectadas: ${workbook.SheetNames.join(', ') || 'ninguna'}.`);
    }
    if (!rawFailRows.length) throw new BadRequestException('No se encontraron registros en Station-50_Fail.');
    const excluded = (key: string) => new Set((exclusions[key] ?? []).map((value) => value.trim().toUpperCase()));
    const excludedCause = excluded('cause');
    const excludedMajorPart = excluded('majorPart');
    const excludedShiftFail = excluded('shiftFail');
    const excludedRepeat = excluded('repeat');
    const value = (row: Record<string, unknown>, keys: string[], fallback = '') => this.text(row, keys).trim().toUpperCase() || fallback;
    const failRows = rawFailRows.filter((row) => !excludedCause.has(value(row, ['Cause', 'CAUSE', 'H'])) && !excludedMajorPart.has(value(row, ['MajorPart', 'MAJOR_PART', 'M'])) && !excludedShiftFail.has(value(row, ['Shift Fail', 'SHIFT_FAIL', 'ShiftFail', 'Z'])) && !excludedRepeat.has(value(row, ['Repeat', 'REPEAT', 'Repair Count', 'REPAIR_COUNT', 'AA'], '0')));

    const buildByFamily = new Map<string, number>();
    const defectTotalByFamily = new Map<string, number>();
    failRows.forEach((row) => {
      const family = this.normalizeImportedFamily(this.text(row, ['Family', 'FAMILY']));
      defectTotalByFamily.set(family, (defectTotalByFamily.get(family) ?? 0) + 1);
    });
    inputRows.forEach((row) => {
      const family = this.normalizeImportedFamily(this.text(row, ['Family', 'FAMILY']));
      buildByFamily.set(family, (buildByFamily.get(family) ?? 0) + 1);
    });
    const issueCounts = new Map<string, Map<string, number>>();
    failRows.forEach((row) => {
      const family = this.normalizeImportedFamily(this.text(row, ['Family', 'FAMILY']));
      const issue = this.text(row, ['Top Issue', 'TopIssue', 'Issue', 'FailureDescription', 'FAILURE_DESCRIPTION', 'Failure Description', 'FAILURE DESCRIPTION', 'Failure_Description', 'Description', 'Problem']);
      if (!issue || issue === 'N/A') return;
      const counts = issueCounts.get(family) ?? new Map<string, number>();
      counts.set(issue, (counts.get(issue) ?? 0) + 1);
      issueCounts.set(family, counts);
    });
    const topIssuesByFamily = new Map<string, Set<string>>();
    issueCounts.forEach((counts, family) => {
      const target = (defectTotalByFamily.get(family) ?? 0) * 0.6;
      let accumulated = 0;
      const selected = new Set<string>();
      [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([issue, count]) => {
        if (accumulated < target) { selected.add(issue); accumulated += count; }
      });
      topIssuesByFamily.set(family, selected);
    });
    const grouped = new Map<string, CreateRepairDto>();
    failRows.forEach((row) => {
      const recordDate = this.date(row);
      const familyValue = this.text(row, ['Family', 'FAMILY']) || 'N/A';
      const normalizedFamily = this.normalizeImportedFamily(familyValue);
      const topIssueValue = this.text(row, ['Top Issue', 'TopIssue', 'Issue', 'FailureDescription', 'FAILURE_DESCRIPTION', 'Failure Description', 'FAILURE DESCRIPTION', 'Failure_Description', 'Description', 'Problem']) || 'N/A';
      if (topIssueValue === 'N/A') return;
      if (!topIssuesByFamily.get(normalizedFamily)?.has(topIssueValue)) return;
      const categoryValue = this.normalizeImportedCategory(this.text(row, ['Category', 'CATEGORY', 'Cause', 'CAUSE']));
      const family = familyValue === 'N/A' ? undefined : familyValue;
      const topIssue = topIssueValue === 'N/A' ? undefined : topIssueValue;
      const category = categoryValue === 'N/A' ? undefined : categoryValue;
      const majorPart = this.text(row, ['MajorPart']) || undefined;
      const key = [recordDate, normalizedFamily, topIssue ?? 'N/A', category ?? 'N/A'].join('|').toLowerCase();
      const current = grouped.get(key);
      if (current) current.failureQty = (current.failureQty ?? 0) + 1;
      else grouped.set(key, { recordDate, family: normalizedFamily, topIssue, category, majorPart, failureQty: 1, buildQty: buildByFamily.get(normalizedFamily) ?? inputRows.length, returnYesQty: 0 });
    });
    if (preview) return { preview: true, records: [...grouped.values()], total: grouped.size, exclusionOptions: this.importExclusionOptions(rawFailRows) };
    for (const payload of grouped.values()) {
      await this.ensureImportedCatalogValue('family', payload.family);
      await this.ensureImportedCatalogValue('top_issue', payload.topIssue);
      await this.ensureImportedCatalogValue('category', payload.category);
      await this.ensureImportedCatalogValue('major_part', payload.majorPart);
    }
    const created = [];
    for (const payload of grouped.values()) {
      const existing = await this.dataSource.query<Array<{ id: string }>>(
        `SELECT id FROM repairs WHERE record_date = ? AND LOWER(TRIM(family)) = LOWER(TRIM(?))
         AND LOWER(TRIM(top_issue)) = LOWER(TRIM(?)) AND LOWER(TRIM(category)) = LOWER(TRIM(?)) LIMIT 1`,
        [payload.recordDate, payload.family, payload.topIssue ?? '', payload.category ?? ''],
      );
      if (existing[0]?.id) {
        const updated = await this.repairRepository.update(existing[0].id, {
          failureQty: payload.failureQty,
          buildQty: payload.buildQty,
          majorPart: payload.majorPart,
        });
        if (updated) created.push(updated);
      } else {
        created.push(await this.create(payload, createdByUserId));
      }
    }
    // Imported rows start without a return classification; leave both fields empty
    // until a user explicitly records the return quantities.
    if (created.length) {
      await this.dataSource.query(
        `UPDATE repairs SET return_yes_qty = 0, return_no_qty = 0, return_status = NULL WHERE id IN (${created.map(() => '?').join(',')})`,
        created.map((repair) => repair.id),
      );
    }
    await this.importProductionSnapshot(inputRows, failRows, createdByUserId);
    return { created: created.length, records: created };
  }

  private importExclusionOptions(rows: Record<string, unknown>[]) {
    const collect = (keys: string[], fallback = '') => [...new Set(rows.map((row) => this.text(row, keys).trim() || fallback).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return { cause: collect(['Cause', 'CAUSE', 'H'], 'N/A'), majorPart: collect(['MajorPart', 'MAJOR_PART', 'M'], 'N/A'), shiftFail: collect(['Shift Fail', 'SHIFT_FAIL', 'ShiftFail', 'Z'], 'N/A'), repeat: collect(['Repeat', 'REPEAT', 'Repair Count', 'REPAIR_COUNT', 'AA'], '0') };
  }

  private async importProductionSnapshot(inputRows: Record<string, unknown>[], failRows: Record<string, unknown>[], userId: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const inputByFamily = new Map<string, number>();
    const defectByFamily = new Map<string, number>();
    const allowedTrendFamilies = new Set(['BANFF_V72 1.0', 'BANFF_X72 1.0', 'G12 800', 'GEMTREE', 'MERINO', 'OBAN30']);
    const trendFamily = (value: string) => {
      const raw = value.trim().toUpperCase();
      if (raw.startsWith('MACHU') || raw.startsWith('LAPAZ')) return 'G12 800';
      if (raw.startsWith('GEMTREE')) return 'GEMTREE';
      if (raw.startsWith('MERINO')) return 'MERINO';
      if (raw.startsWith('LAMPAS')) return 'LAMPAS';
      if (raw.startsWith('HELM')) return 'HELM';
      if (raw.startsWith('WAFFLE')) return 'WAFFLE';
      return value.trim() || 'N/A';
    };
    inputRows.forEach((row) => { const family = trendFamily(this.text(row, ['Family', 'FAMILY'])); inputByFamily.set(family, (inputByFamily.get(family) ?? 0) + 1); });
    failRows.forEach((row) => { const family = trendFamily(this.text(row, ['Family', 'FAMILY'])); defectByFamily.set(family, (defectByFamily.get(family) ?? 0) + 1); });
    for (const [name, input] of inputByFamily) {
      if (!allowedTrendFamilies.has(name)) continue;
      const defects = defectByFamily.get(name) ?? 0;
      await this.dataSource.query(
        `INSERT INTO production_series (name, is_active, sort_order) VALUES (?, 1, 99) ON DUPLICATE KEY UPDATE is_active = 1`, [name],
      );
      await this.dataSource.query(
        `INSERT INTO production_defect_entries (production_series_id, record_date, input_quantity, defect_quantity, created_by_user_id, updated_by_user_id)
         SELECT id, ?, ?, ?, ?, ? FROM production_series WHERE name = ?
         ON DUPLICATE KEY UPDATE input_quantity = VALUES(input_quantity), defect_quantity = VALUES(defect_quantity), updated_by_user_id = VALUES(updated_by_user_id)`,
        [today, input, defects, userId, userId, name],
      );
    }
  }

  private async ensureImportedCatalogValue(type: RepairCatalogType, value?: string): Promise<void> {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized === 'N/A') return;
    await this.ensureCatalogTable();
    await this.dataSource.query(
      `INSERT IGNORE INTO repair_catalog_items (catalog_type, value, is_active, sort_order)
       SELECT ?, ?, 1, COALESCE(MAX(sort_order), 0) + 1
       FROM repair_catalog_items
       WHERE catalog_type = ?
       AND NOT EXISTS (
         SELECT 1 FROM repair_catalog_items existing
         WHERE existing.catalog_type = ? AND LOWER(TRIM(existing.value)) = LOWER(TRIM(?))
       )`,
      [type, normalized, type, type, normalized],
    );
  }

  private sheetRows(workbook: XLSX.WorkBook, name: string): Record<string, unknown>[] {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) : [];
  }

  private text(row: Record<string, unknown>, keys: string[]): string {
    const key = keys.find((candidate) => row[candidate] !== undefined);
    return String(key ? row[key] ?? '' : '').trim();
  }

  private normalizeImportedFamily(value: string): string {
    const family = value.trim().toUpperCase();
    if (!family) return 'N/A';
    if (family.startsWith('MACHU') || family.startsWith('LAPAZ')) return 'G12 800';
    if (family.startsWith('MERINO')) return 'MERINO';
    if (family.startsWith('GEMTREE')) return 'GEMTREE';
    if (family.startsWith('CHIRON')) return 'CHIRON';
    return family.split(/\s+/)[0];
  }

  private normalizeImportedCategory(value: string): string {
    const category = value.trim().toUpperCase();
    if (category === 'BM' || category === 'MB' || category.includes('MOTHERBOARD')) return 'Motherboard';
    if (category === 'DB' || category.includes('DAUGHTER')) return 'Daughter board';
    if (category === 'BP' || category.includes('MATERIAL')) return 'Material';
    if (category === 'WW' || category === 'NN' || category.includes('WW/NN')) return 'WW/NN';
    if (category === 'PA' || category.includes('ASSEMBLY')) return 'Poor Assembly';
    if (category === 'CM' || category.includes('COSMETIC')) return 'Cosmetic';
    return value.trim() || 'N/A';
  }

  private date(row: Record<string, unknown>): string {
    const value = row.Date ?? row.DATE ?? row.RecordDate ?? new Date();
    if (typeof value === 'number') {
      const serialDate = new Date(Date.UTC(1899, 11, 30 + value));
      return serialDate.toISOString().slice(0, 10);
    }
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }

  setReview(id: string, review: boolean) {
    return this.repairRepository.setReview(id, review);
  }

  update(id: string, updateRepairDto: UpdateRepairDto) {
    return this.repairRepository.update(id, updateRepairDto);
  }

  async delete(id: string): Promise<boolean> {
    const repair = await this.repairRepository.findById(id);
    if (!repair) return false;

    const pathsToDelete = [...this.imagePaths(repair.failPicture), ...this.imagePaths(repair.evidencePicture)];
    const otherRows = await this.dataSource.query<Array<{ fail_picture: string | null; evidence_picture: string | null }>>(
      'SELECT fail_picture, evidence_picture FROM repairs WHERE id <> ?',
      [id],
    );
    const pathsStillUsed = new Set(otherRows.flatMap((row) => [
      ...this.imagePaths(row.fail_picture),
      ...this.imagePaths(row.evidence_picture),
    ]));

    const deleted = await this.repairRepository.delete(id);
    if (!deleted) return false;

    await Promise.all(pathsToDelete
      .filter((imagePath) => !pathsStillUsed.has(imagePath))
      .map((imagePath) => unlink(resolve(process.cwd(), imagePath.replace(/^\/+/, ''))).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      })));
    return true;
  }

  private imagePaths(value: string | null | undefined): string[] {
    if (!value) return [];
    let paths: unknown = value;
    try { paths = JSON.parse(value); } catch { /* legacy single path */ }
    const candidates = Array.isArray(paths) ? paths : [paths];
    return candidates.filter((item): item is string => typeof item === 'string' && item.startsWith('/uploads/'))
      .map((item) => `/uploads/${basename(item)}`);
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
