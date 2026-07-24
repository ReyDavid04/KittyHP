import { Body, Controller, Get, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, RequestWithAuth } from '../auth/auth.guard';
import { EditorGuard } from '../auth/editor.guard';
import { SaveProductionWeekDto } from './dto/save-production-week.dto';
import { ProductionService } from './production.service';

@Controller('production-defects')
@UseGuards(AuthGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('week')
  getWeek(@Query('start') start: string) {
    return this.productionService.getWeek(start);
  }

  @Put('week')
  @UseGuards(EditorGuard)
  saveWeek(
    @Body() dto: SaveProductionWeekDto,
    @Req() request: RequestWithAuth,
  ) {
    return this.productionService.saveWeek(dto, request.user!.id);
  }
}
