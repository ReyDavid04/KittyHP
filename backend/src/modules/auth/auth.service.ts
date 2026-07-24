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

export type UserRole = 'admin' | 'user' | 'viewer';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface ManagedUser extends AuthenticatedUser {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  sub: number;
  email: string;
  role: UserRole;
  exp: number;
}

interface UserRow {
  id: number;
  email: string;
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

interface ColumnRow {
  columnName: string;
}

interface IndexRow {
  indexName: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly tokenSecret: string;
  private readonly tokenLifetimeMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.tokenSecret = this.configService.getOrThrow<string>('AUTH_TOKEN_SECRET');
    this.tokenLifetimeMs = Number(
      this.configService.getOrThrow<string>('AUTH_TOKEN_LIFETIME_MS'),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.ensureUsersTable();
    await this.seedInitialAdministrator();
  }

  async login(email: string, password: string): Promise<{
    token: string;
    userId: number;
    email: string;
    role: UserRole;
    expiresAt: string;
  }> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.findByEmail(normalizedEmail);

    if (
      !user ||
      !this.toBoolean(user.is_active) ||
      !this.verifyPassword(password, user.password_salt, user.password_hash)
    ) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const expiresAt = Date.now() + this.tokenLifetimeMs;
    const payload: AuthTokenPayload = {
      sub: Number(user.id),
      email: user.email,
      role: user.role,
      exp: expiresAt,
    };

    return {
      token: this.sign(payload),
      userId: Number(user.id),
      email: user.email,
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
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as AuthTokenPayload;

      if (
        !payload.sub ||
        !payload.email ||
        !['admin', 'user', 'viewer'].includes(payload.role) ||
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
      `SELECT id, email, password_hash, password_salt, role, is_active, created_at, updated_at
       FROM users
       ORDER BY email ASC`,
    ) as UserRow[];

    return rows.map((row) => this.toManagedUser(row));
  }

  async createUser(dto: CreateUserDto): Promise<ManagedUser> {
    const email = this.normalizeEmail(dto.email);
    const { salt, hash } = this.hashPassword(dto.password);

    try {
      const result = await this.dataSource.query(
        `INSERT INTO users (email, password_hash, password_salt, role, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [email, hash, salt, dto.role, dto.isActive === false ? 0 : 1],
      ) as { insertId?: number };

      const created = await this.findById(Number(result.insertId));
      if (!created) {
        throw new NotFoundException('No fue posible recuperar el usuario creado.');
      }
      return this.toManagedUser(created);
    } catch (error) {
      this.handleDuplicateEmail(error);
      throw error;
    }
  }

  async updateUser(
    id: number,
    dto: UpdateUserDto,
    currentUserId: number,
  ): Promise<ManagedUser> {
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
         SET email = ?, password_hash = ?, password_salt = ?, role = ?, is_active = ?
         WHERE id = ?`,
        [
          dto.email ? this.normalizeEmail(dto.email) : user.email,
          passwordHash,
          passwordSalt,
          nextRole,
          nextIsActive ? 1 : 0,
          id,
        ],
      );
    } catch (error) {
      this.handleDuplicateEmail(error);
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
        email VARCHAR(160) NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const columns = await this.getUserColumns();
    if (!columns.has('email')) {
      await this.dataSource.query(
        'ALTER TABLE users ADD COLUMN email VARCHAR(160) NULL AFTER id',
      );
    }

    const migratedColumns = await this.getUserColumns();
    if (migratedColumns.has('username')) {
      await this.dataSource.query(`
        UPDATE users
        SET email = CASE
          WHEN username LIKE '%@%' THEN CONCAT(SUBSTRING_INDEX(username, '@', 1), '@inventec.com')
          ELSE CONCAT(username, '@inventec.com')
        END
        WHERE email IS NULL OR TRIM(email) = ''
      `);
    }

    await this.dataSource.query(`
      UPDATE users
      SET email = CONCAT('usuario', id, '@inventec.com')
      WHERE email IS NULL OR TRIM(email) = ''
    `);
    await this.dataSource.query(
      'ALTER TABLE users MODIFY COLUMN email VARCHAR(160) NOT NULL',
    );

    const indexes = await this.getUserIndexes();
    if (!indexes.has('uq_users_email')) {
      await this.dataSource.query(
        'ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)',
      );
    }

    const finalColumns = await this.getUserColumns();
    const finalIndexes = await this.getUserIndexes();

    if (finalIndexes.has('uq_users_username')) {
      await this.dataSource.query('ALTER TABLE users DROP INDEX uq_users_username');
    }
    if (finalColumns.has('username')) {
      await this.dataSource.query('ALTER TABLE users DROP COLUMN username');
    }
    if (finalColumns.has('display_name')) {
      await this.dataSource.query('ALTER TABLE users DROP COLUMN display_name');
    }
  }

  private async seedInitialAdministrator(): Promise<void> {
    const rows = await this.dataSource.query(
      'SELECT COUNT(*) AS total FROM users',
    ) as CountRow[];

    if (Number(rows[0]?.total ?? 0) > 0) return;

    const email = this.normalizeEmail(
      this.configService.getOrThrow<string>('AUTH_EMAIL'),
    );
    const password = this.configService.getOrThrow<string>('AUTH_PASSWORD');
    const { salt, hash } = this.hashPassword(password);

    await this.dataSource.query(
      `INSERT INTO users (email, password_hash, password_salt, role, is_active)
       VALUES (?, ?, ?, 'admin', 1)`,
      [email, hash, salt],
    );
  }

  private async ensureAdministratorRemains(
    user: UserRow,
    nextRole: UserRole,
    nextIsActive: boolean,
  ): Promise<void> {
    const removesActiveAdmin =
      user.role === 'admin' &&
      this.toBoolean(user.is_active) &&
      (nextRole !== 'admin' || !nextIsActive);

    if (!removesActiveAdmin) return;

    const rows = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE role = 'admin' AND is_active = 1 AND id <> ?`,
      [user.id],
    ) as CountRow[];

    if (Number(rows[0]?.total ?? 0) === 0) {
      throw new BadRequestException('Debe permanecer al menos un administrador activo.');
    }
  }

  private async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.dataSource.query(
      `SELECT id, email, password_hash, password_salt, role, is_active, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [email],
    ) as UserRow[];

    return rows[0] ?? null;
  }

