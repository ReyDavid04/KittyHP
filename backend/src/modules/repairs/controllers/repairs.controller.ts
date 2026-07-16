import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateRepairDto } from '../dto/create-repair.dto';
import { RepairsService } from '../services/repairs.service';

@Controller('repairs')
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  create(@Body() createRepairDto: CreateRepairDto) {
    return this.repairsService.create(createRepairDto);
  }

  @Get()
  findAll() {
    return this.repairsService.findAll();
  }
}
