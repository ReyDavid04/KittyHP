import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairEntity } from '../entities/repair.entity';

@Injectable()
export class RepairRepository {
  constructor(
    @InjectRepository(RepairEntity)
    private readonly repository: Repository<RepairEntity>,
  ) {}

  create(data: CreateRepairDto): Promise<RepairEntity> {
    const entity = this.repository.create({
      recordDate: data.recordDate,
      topIssue: data.topIssue,
      failureQty: data.failureQty,
      buildQty: data.buildQty,
      frPercentage: data.frPercentage.toFixed(2),
      category: data.category,
      returnStatus: data.returnStatus ?? (data.isReturned === undefined ? null : data.isReturned ? 'YES' : 'NO'),
      failPicture: data.failPicture ?? null,
      majorPart: data.majorPart ?? null,
      repairResult: data.repairResult ?? null,
      failureFactor: data.failureFactor ?? null,
      actions: data.actions ?? null,
      evidencePicture: data.evidencePicture ?? null,
      sourcePayload: data as unknown as Record<string, unknown>,
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
    if (data.topIssue !== undefined) entity.topIssue = data.topIssue;
    if (data.failureQty !== undefined) entity.failureQty = data.failureQty;
    if (data.buildQty !== undefined) entity.buildQty = data.buildQty;
    if (data.frPercentage !== undefined) entity.frPercentage = data.frPercentage.toFixed(2);
    if (data.category !== undefined) entity.category = data.category;
    if (data.returnStatus !== undefined) entity.returnStatus = data.returnStatus;
    if (data.isReturned !== undefined && data.returnStatus === undefined) {
      entity.returnStatus = data.isReturned ? 'YES' : 'NO';
    }
    if (data.failPicture !== undefined) entity.failPicture = data.failPicture ?? null;
    if (data.majorPart !== undefined) entity.majorPart = data.majorPart ?? null;
    if (data.repairResult !== undefined) entity.repairResult = data.repairResult ?? null;
    if (data.failureFactor !== undefined) entity.failureFactor = data.failureFactor ?? null;
    if (data.actions !== undefined) entity.actions = data.actions ?? null;
    if (data.evidencePicture !== undefined) entity.evidencePicture = data.evidencePicture ?? null;

    entity.sourcePayload = { ...(entity.sourcePayload ?? {}), ...data };

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