  private async findById(id: number): Promise<UserRow | null> {
    const rows = await this.dataSource.query(
      `SELECT id, email, password_hash, password_salt, role, is_active, created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id],
    ) as UserRow[];

    return rows[0] ?? null;
  }

  private async getUserColumns(): Promise<Set<string>> {
    const rows = await this.dataSource.query(
      `SELECT COLUMN_NAME AS columnName
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    ) as ColumnRow[];

    return new Set(rows.map((row) => row.columnName));
  }

  private async getUserIndexes(): Promise<Set<string>> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT INDEX_NAME AS indexName
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    ) as IndexRow[];

    return new Set(rows.map((row) => row.indexName));
  }

  private normalizeEmail(value: string): string {
    const trimmed = value.trim();
    const parts = trimmed.split('@');

    if (
      parts.length > 2 ||
      (parts.length === 2 && parts[1].toLowerCase() !== 'inventec.com')
    ) {
      throw new BadRequestException(
        'El correo debe pertenecer al dominio @inventec.com.',
      );
    }

    const localPart = parts[0]?.trim();
    if (!localPart || localPart.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(localPart)) {
      throw new BadRequestException(
        'Captura un correo válido, por ejemplo Ramos.Rey@inventec.com.',
      );
    }

    return `${localPart}@inventec.com`;
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
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    return `${encodedPayload}.${this.createSignature(encodedPayload)}`;
  }

  private createSignature(encodedPayload: string): string {
    return createHmac('sha256', this.tokenSecret)
      .update(encodedPayload)
      .digest('base64url');
  }

  private matchesBuffer(value: Buffer, expected: Buffer): boolean {
    return value.length === expected.length && timingSafeEqual(value, expected);
  }

  private toAuthenticatedUser(user: UserRow): AuthenticatedUser {
    return {
      id: Number(user.id),
      email: user.email,
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

  private handleDuplicateEmail(error: unknown): void {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new ConflictException('El correo ya está registrado.');
    }
  }
}
