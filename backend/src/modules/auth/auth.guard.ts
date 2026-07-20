import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser, AuthService } from './auth.service';

export interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Debes iniciar sesión.');
    }

    const payload = this.authService.verifyToken(header.slice(7).trim());
    const user = await this.authService.getActiveUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('La cuenta no existe o está desactivada.');
    }

    request.user = user;
    return true;
  }
}
