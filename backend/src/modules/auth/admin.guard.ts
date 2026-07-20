import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestWithAuth } from './auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();

    if (request.user?.role !== 'admin') {
      throw new ForbiddenException('Esta acción está disponible únicamente para administradores.');
    }

    return true;
  }
}
