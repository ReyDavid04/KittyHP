import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairEntity } from '../entities/repair.entity';

type RepairCatalogType = 'family' | 'top_issue' | 'category' | 'major_part' | 'failure_factor';
type CatalogReferenceRow = { id: string | number; value: string };
type CatalogReference = { id: string; value: string };

const CATALOG_LABELS: Record<RepairCatalogType, string> = {
  family: 'Family',
  top_issue: 'Top Issue',
  category: 'Category',
  major_part: 'Major Part',
  failure_factor: 'Failure Factor',
};

function calculateFrPercentage(failureQty: number, buildQty: number): string {
  if (!Number.isFinite(failureQty) || !Number.isFinite(buildQty) || failureQty < 0 || buildQty < 0) {
    throw new BadRequestException('Failure qty y Build qty deben ser números válidos.');
  }

  if (buildQty === 0) {
    return '0.00';
  }

  const frPercentage = Number(((failureQty / buildQty) * 100).toFixed(2));
  if (frPercentage <= 0) {
    throw new BadRequestException('El F/R calculado debe ser mayor a 0.00%.');
  }

  return frPercentage.toFixed(2);
}

function parseDetails(value: unknown): Record<string, string>[] {
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    const detail = item as Record<string, unknown>;
    return {
      custsn: String(detail?.custsn ?? detail?.CUSTSN ?? '').trim(),
      family: String(detail?.family ?? detail?.Family ?? '').trim(),
      remark: String(detail?.remark ?? detail?.Remark ?? '').trim(),
      category: String(detail?.category ?? detail?.Category ?? '').trim(),
    };
  });
}

function calculateReturnQuantities(failureQty: number, returnYesQty: number, manualReturnNoQty?: number): { returnYesQty: number; returnNoQty: number } {
  if (!Number.isInteger(failureQty) || failureQty < 0) {
    throw new BadRequestException('Failure qty debe ser un número entero válido.');
  }

  if (!Number.isInteger(returnYesQty) || returnYesQty < 0) {
    throw new BadRequestException('Return Yes debe ser un número entero igual o mayor que cero.');
  }

  if (returnYesQty > failureQty) {
    throw new BadRequestException('Return Yes no puede ser mayor que Failure qty.');
  }

  if (manualReturnNoQty !== undefined && (!Number.isInteger(manualReturnNoQty) || manualReturnNoQty < 0 || manualReturnNoQty > failureQty)) {
    throw new BadRequestException('Return No debe ser un entero entre 0 y Failure qty.');
  }

  return {
    returnYesQty,
    returnNoQty: manualReturnNoQty ?? failureQty - returnYesQty,
  };
}

function catalogValuesEqual(currentValue: string | null, nextValue: string | null | undefined): boolean {
  return String(currentValue ?? '').trim().toLocaleLowerCase()
    === String(nextValue ?? '').trim().toLocaleLowerCase();
}

@Injectable()
export class RepairRepository implements OnModuleInit {
  constructor(
    @InjectRepository(RepairEntity)
    private readonly repository: Repository<RepairEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCreatedByUserIdColumn();
    await this.ensureReviewColumn();
    await this.ensureNullableReturnColumns();
  }

  async setReview(id: string, review: boolean): Promise<RepairEntity | null> {
    await this.ensureReviewColumn();
    await this.repository.update(id, { review });
    return this.repository.findOne({ where: { id } });
  }

  private async ensureReviewColumn(): Promise<void> {
    const columns = await this.dataSource.query<{ Field: string }[]>('SHOW COLUMNS FROM repairs LIKE \'review\'');
    if (!columns.length) {
      await this.dataSource.query('ALTER TABLE repairs ADD COLUMN review BOOLEAN NOT NULL DEFAULT FALSE AFTER id');
    }
  }

  private async ensureNullableReturnColumns(): Promise<void> {
    await this.dataSource.query('ALTER TABLE repairs MODIFY COLUMN return_yes_qty INT UNSIGNED NULL DEFAULT NULL');
    await this.dataSource.query('ALTER TABLE repairs MODIFY COLUMN return_no_qty INT UNSIGNED NULL DEFAULT NULL');
  }

