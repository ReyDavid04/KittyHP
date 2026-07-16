import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRepairDto } from '../dto/create-repair.dto';
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

  findAll(): Promise<RepairEntity[]> {
    return this.repository.find({ order: { recordDate: 'DESC', id: 'DESC' } });
  }
}
