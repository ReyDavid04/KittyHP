import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { RepairRepository } from '../repositories/repair.repository';

type CreateRepairWithCreator = CreateRepairDto & {
  createdByUserId?: number;
};

@Injectable()
export class CreateRepairUseCase {
  execute(createRepairDto: CreateRepairDto, repairRepository: RepairRepository) {
    const createdByUserId = (createRepairDto as CreateRepairWithCreator).createdByUserId;

    if (!Number.isInteger(createdByUserId) || Number(createdByUserId) <= 0) {
      throw new UnauthorizedException('No fue posible identificar al usuario que crea el reporte.');
    }

    return repairRepository.create(createRepairDto, Number(createdByUserId));
  }
}
