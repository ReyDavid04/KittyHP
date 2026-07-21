import { Injectable } from '@nestjs/common';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { RepairRepository } from '../repositories/repair.repository';

@Injectable()
export class CreateRepairUseCase {
  execute(
    createRepairDto: CreateRepairDto,
    createdByUserId: number,
    repairRepository: RepairRepository,
  ) {
    return repairRepository.create(createRepairDto, createdByUserId);
  }
}
