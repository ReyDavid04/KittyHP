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
  if (!Number.isFinite(failureQty) || !Number.isFinite(buildQty) || failureQty <= 0 || buildQty <= 0) {
    throw new BadRequestException('Failure qty y Build qty deben ser mayores que cero.');
  }

  const frPercentage = Number(((failureQty / buildQty) * 100).toFixed(2));
  if (frPercentage <= 0) {
    throw new BadRequestException('El F/R calculado debe ser mayor a 0.00%.');
  }

  return frPercentage.toFixed(2);
}

function calculateReturnQuantities(failureQty: number, returnYesQty: number): { returnYesQty: number; returnNoQty: number } {
  if (!Number.isInteger(failureQty) || failureQty <= 0) {
    throw new BadRequestException('Failure qty debe ser un número entero mayor que cero.');
  }

  if (!Number.isInteger(returnYesQty) || returnYesQty < 0) {
    throw new BadRequestException('Return Yes debe ser un número entero igual o mayor que cero.');
  }

  if (returnYesQty > failureQty) {
    throw new BadRequestException('Return Yes no puede ser mayor que Failure qty.');
  }

  return {
    returnYesQty,
    returnNoQty: failureQty - returnYesQty,
  };
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
  }

  async create(data: CreateRepairDto, createdByUserId: number): Promise<RepairEntity> {
    const frPercentage = calculateFrPercentage(data.failureQty, data.buildQty);
    const returns = calculateReturnQuantities(data.failureQty, data.returnYesQty);
    const returnStatus = `Yes: ${returns.returnYesQty} | No: ${returns.returnNoQty}`;
    const [family, topIssue, category, majorPart, failureFactor] = await Promise.all([
      this.resolveCatalogReference('family', data.family, true),
      this.resolveCatalogReference('top_issue', data.topIssue, true),
      this.resolveCatalogReference('category', data.category, true),
      this.resolveCatalogReference('major_part', data.majorPart, false),
      this.resolveCatalogReference('failure_factor', data.failureFactor, false),
    ]);

    const entity = this.repository.create({
      recordDate: data.recordDate,
      family: family!.value,
      familyCatalogItemId: family!.id,
      topIssue: topIssue!.value,
      topIssueCatalogItemId: topIssue!.id,
      failureQty: data.failureQty,
      buildQty: data.buildQty,
      frPercentage,
      category: category!.value,
      categoryCatalogItemId: category!.id,
      returnStatus,
      returnYesQty: returns.returnYesQty,
      returnNoQty: returns.returnNoQty,
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
        family: family!.value,
        familyCatalogItemId: family!.id,
        topIssue: topIssue!.value,
        topIssueCatalogItemId: topIssue!.id,
        category: category!.value,
        categoryCatalogItemId: category!.id,
        majorPart: majorPart?.value ?? null,
        majorPartCatalogItemId: majorPart?.id ?? null,
        failureFactor: failureFactor?.value ?? null,
        failureFactorCatalogItemId: failureFactor?.id ?? null,
        frPercentage: Number(frPercentage),
        returnYesQty: returns.returnYesQty,
        returnNoQty: returns.returnNoQty,
        createdByUserId,
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

    if (data.recordDate !== undefined) entity.recordDate = data.recordDate;

    if (data.family !== undefined) {
      const reference = await this.resolveCatalogReference('family', data.family, true);
      entity.family = reference!.value;
      entity.familyCatalogItemId = reference!.id;
    }

    if (data.topIssue !== undefined) {
      const reference = await this.resolveCatalogReference('top_issue', data.topIssue, true);
      entity.topIssue = reference!.value;
      entity.topIssueCatalogItemId = reference!.id;
    }

    if (data.failureQty !== undefined) entity.failureQty = data.failureQty;
    if (data.buildQty !== undefined) entity.buildQty = data.buildQty;
    entity.frPercentage = calculateFrPercentage(entity.failureQty, entity.buildQty);

    if (data.category !== undefined) {
      const reference = await this.resolveCatalogReference('category', data.category, true);
      entity.category = reference!.value;
      entity.categoryCatalogItemId = reference!.id;
    }

    const returns = calculateReturnQuantities(
      entity.failureQty,
      data.returnYesQty ?? entity.returnYesQty,
    );
    entity.returnYesQty = returns.returnYesQty;
    entity.returnNoQty = returns.returnNoQty;
    entity.returnStatus = `Yes: ${returns.returnYesQty} | No: ${returns.returnNoQty}`;

    if (data.failPicture !== undefined) entity.failPicture = data.failPicture ?? null;

    if (data.majorPart !== undefined) {
      const reference = await this.resolveCatalogReference('major_part', data.majorPart, false);
      entity.majorPart = reference?.value ?? null;
      entity.majorPartCatalogItemId = reference?.id ?? null;
    }

    if (data.repairResult !== undefined) entity.repairResult = data.repairResult ?? null;

    if (data.failureFactor !== undefined) {
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
      createdByUserId: entity.createdByUserId,
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
