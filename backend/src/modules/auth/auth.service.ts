import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

interface AuthTokenPayload {
  sub: string;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly username: string;
  private readonly password: string;
  private readonly tokenSecret: string;
  private readonly tokenLifetimeMs: number;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('AUTH_USERNAME', 'admin');
    this.password = this.configService.get<string>('AUTH_PASSWORD', 'KittyHP2026!');
    this.tokenSecret = this.configService.get<string>('AUTH_TOKEN_SECRET', 'kittyhp-change-this-secret');
    this.tokenLifetimeMs = Number(this.configService.get<string>('AUTH_TOKEN_LIFETIME_MS', '28800000'));
  }

  login(username: string, password: string): { token: string; username: string; expiresAt: string } {
    if (!this.matches(username, this.username) || !this.matches(password, this.password)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const expiresAt = Date.now() + this.tokenLifetimeMs;
    const payload: AuthTokenPayload = { sub: this.username, exp: expiresAt };

    return {
      token: this.sign(payload),
      username: this.username,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  verifyToken(token: string): AuthTokenPayload {
    const [encodedPayload, providedSignature] = token.split('.');

    if (!encodedPayload || !providedSignature) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    const expectedSignature = this.createSignature(encodedPayload);
    if (!this.matches(providedSignature, expectedSignature)) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthTokenPayload;
      if (!payload.sub || !payload.exp || payload.exp <= Date.now()) {
        throw new UnauthorizedException('La sesión expiró.');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Sesión inválida.');
    }
  }

  private sign(payload: AuthTokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${encodedPayload}.${this.createSignature(encodedPayload)}`;
  }

  private createSignature(encodedPayload: string): string {
    return createHmac('sha256', this.tokenSecret).update(encodedPayload).digest('base64url');
  }

  private matches(value: string, expected: string): boolean {
    const valueHash = createHash('sha256').update(value).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(valueHash, expectedHash);
  }
}
