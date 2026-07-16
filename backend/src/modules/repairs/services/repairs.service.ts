import { Injectable } from '@nestjs/common';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { UpdateRepairDto } from '../dto/update-repair.dto';
import { RepairRepository } from '../repositories/repair.repository';
import { CreateRepairUseCase } from '../use-cases/create-repair.use-case';

@Injectable()
export class RepairsService {
  constructor(
    private readonly repairRepository: RepairRepository,
    private readonly createRepairUseCase: CreateRepairUseCase,
  ) {}

  create(createRepairDto: CreateRepairDto) {
    return this.createRepairUseCase.execute(createRepairDto, this.repairRepository);
  }

  findAll() {
    return this.repairRepository.findAll();
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
}