  async create(data: CreateRepairDto, createdByUserId: number): Promise<RepairEntity> {
    const failureQty = data.failureQty ?? 0;
    const buildQty = data.buildQty ?? 0;
    const frPercentage = calculateFrPercentage(failureQty, buildQty);
    const returns = data.returnYesQty === undefined || data.returnYesQty === null
      ? null
      : calculateReturnQuantities(
        failureQty,
        data.returnYesQty,
        data.returnNoManual ? (data.returnNoQty ?? undefined) : undefined,
      );
    const returnStatus = returns ? `Yes: ${returns.returnYesQty} | No: ${returns.returnNoQty}` : null;
    const [family, topIssue, category, majorPart, failureFactor] = await Promise.all([
      this.resolveCatalogReference('family', data.family, false),
      this.resolveCatalogReference('top_issue', data.topIssue, false),
      this.resolveCatalogReference('category', data.category, false),
      this.resolveCatalogReference('major_part', data.majorPart, false),
      this.resolveCatalogReference('failure_factor', data.failureFactor, false),
    ]);

    const entity = this.repository.create({
      recordDate: data.recordDate ?? new Date().toISOString().slice(0, 10),
      family: family?.value ?? 'N/A',
      familyCatalogItemId: family?.id ?? null,
      topIssue: topIssue?.value ?? 'N/A',
      topIssueCatalogItemId: topIssue?.id ?? null,
      failureQty,
      buildQty,
      frPercentage,
      category: category?.value ?? 'N/A',
      categoryCatalogItemId: category?.id ?? null,
      returnStatus,
      returnYesQty: returns?.returnYesQty ?? null,
      returnNoQty: returns?.returnNoQty ?? null,
      failPicture: data.failPicture ?? null,
      majorPart: majorPart?.value ?? null,
      majorPartCatalogItemId: majorPart?.id ?? null,
      repairResult: data.repairResult ?? null,
      failureFactor: failureFactor?.value ?? null,
      failureFactorCatalogItemId: failureFactor?.id ?? null,
      actions: data.actions ?? null,
      evidencePicture: data.evidencePicture ?? null,
      createdByUserId,
      sourcePayload: {
        ...(data as unknown as Record<string, unknown>),
        family: family?.value ?? 'N/A',
        familyCatalogItemId: family?.id ?? null,
        topIssue: topIssue?.value ?? 'N/A',
        topIssueCatalogItemId: topIssue?.id ?? null,
        category: category?.value ?? 'N/A',
        categoryCatalogItemId: category?.id ?? null,
        majorPart: majorPart?.value ?? null,
        majorPartCatalogItemId: majorPart?.id ?? null,
        failureFactor: failureFactor?.value ?? null,
        failureFactorCatalogItemId: failureFactor?.id ?? null,
        frPercentage: Number(frPercentage),
        returnYesQty: returns?.returnYesQty ?? null,
        returnNoQty: returns?.returnNoQty ?? null,
        returnNoManual: Boolean(data.returnNoManual),
        createdByUserId,
        details: parseDetails(data.details),
      },
    });

    return this.repository.save(entity);
  }

