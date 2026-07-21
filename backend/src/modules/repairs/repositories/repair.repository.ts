import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairEntity } from '../entities/repair.entity';

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
export class RepairRepository {
  constructor(
    @InjectRepository(RepairEntity)
    private readonly repository: Repository<RepairEntity>,
  ) {}

  create(data: CreateRepairDto, createdByUserId: number): Promise<RepairEntity> {
    const frPercentage = calculateFrPercentage(data.failureQty, data.buildQty);
    const returns = calculateReturnQuantities(data.failureQty, data.returnYesQty);
    const returnStatus = `Yes: ${returns.returnYesQty} | No: ${returns.returnNoQty}`;

    const entity = this.repository.create({
      recordDate: data.recordDate,
      family: data.family,
      topIssue: data.topIssue,
      failureQty: data.failureQty,
      buildQty: data.buildQty,
      frPercentage,
      category: data.category,
      returnStatus,
      returnYesQty: returns.returnYesQty,
      returnNoQty: returns.returnNoQty,
      failPicture: data.failPicture ?? null,
      majorPart: data.majorPart ?? null,
      repairResult: data.repairResult ?? null,
      failureFactor: data.failureFactor ?? null,
      actions: data.actions ?? null,
      evidencePicture: data.evidencePicture ?? null,
      createdByUserId,
      sourcePayload: {
        ...(data as unknown as Record<string, unknown>),
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
    if (data.family !== undefined) entity.family = data.family;
    if (data.topIssue !== undefined) entity.topIssue = data.topIssue;
    if (data.failureQty !== undefined) entity.failureQty = data.failureQty;
    if (data.buildQty !== undefined) entity.buildQty = data.buildQty;
    entity.frPercentage = calculateFrPercentage(entity.failureQty, entity.buildQty);
    if (data.category !== undefined) entity.category = data.category;

    const returns = calculateReturnQuantities(
      entity.failureQty,
      data.returnYesQty ?? entity.returnYesQty,
    );
    entity.returnYesQty = returns.returnYesQty;
    entity.returnNoQty = returns.returnNoQty;
    entity.returnStatus = `Yes: ${returns.returnYesQty} | No: ${returns.returnNoQty}`;

    if (data.failPicture !== undefined) entity.failPicture = data.failPicture ?? null;
    if (data.majorPart !== undefined) entity.majorPart = data.majorPart ?? null;
    if (data.repairResult !== undefined) entity.repairResult = data.repairResult ?? null;
    if (data.failureFactor !== undefined) entity.failureFactor = data.failureFactor ?? null;
    if (data.actions !== undefined) entity.actions = data.actions ?? null;
    if (data.evidencePicture !== undefined) entity.evidencePicture = data.evidencePicture ?? null;

    entity.sourcePayload = {
      ...(entity.sourcePayload ?? {}),
      ...data,
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
}
