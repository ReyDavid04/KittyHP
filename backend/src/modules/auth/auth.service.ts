import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type UserRole = 'admin' | 'user';

export interface AuthenticatedUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface ManagedUser extends AuthenticatedUser {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  sub: number;
  username: string;
  role: UserRole;
  exp: number;
}

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  role: UserRole;
  is_active: number | boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow {
  total: number | string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly tokenSecret: string;
  private readonly tokenLifetimeMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.tokenSecret = this.configService.get<string>('AUTH_TOKEN_SECRET', 'kittyhp-change-this-secret');
    this.tokenLifetimeMs = Number(this.configService.get<string>('AUTH_TOKEN_LIFETIME_MS', '28800000'));
  }

  async onModuleInit(): Promise<void> {
    await this.ensureUsersTable();
    await this.seedInitialAdministrator();
  }

  async login(username: string, password: string): Promise<{
    token: string;
    userId: number;
    username: string;
    displayName: string;
    role: UserRole;
    expiresAt: string;
  }> {
    const user = await this.findByUsername(username.trim());

    if (!user || !this.toBoolean(user.is_active) || !this.verifyPassword(password, user.password_salt, user.password_hash)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const expiresAt = Date.now() + this.tokenLifetimeMs;
    const payload: AuthTokenPayload = {
      sub: Number(user.id),
      username: user.username,
      role: user.role,
      exp: expiresAt,
    };

    return {
      token: this.sign(payload),
      userId: Number(user.id),
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  verifyToken(token: string): AuthTokenPayload {
    const [encodedPayload, providedSignature] = token.split('.');

    if (!encodedPayload || !providedSignature) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    const expectedSignature = this.createSignature(encodedPayload);
    if (!this.matchesBuffer(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthTokenPayload;
      if (
        !payload.sub ||
        !payload.username ||
        !['admin', 'user'].includes(payload.role) ||
        !payload.exp ||
        payload.exp <= Date.now()
      ) {
        throw new UnauthorizedException('La sesión expiró.');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Sesión inválida.');
    }
  }

  async getActiveUserById(id: number): Promise<AuthenticatedUser | null> {
    const user = await this.findById(id);
    if (!user || !this.toBoolean(user.is_active)) return null;
    return this.toAuthenticatedUser(user);
  }

  async listUsers(): Promise<ManagedUser[]> {
    const rows = await this.dataSource.query(
      `SELECT id, username, display_name, password_hash, password_salt, role, is_active, created_at, updated_at
       FROM users
       ORDER BY display_name ASC, username ASC`,
    ) as UserRow[];

    return rows.map((row) => this.toManagedUser(row));
  }

  async createUser(dto: CreateUserDto): Promise<ManagedUser> {
    const username = dto.username.trim();
    const displayName = dto.displayName.trim();
    const { salt, hash } = this.hashPassword(dto.password);

    try {
      const result = await this.dataSource.query(
        `INSERT INTO users (username, display_name, password_hash, password_salt, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username, displayName, hash, salt, dto.role, dto.isActive === false ? 0 : 1],
      ) as { insertId?: number };

      const created = await this.findById(Number(result.insertId));
      if (!created) throw new NotFoundException('No fue posible recuperar el usuario creado.');
      return this.toManagedUser(created);
    } catch (error) {
      this.handleDuplicateUsername(error);
      throw error;
    }
  }

  async updateUser(id: number, dto: UpdateUserDto, currentUserId: number): Promise<ManagedUser> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('El usuario no existe.');

    if (id === currentUserId && dto.isActive === false) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta.');
    }

    if (id === currentUserId && dto.role && dto.role !== user.role) {
      throw new ForbiddenException('No puedes cambiar el rol de tu propia cuenta.');
    }

    const nextRole = dto.role ?? user.role;
    const nextIsActive = dto.isActive ?? this.toBoolean(user.is_active);
    await this.ensureAdministratorRemains(user, nextRole, nextIsActive);

    let passwordHash = user.password_hash;
    let passwordSalt = user.password_salt;
    if (dto.password !== undefined && dto.password.length > 0) {
      const password = this.hashPassword(dto.password);
      passwordHash = password.hash;
      passwordSalt = password.salt;
    }

    try {
      await this.dataSource.query(
        `UPDATE users
         SET username = ?, display_name = ?, password_hash = ?, password_salt = ?, role = ?, is_active = ?
         WHERE id = ?`,
        [
          dto.username?.trim() ?? user.username,
          dto.displayName?.trim() ?? user.display_name,
          passwordHash,
          passwordSalt,
          nextRole,
          nextIsActive ? 1 : 0,
          id,
        ],
      );
    } catch (error) {
      this.handleDuplicateUsername(error);
      throw error;
    }

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('El usuario no existe.');
    return this.toManagedUser(updated);
  }

  async deleteUser(id: number, currentUserId: number): Promise<{ deleted: true }> {
    if (id === currentUserId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }

    const user = await this.findById(id);
    if (!user) throw new NotFoundException('El usuario no existe.');
    await this.ensureAdministratorRemains(user, 'user', false);

    await this.dataSource.query('DELETE FROM users WHERE id = ?', [id]);
    return { deleted: true };
  }

  private async ensureUsersTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(80) NOT NULL,
        display_name VARCHAR(120) NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  private async seedInitialAdministrator(): Promise<void> {
    const rows = await this.dataSource.query('SELECT COUNT(*) AS total FROM users') as CountRow[];
    if (Number(rows[0]?.total ?? 0) > 0) return;

    const username = this.configService.get<string>('AUTH_USERNAME', 'admin').trim();
    const displayName = this.configService.get<string>('AUTH_DISPLAY_NAME', 'Administrador').trim();
    const password = this.configService.get<string>('AUTH_PASSWORD', 'KittyHP2026!');
    const { salt, hash } = this.hashPassword(password);

    await this.dataSource.query(
      `INSERT INTO users (username, display_name, password_hash, password_salt, role, is_active)
       VALUES (?, ?, ?, ?, 'admin', 1)`,
      [username, displayName, hash, salt],
    );
  }

  private async ensureAdministratorRemains(user: UserRow, nextRole: UserRole, nextIsActive: boolean): Promise<void> {
    const removesActiveAdmin = user.role === 'admin' && this.toBoolean(user.is_active) && (nextRole !== 'admin' || !nextIsActive);
    if (!removesActiveAdmin) return;

    const rows = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ?`,
      [user.id],
    ) as CountRow[];

    if (Number(rows[0]?.total ?? 0) === 0) {
      throw new BadRequestException('Debe permanecer al menos un administrador activo.');
    }
  }

  private async findByUsername(username: string): Promise<UserRow | null> {
    const rows = await this.dataSource.query(
      `SELECT id, username, display_name, password_hash, password_salt, role, is_active, created_at, updated_at
       FROM users WHERE username = ? LIMIT 1`,
      [username],
    ) as UserRow[];
    return rows[0] ?? null;
  }

  private async findById(id: number): Promise<UserRow | null> {
    const rows = await this.dataSource.query(
      `SELECT id, username, display_name, password_hash, password_salt, role, is_active, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [id],
    ) as UserRow[];
    return rows[0] ?? null;
  }

  private hashPassword(password: string): { salt: string; hash: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
  }

  private verifyPassword(password: string, salt: string, expectedHash: string): boolean {
    const actualHash = scryptSync(password, salt, 64);
    return this.matchesBuffer(actualHash, Buffer.from(expectedHash, 'hex'));
  }

  private sign(payload: AuthTokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${encodedPayload}.${this.createSignature(encodedPayload)}`;
  }

  private createSignature(encodedPayload: string): string {
    return createHmac('sha256', this.tokenSecret).update(encodedPayload).digest('base64url');
  }

  private matchesBuffer(value: Buffer, expected: Buffer): boolean {
    return value.length === expected.length && timingSafeEqual(value, expected);
  }

  private toAuthenticatedUser(user: UserRow): AuthenticatedUser {
    return {
      id: Number(user.id),
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    };
  }

  private toManagedUser(user: UserRow): ManagedUser {
    return {
      ...this.toAuthenticatedUser(user),
      isActive: this.toBoolean(user.is_active),
      createdAt: new Date(user.created_at).toISOString(),
      updatedAt: new Date(user.updated_at).toISOString(),
    };
  }

  private toBoolean(value: number | boolean): boolean {
    return value === true || Number(value) === 1;
  }

  private handleDuplicateUsername(error: unknown): void {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new ConflictException('El nombre de usuario ya está registrado.');
    }
  }
}
