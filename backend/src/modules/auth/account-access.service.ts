import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import { MailService } from './mail.service';

type RequestPurpose = 'registration' | 'password_reset';

interface UserRow {
  id: number;
  email: string;
  is_active: number | boolean;
}

interface RequestRow {
  email: string;
  purpose: RequestPurpose;
  code_hash: string;
  password_hash: string | null;
  password_salt: string | null;
  expires_at: Date | string;
  attempts: number | string;
}

export interface CodeDeliveryResponse {
  message: string;
  developmentCode?: string;
}

@Injectable()
export class AccountAccessService implements OnModuleInit {
  private readonly codeSecret: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.codeSecret = this.configService.get<string>('AUTH_TOKEN_SECRET', 'kittyhp-auth-code-secret');
  }

  async onModuleInit(): Promise<void> {
    await this.ensureRequestsTable();
  }

  async register(email: string, password: string): Promise<CodeDeliveryResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    if (await this.findUser(normalizedEmail)) {
      throw new ConflictException('El correo ya está registrado.');
    }

    const credentials = this.hashPassword(password);
    return this.issueCode(normalizedEmail, 'registration', credentials);
  }

  async verifyRegistration(email: string, code: string): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    if (await this.findUser(normalizedEmail)) {
      throw new ConflictException('El correo ya está registrado.');
    }

    const request = await this.verifyCode(normalizedEmail, 'registration', code);
    if (!request.password_hash || !request.password_salt) {
      throw new BadRequestException('El registro ya no es válido. Solicita un código nuevo.');
    }

    try {
      await this.dataSource.query(
        `INSERT INTO users (email, password_hash, password_salt, role, is_active)
         VALUES (?, ?, ?, 'user', 1)`,
        [normalizedEmail, request.password_hash, request.password_salt],
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('El correo ya está registrado.');
      }
      throw error;
    }

    await this.deleteRequest(normalizedEmail, 'registration');
    return { message: 'Registro completado. Ya puedes iniciar sesión.' };
  }

  async requestPasswordReset(email: string): Promise<CodeDeliveryResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.findUser(normalizedEmail);
    const genericMessage = 'Si el correo está registrado, recibirás un código para cambiar tu contraseña.';

    if (!user || !this.toBoolean(user.is_active)) {
      return { message: genericMessage };
    }

    const result = await this.issueCode(normalizedEmail, 'password_reset');
    return { ...result, message: genericMessage };
  }

  async resetPassword(email: string, code: string, password: string): Promise<{ message: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.findUser(normalizedEmail);
    if (!user || !this.toBoolean(user.is_active)) {
      throw new BadRequestException('El código no es válido o ya expiró.');
    }

    await this.verifyCode(normalizedEmail, 'password_reset', code);
    const credentials = this.hashPassword(password);
    await this.dataSource.query(
      `UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?`,
      [credentials.hash, credentials.salt, user.id],
    );
    await this.deleteRequest(normalizedEmail, 'password_reset');

    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

  private async issueCode(
    email: string,
    purpose: RequestPurpose,
    credentials?: { hash: string; salt: string },
  ): Promise<CodeDeliveryResponse> {
    const code = String(randomInt(100000, 1000000));
    const codeHash = this.hashCode(email, purpose, code);

    await this.dataSource.query(
      `INSERT INTO auth_requests
        (email, purpose, code_hash, password_hash, password_salt, expires_at, attempts)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)
       ON DUPLICATE KEY UPDATE
         code_hash = VALUES(code_hash),
         password_hash = VALUES(password_hash),
         password_salt = VALUES(password_salt),
         expires_at = VALUES(expires_at),
         attempts = 0,
         created_at = CURRENT_TIMESTAMP`,
      [email, purpose, codeHash, credentials?.hash ?? null, credentials?.salt ?? null],
    );

    const delivered = await this.mailService.sendAuthenticationCode(email, code, purpose);
    const message = purpose === 'registration'
      ? 'Enviamos un código para completar tu registro.'
      : 'Enviamos un código para cambiar tu contraseña.';

    return delivered
      ? { message }
      : { message: `${message} SMTP no está configurado; utiliza el código de desarrollo.`, developmentCode: code };
  }

  private async verifyCode(email: string, purpose: RequestPurpose, code: string): Promise<RequestRow> {
    const rows = await this.dataSource.query(
      `SELECT email, purpose, code_hash, password_hash, password_salt, expires_at, attempts
       FROM auth_requests
       WHERE LOWER(email) = LOWER(?) AND purpose = ?
       LIMIT 1`,
      [email, purpose],
    ) as RequestRow[];
    const request = rows[0];

    if (!request || new Date(request.expires_at).getTime() <= Date.now() || Number(request.attempts) >= 5) {
      throw new BadRequestException('El código no es válido o ya expiró.');
    }

    const actualHash = this.hashCode(email, purpose, code);
    const actual = Buffer.from(actualHash, 'hex');
    const expected = Buffer.from(request.code_hash, 'hex');
    const matches = actual.length === expected.length && timingSafeEqual(actual, expected);

    if (!matches) {
      await this.dataSource.query(
        `UPDATE auth_requests SET attempts = attempts + 1
         WHERE LOWER(email) = LOWER(?) AND purpose = ?`,
        [email, purpose],
      );
      throw new BadRequestException('El código no es válido o ya expiró.');
    }

    return request;
  }

  private async deleteRequest(email: string, purpose: RequestPurpose): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM auth_requests WHERE LOWER(email) = LOWER(?) AND purpose = ?`,
      [email, purpose],
    );
  }

  private async findUser(email: string): Promise<UserRow | null> {
    const rows = await this.dataSource.query(
      `SELECT id, email, is_active FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email],
    ) as UserRow[];
    return rows[0] ?? null;
  }

  private async ensureRequestsTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS auth_requests (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(160) NOT NULL,
        purpose VARCHAR(30) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        password_hash VARCHAR(128) NULL,
        password_salt VARCHAR(64) NULL,
        expires_at DATETIME NOT NULL,
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_auth_requests_email_purpose (email, purpose),
        KEY idx_auth_requests_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  private normalizeEmail(value: string): string {
    const trimmed = value.trim();
    const parts = trimmed.split('@');
    if (parts.length > 2 || (parts.length === 2 && parts[1].toLowerCase() !== 'inventec.com')) {
      throw new BadRequestException('El correo debe pertenecer al dominio @inventec.com.');
    }

    const localPart = parts[0]?.trim();
    if (!localPart || localPart.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(localPart)) {
      throw new BadRequestException('Captura un correo válido, por ejemplo Ramos.Rey@inventec.com.');
    }
    return `${localPart}@inventec.com`;
  }

  private hashPassword(password: string): { salt: string; hash: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
  }

  private hashCode(email: string, purpose: RequestPurpose, code: string): string {
    return createHash('sha256')
      .update(`${purpose}:${email.toLowerCase()}:${code}:${this.codeSecret}`)
      .digest('hex');
  }

  private toBoolean(value: number | boolean): boolean {
    return value === true || Number(value) === 1;
  }
}
