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
export type ProductionSnapshot = { recordDate: string; segments: Array<{ name: string; inputQuantity: number; defectQuantity: number }> };

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

  async confirmImport(records: CreateRepairDto[], userId: number, productionSnapshot?: ProductionSnapshot) {
    const saved = [];
    for (const record of records) {
      await this.ensureImportedCatalogValue('family', record.family);
      await this.ensureImportedCatalogValue('top_issue', record.topIssue);
      await this.ensureImportedCatalogValue('category', record.category);
      await this.ensureImportedCatalogValue('major_part', record.majorPart);
      // Imports are idempotent: the same file/date/segment/issue/category
      // updates the existing report instead of creating a duplicate row.
      const existing = await this.dataSource.query<Array<{ id: string }>>(
        `SELECT id FROM repairs
         WHERE record_date = ?
           AND LOWER(TRIM(family)) = LOWER(TRIM(?))
           AND LOWER(TRIM(top_issue)) = LOWER(TRIM(?))
           AND LOWER(TRIM(category)) = LOWER(TRIM(?))
         LIMIT 1`,
        [record.recordDate, record.family ?? '', record.topIssue ?? '', record.category ?? ''],
      );
      if (existing[0]?.id) {
        const updated = await this.repairRepository.update(existing[0].id, {
          failureQty: record.failureQty,
          buildQty: record.buildQty,
          majorPart: record.majorPart,
        });
        if (updated) saved.push(updated);
      } else {
        saved.push(await this.create(record, userId));
      }
    }
    if (productionSnapshot?.segments?.length) await this.importProductionSnapshot(productionSnapshot, userId);
    return { created: saved.length, records: saved };
  }

  async importWorkbook(buffer: Buffer, createdByUserId: number, preview = false, exclusions: Record<string, string[]> = {}, fileName = '') {
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
    // Keep the same fallbacks as the original Análisis 60% interface.
    // In particular, an empty Cause/MajorPart/Shift must be comparable to
    // the visible N/A exclusion option, rather than silently bypassing it.
    const failRows = rawFailRows.filter((row) => !excludedCause.has(value(row, ['Cause', 'CAUSE', 'H'], 'N/A')) && !excludedMajorPart.has(value(row, ['MajorPart', 'MAJOR_PART', 'M'], 'N/A')) && !excludedShiftFail.has(value(row, ['Shift Fail', 'SHIFT_FAIL', 'ShiftFail', 'Z'], 'N/A')) && !excludedRepeat.has(value(row, ['Repeat', 'REPEAT', 'Repair Count', 'REPAIR_COUNT', 'AA'], '0')));

    // La selección Pareto debe reproducir la interfaz original de Análisis 60%:
    // primero segmenta, después obtiene el 60% por descripción y finalmente
    // ordena los resultados por categoría y por cantidad dentro de la categoría.
    const buildByFamily = new Map<string, number>();
    const failRowsByFamily = new Map<string, Record<string, unknown>[]>();
    failRows.forEach((row) => {
      const family = this.normalizeImportedFamily(this.text(row, ['Family']) || this.text(row, ['FAMILY']));
      const rows = failRowsByFamily.get(family) ?? [];
      rows.push(row);
      failRowsByFamily.set(family, rows);
    });
    inputRows.forEach((row) => {
      const family = this.normalizeImportedFamily(this.text(row, ['Family']) || this.text(row, ['FAMILY']));
      buildByFamily.set(family, (buildByFamily.get(family) ?? 0) + 1);
    });
    const grouped = new Map<string, CreateRepairDto>();
    const categoryDefinitions = [
      { label: 'Motherboard', codes: ['BM', 'MB'] },
      { label: 'Daughter board', codes: ['DB'] },
      { label: 'Material', codes: ['BP'] },
      { label: 'WW/NN', codes: ['WW', 'NN'] },
      { label: 'Poor Assembly', codes: ['PA'] },
      { label: 'Cosmetic', codes: ['CM'] },
      { label: 'PENDING REPAIR / OTHERS', codes: [] },
    ];
    const analysisSummary: Record<string, { prioritizedQty: number; totalDefects: number }> = {};

    failRowsByFamily.forEach((familyRows, family) => {
      const issueCounts = new Map<string, number>();
      familyRows.forEach((row) => {
        const issue = this.importedIssue(row);
        if (issue !== 'N/A') issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      });

      const target = familyRows.length * 0.6;
      const topIssues = new Set<string>();
      let accumulated = 0;
      // The reference Análisis 60% view resolves equal quantities
      // deterministically. Keep the quantity as the primary ordering and
      // use the issue text as a stable tie-breaker so the boundary item is
      // the same regardless of worksheet row order.
      for (const [issue, count] of [...issueCounts.entries()].sort((a, b) => {
        const quantityOrder = b[1] - a[1];
        return quantityOrder || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
      })) {
        topIssues.add(issue);
        accumulated += count;
        if (accumulated >= target) break;
      }

      const prioritizedQty = familyRows.reduce((sum, row) => {
        return topIssues.has(this.importedIssue(row)) ? sum + 1 : sum;
      }, 0);
      analysisSummary[family] = { prioritizedQty, totalDefects: familyRows.length };

      categoryDefinitions.forEach((definition) => {
        const categorizedRows = familyRows.filter((row) => {
          const cause = this.importedCause(row);
          return definition.codes.length
            ? definition.codes.includes(cause)
            : !cause || !categoryDefinitions.some((category) => category.codes.includes(cause));
        });
        const issuesInCategory = new Map<string, { count: number; first: Record<string, unknown>; rows: Record<string, unknown>[] }>();
        categorizedRows.forEach((row) => {
          const issue = this.importedIssue(row);
          if (issue === 'N/A' || !topIssues.has(issue)) return;
          const current = issuesInCategory.get(issue);
          if (current) { current.count += 1; current.rows.push(row); }
          else issuesInCategory.set(issue, { count: 1, first: row, rows: [row] });
        });

        [...issuesInCategory.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .forEach(([topIssue, { count, first, rows }]) => {
            const recordDate = this.dateFromImportFilename(fileName) ?? this.date(first);
            const majorPart = this.text(first, ['MajorPart', 'MAJOR_PART', 'M']) || undefined;
            const key = [recordDate, family, topIssue, definition.label].join('|').toLowerCase();
            grouped.set(key, {
              recordDate,
              family,
              topIssue,
              category: definition.label,
              majorPart,
              failureQty: count,
              buildQty: buildByFamily.get(family) ?? inputRows.length,
              details: rows.map((row) => ({
                custsn: this.text(row, ['CUSTSN']),
                family: this.text(row, ['Family', 'FAMILY']),
                remark: this.text(row, ['Remark', 'REMARK']),
              })),
            });
          });
      });
    });
    const productionSnapshot = this.buildProductionSnapshot(inputRows, failRows, this.dateFromImportFilename(fileName) ?? new Date().toISOString().slice(0, 10));
    if (preview) {
      // Preview must remain read-only and fast. Catalog values are ensured
      // during confirmation, not once per preview recalculation.
      return { preview: true, records: [...grouped.values()], total: grouped.size, analysisSummary, exclusionOptions: this.importExclusionOptions(rawFailRows), productionSnapshot };
    }
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
    await this.importProductionSnapshot(productionSnapshot, createdByUserId);
    return { created: created.length, records: created };
  }

  private importExclusionOptions(rows: Record<string, unknown>[]) {
    const collect = (keys: string[], fallback = '') => [...new Set(rows.map((row) => this.text(row, keys).trim() || fallback).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return { cause: collect(['Cause', 'CAUSE', 'H'], 'N/A'), majorPart: collect(['MajorPart', 'MAJOR_PART', 'M'], 'N/A'), shiftFail: collect(['Shift Fail', 'SHIFT_FAIL', 'ShiftFail', 'Z'], 'N/A'), repeat: collect(['Repeat', 'REPEAT', 'Repair Count', 'REPAIR_COUNT', 'AA'], '0') };
  }

  private buildProductionSnapshot(inputRows: Record<string, unknown>[], failRows: Record<string, unknown>[], recordDate: string): ProductionSnapshot {
    const inputByFamily = new Map<string, number>();
    const defectByFamily = new Map<string, number>();
    // Overall FPF Trend is intentionally limited to the seven canonical
    // production segments shown in the dashboard.
    const allowedTrendFamilies = new Set(['G12 800', 'CHIRON', 'GEMTREE 16', 'GEMTREE 18', 'MERINO', 'LAMPAS', 'CASHMERE']);
    const trendFamily = (value: string) => {
      const raw = value.trim().toUpperCase();
      if (raw.startsWith('MACHU') || raw.startsWith('LAPAZ')) return 'G12 800';
      if (raw.startsWith('CHIRON')) return 'CHIRON';
      if (raw.startsWith('GEMTREE 16') || raw.startsWith('GEMTREE16')) return 'GEMTREE 16';
      if (raw.startsWith('GEMTREE 18') || raw.startsWith('GEMTREE18')) return 'GEMTREE 18';
      if (raw.startsWith('MERINO')) return 'MERINO';
      if (raw.startsWith('LAMPAS')) return 'LAMPAS';
      if (raw.startsWith('CASHMERE')) return 'CASHMERE';
      return value.trim() || 'N/A';
    };
    inputRows.forEach((row) => { const family = trendFamily(this.text(row, ['Family', 'FAMILY'])); inputByFamily.set(family, (inputByFamily.get(family) ?? 0) + 1); });
    failRows.forEach((row) => { const family = trendFamily(this.text(row, ['Family', 'FAMILY'])); defectByFamily.set(family, (defectByFamily.get(family) ?? 0) + 1); });
    return { recordDate, segments: [...inputByFamily.entries()].filter(([name]) => allowedTrendFamilies.has(name)).map(([name, inputQuantity]) => ({ name, inputQuantity, defectQuantity: defectByFamily.get(name) ?? 0 })) };
  }

  private async importProductionSnapshot(snapshot: ProductionSnapshot, userId: number): Promise<void> {
    for (const { name, inputQuantity: input, defectQuantity: defects } of snapshot.segments) {
      await this.dataSource.query(
        `INSERT INTO production_series (name, is_active, sort_order) VALUES (?, 1, 99) ON DUPLICATE KEY UPDATE is_active = 1`, [name],
      );
      await this.dataSource.query(
        `INSERT INTO production_defect_entries (production_series_id, record_date, input_quantity, defect_quantity, created_by_user_id, updated_by_user_id)
         SELECT id, ?, ?, ?, ?, ? FROM production_series WHERE name = ?
         ON DUPLICATE KEY UPDATE input_quantity = VALUES(input_quantity), defect_quantity = VALUES(defect_quantity), updated_by_user_id = VALUES(updated_by_user_id)`,
        [snapshot.recordDate, input, defects, userId, userId, name],
      );
    }
  }

  private async ensureImportedCatalogValue(type: RepairCatalogType, value?: string): Promise<void> {
    const normalized = String(value ?? '').trim();
    if (!normalized || normalized === 'N/A') return;
    await this.ensureCatalogTable();
    await this.dataSource.query(
      `INSERT INTO repair_catalog_items (catalog_type, value, is_active, sort_order)
       SELECT ?, ?, 1, COALESCE(MAX(sort_order), 0) + 1
       FROM repair_catalog_items
       WHERE catalog_type = ?
       ON DUPLICATE KEY UPDATE value = VALUES(value), is_active = 1`,
      [type, normalized, type],
    );
  }

  private sheetRows(workbook: XLSX.WorkBook, name: string): Record<string, unknown>[] {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) : [];
  }

  private text(row: Record<string, unknown>, keys: string[]): string {
    const normalizeHeader = (value: string) => value.replace(/[\s_\-]+/g, '').toUpperCase();
    const candidates = new Set(keys.map(normalizeHeader));
    const key = Object.keys(row).find((candidate) => candidates.has(normalizeHeader(candidate)));
    return String(key ? row[key] ?? '' : '').trim();
  }

  private normalizeImportedFamily(value: string): string {
    const family = value.trim().toUpperCase();
    if (!family) return 'N/A';
    if (family.includes('MERINO')) return 'MERINO';
    if (family.startsWith('MACHU') || family.startsWith('LAPAZ')) return 'G12 800';
    if (family.startsWith('GEMTREE 16')) return 'GEMTREE 16';
    if (family.startsWith('GEMTREE 18')) return 'GEMTREE 18';
    if (family.startsWith('GEMTREE')) return 'GEMTREE';
    if (family.startsWith('CHIRON')) return 'CHIRON';
    if (family.startsWith('LAMPAS')) return 'LAMPAS';
    if (family.startsWith('CASHMERE')) return 'CASHMERE';
    return family.split(/\s+/)[0];
  }

  private importedIssue(row: Record<string, unknown>): string {
    // Análisis 60% usa exactamente FailureDescription/FAILURE_DESCRIPTION.
    // No se debe priorizar una columna "Top Issue" cuando ambas existen.
    const failureDescription = this.text(row, ['FailureDescription']) || this.text(row, ['FAILURE_DESCRIPTION']);
    return failureDescription && failureDescription !== 'N/A' ? failureDescription : 'N/A';
  }

  private importedCause(row: Record<string, unknown>): string {
    return (this.text(row, ['Cause']) || this.text(row, ['CAUSE']) || this.text(row, ['H'])).toUpperCase();
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

  private dateFromImportFilename(fileName: string): string | null {
    const match = fileName.match(/(?:reporte\s*)?(\d{2})\s+(\d{2})/i);
    if (!match) return null;
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = new Date().getFullYear();
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
