import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  user?: { username: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Debes iniciar sesión.');
    }

    const payload = this.authService.verifyToken(header.slice(7).trim());
    request.user = { username: payload.sub };
    return true;
  }
}