  async findById(id: string): Promise<RepairEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, data: UpdateRepairDto): Promise<RepairEntity | null> {
    const entity = await this.findById(id);

    if (!entity) {
      return null;
    }

    const incomingDetails = data.details !== undefined ? parseDetails(data.details) : null;
    const reassigned = incomingDetails?.length ? await this.reassignDetailCategories(entity, incomingDetails) : null;
    if (reassigned) return reassigned;

    if (data.recordDate !== undefined) entity.recordDate = data.recordDate;

    if (data.family !== undefined && !catalogValuesEqual(entity.family, data.family)) {
      const reference = await this.resolveCatalogReference('family', data.family, true);
      entity.family = reference!.value;
      entity.familyCatalogItemId = reference!.id;
    }

    if (data.topIssue !== undefined && !catalogValuesEqual(entity.topIssue, data.topIssue)) {
      const reference = await this.resolveCatalogReference('top_issue', data.topIssue, true);
      entity.topIssue = reference!.value;
      entity.topIssueCatalogItemId = reference!.id;
    }

    if (data.failureQty !== undefined) entity.failureQty = data.failureQty;
    if (data.buildQty !== undefined) entity.buildQty = data.buildQty;
    const hasValidQuantities = entity.failureQty > 0 && entity.buildQty > 0;
    if (hasValidQuantities) entity.frPercentage = calculateFrPercentage(entity.failureQty, entity.buildQty);

    if (data.category !== undefined && !catalogValuesEqual(entity.category, data.category)) {
      const reference = await this.resolveCatalogReference('category', data.category, true);
      entity.category = reference!.value;
      entity.categoryCatalogItemId = reference!.id;
    }

    if (hasValidQuantities && (data.returnYesQty !== undefined || data.returnNoQty !== undefined || data.returnNoManual !== undefined)) {
      if (data.returnYesQty === null) {
        entity.returnYesQty = null;
        entity.returnNoQty = null;
        entity.returnStatus = null;
      } else {
        const returnYesQty = data.returnYesQty ?? entity.returnYesQty ?? 0;
        const manualReturnNoQty = data.returnNoManual ? (data.returnNoQty ?? entity.returnNoQty ?? 0) : undefined;
        const returns = calculateReturnQuantities(entity.failureQty, returnYesQty, manualReturnNoQty);
        entity.returnYesQty = returns.returnYesQty;
        entity.returnNoQty = returns.returnNoQty;
        entity.returnStatus = `Yes: ${returns.returnYesQty} | No: ${returns.returnNoQty}`;
      }
    }

    if (data.failPicture !== undefined) entity.failPicture = data.failPicture ?? null;

    if (data.majorPart !== undefined && !catalogValuesEqual(entity.majorPart, data.majorPart)) {
      const reference = await this.resolveCatalogReference('major_part', data.majorPart, false);
      entity.majorPart = reference?.value ?? null;
      entity.majorPartCatalogItemId = reference?.id ?? null;
    }

    if (data.repairResult !== undefined) entity.repairResult = data.repairResult ?? null;

    if (data.failureFactor !== undefined && !catalogValuesEqual(entity.failureFactor, data.failureFactor)) {
      const reference = await this.resolveCatalogReference('failure_factor', data.failureFactor, false);
      entity.failureFactor = reference?.value ?? null;
      entity.failureFactorCatalogItemId = reference?.id ?? null;
    }

    if (data.actions !== undefined) entity.actions = data.actions ?? null;
    if (data.evidencePicture !== undefined) entity.evidencePicture = data.evidencePicture ?? null;

    entity.sourcePayload = {
      ...(entity.sourcePayload ?? {}),
      ...data,
      family: entity.family,
      familyCatalogItemId: entity.familyCatalogItemId,
      topIssue: entity.topIssue,
      topIssueCatalogItemId: entity.topIssueCatalogItemId,
      category: entity.category,
      categoryCatalogItemId: entity.categoryCatalogItemId,
      majorPart: entity.majorPart,
      majorPartCatalogItemId: entity.majorPartCatalogItemId,
      failureFactor: entity.failureFactor,
      failureFactorCatalogItemId: entity.failureFactorCatalogItemId,
      frPercentage: Number(entity.frPercentage),
      returnYesQty: entity.returnYesQty,
      returnNoQty: entity.returnNoQty,
      returnNoManual: Boolean(data.returnNoManual ?? entity.sourcePayload?.['returnNoManual']),
      createdByUserId: entity.createdByUserId,
      details: data.details !== undefined ? parseDetails(data.details) : ((entity.sourcePayload?.['details'] as Record<string, string>[] | undefined) ?? []),
    };

    return this.repository.save(entity);
  }

  /**
   * Reassigns detail units by category. A repair is a group identified by
   * Date + Family + Top Issue + Category, so a category change can move a
   * unit into an existing group or create a new one.
   */
  private async reassignDetailCategories(entity: RepairEntity, incomingDetails: Record<string, string>[]): Promise<RepairEntity | null> {
    // Details imported before category editing may not have a category value yet;
    // treat those units as belonging to the current parent group.
    const detailsWithCategory = incomingDetails.map((detail) => ({
      ...detail,
      category: String(detail.category ?? '').trim() || entity.category,
    }));
    const categories = [...new Set(detailsWithCategory.map((detail) => detail.category).filter(Boolean))];
    if (!categories.length || categories.every((category) => catalogValuesEqual(category, entity.category))) return null;

    const sourceCategory = detailsWithCategory.find((detail) => catalogValuesEqual(detail.category, entity.category))?.category ?? entity.category;
    const sourceDetails = detailsWithCategory.filter((detail) => catalogValuesEqual(detail.category, sourceCategory));
    const movedGroups = categories.filter((category) => !catalogValuesEqual(category, sourceCategory));
    if (!movedGroups.length) return null;

    const sourceCategoryRef = await this.resolveCatalogReference('category', sourceCategory, true);
    let destination: RepairEntity | null = null;
    for (const category of movedGroups) {
      const details = detailsWithCategory.filter((detail) => catalogValuesEqual(detail.category, category));
      if (!details.length) continue;
      const targetCategoryRef = await this.resolveCatalogReference('category', category, true);
      const target = await this.repository.findOne({
        where: {
          recordDate: entity.recordDate,
          family: entity.family ?? undefined,
          topIssue: entity.topIssue,
          category: targetCategoryRef!.value,
        },
      });
      if (target && target.id !== entity.id) {
        target.failureQty += details.length;
        target.returnNoQty = Math.max(0, target.failureQty - (target.returnYesQty ?? 0));
        target.returnStatus = `Yes: ${target.returnYesQty ?? 0} | No: ${target.returnNoQty}`;
        target.frPercentage = calculateFrPercentage(target.failureQty, target.buildQty);
        target.sourcePayload = {
          ...(target.sourcePayload ?? {}),
          category: targetCategoryRef!.value,
          categoryCatalogItemId: targetCategoryRef!.id,
          failureQty: target.failureQty,
          frPercentage: Number(target.frPercentage),
          returnNoQty: target.returnNoQty,
          details: [...parseDetails(target.sourcePayload?.['details']), ...details],
        };
        destination = await this.repository.save(target);
      } else if (!target) {
        // Keep the reassigned units even when no destination group exists yet.
        const created: RepairEntity = this.repository.create({
          ...(entity as any),
          id: undefined,
          category: targetCategoryRef!.value,
          categoryCatalogItemId: targetCategoryRef!.id,
          failureQty: details.length,
          returnYesQty: 0,
          returnNoQty: details.length,
          returnStatus: `Yes: 0 | No: ${details.length}`,
          frPercentage: calculateFrPercentage(details.length, entity.buildQty),
          sourcePayload: {
            ...(entity.sourcePayload ?? {}),
            category: targetCategoryRef!.value,
            categoryCatalogItemId: targetCategoryRef!.id,
            failureQty: details.length,
            frPercentage: Number(calculateFrPercentage(details.length, entity.buildQty)),
            returnYesQty: 0,
            returnNoQty: details.length,
            details,
          },
        } as RepairEntity);
        destination = await this.repository.save(created);
      }
    }

    // All units were reassigned: the original group must not remain as an
    // empty repair with a stale quantity.
    if (!sourceDetails.length) {
      await this.repository.delete(entity.id);
      return destination;
    }

    entity.failureQty = sourceDetails.length;
    entity.category = sourceCategoryRef!.value;
    entity.categoryCatalogItemId = sourceCategoryRef!.id;
    entity.returnYesQty = Math.min(entity.returnYesQty ?? 0, entity.failureQty);
    entity.returnNoQty = Math.max(0, entity.failureQty - (entity.returnYesQty ?? 0));
    entity.returnStatus = `Yes: ${entity.returnYesQty ?? 0} | No: ${entity.returnNoQty}`;
    entity.frPercentage = calculateFrPercentage(entity.failureQty, entity.buildQty);
    entity.sourcePayload = {
      ...(entity.sourcePayload ?? {}),
      category: entity.category,
      categoryCatalogItemId: entity.categoryCatalogItemId,
      failureQty: entity.failureQty,
      frPercentage: Number(entity.frPercentage),
      returnYesQty: entity.returnYesQty,
      returnNoQty: entity.returnNoQty,
      details: sourceDetails,
    };
    return this.repository.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  findAll(): Promise<RepairEntity[]> {
    return this.repository.find({ order: { recordDate: 'DESC', id: 'DESC' } });
  }

  private async resolveCatalogReference(
    type: RepairCatalogType,
    value: string | null | undefined,
    required: boolean,
  ): Promise<CatalogReference | null> {
    const normalizedValue = String(value ?? '').trim();

    if (!normalizedValue) {
      if (required) {
        throw new BadRequestException(`${CATALOG_LABELS[type]} es obligatorio.`);
      }
      return null;
    }

    const rows = await this.dataSource.query<CatalogReferenceRow[]>(
      `SELECT id, value
       FROM repair_catalog_items
       WHERE catalog_type = ?
         AND is_active = 1
         AND LOWER(TRIM(value)) = LOWER(?)
       LIMIT 1`,
      [type, normalizedValue],
    );

    if (!rows.length) {
      throw new BadRequestException(
        `${CATALOG_LABELS[type]} "${normalizedValue}" no existe o está inactivo en el catálogo.`,
      );
    }

    return {
      id: String(rows[0].id),
      value: rows[0].value,
    };
  }

  private async ensureCreatedByUserIdColumn(): Promise<void> {
    const columns = await this.dataSource.query<Array<{ total: number | string }>>(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'repairs'
         AND COLUMN_NAME = 'created_by_user_id'`,
    );

    if (Number(columns[0]?.total ?? 0) === 0) {
      await this.dataSource.query(
        `ALTER TABLE repairs
         ADD COLUMN created_by_user_id INT UNSIGNED NULL AFTER evidence_picture`,
      );
    }

    const indexes = await this.dataSource.query<Array<{ total: number | string }>>(
      `SELECT COUNT(*) AS total
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'repairs'
         AND INDEX_NAME = 'idx_repairs_created_by_user_id'`,
    );

    if (Number(indexes[0]?.total ?? 0) === 0) {
      await this.dataSource.query(
        'ALTER TABLE repairs ADD INDEX idx_repairs_created_by_user_id (created_by_user_id)',
      );
    }
  }
}
