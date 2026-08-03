import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityService } from './activity.service';

@Controller('monitoring')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly configService: ConfigService,
  ) {}

  @Get('active-users')
  activeUsers(@Headers('x-monitoring-key') monitoringKey?: string) {
    const expectedKey = this.configService.get<string>('MONITORING_API_KEY', '').trim();
    if (!expectedKey || monitoringKey !== expectedKey) {
      throw new UnauthorizedException('Clave de monitoreo inválida.');
    }
    return this.activityService.activeUsers();
  }
}
