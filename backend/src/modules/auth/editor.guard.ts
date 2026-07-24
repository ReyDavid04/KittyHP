import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestWithAuth } from './auth.guard';

@Injectable()
export class EditorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    if (request.user?.role === 'viewer') {
      throw new ForbiddenException('El rol Viewer solo tiene acceso de consulta.');
    }

    return true;
  }
}
