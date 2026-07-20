import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket, connect as connectNet } from 'node:net';
import { TLSSocket, connect as connectTls } from 'node:tls';

type SmtpSocket = Socket | TLSSocket;

class SmtpSession {
  private buffer = '';
  private responseLines: string[] = [];
  private completedResponses: string[][] = [];
  private waiters: Array<{ resolve: (lines: string[]) => void; reject: (error: Error) => void }> = [];

  constructor(private readonly socket: SmtpSocket) {
    socket.setTimeout(15000);
    socket.on('data', (chunk: Buffer) => this.consume(chunk.toString('utf8')));
    socket.on('timeout', () => this.fail(new Error('El servidor SMTP agotó el tiempo de espera.')));
    socket.on('error', (error) => this.fail(error));
    socket.on('close', () => {
      if (this.waiters.length > 0) this.fail(new Error('La conexión SMTP se cerró inesperadamente.'));
    });
  }

  async expect(expectedCodes: number[]): Promise<string[]> {
    const response = await this.readResponse();
    const lastLine = response.at(-1) ?? '';
    const code = Number(lastLine.slice(0, 3));
    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP ${code || 'sin respuesta'}: ${response.join(' ')}`);
    }
    return response;
  }

  async command(command: string, expectedCodes: number[]): Promise<string[]> {
    this.socket.write(`${command}\r\n`);
    return this.expect(expectedCodes);
  }

  writeRaw(content: string): void {
    this.socket.write(content);
  }

  close(): void {
    this.socket.end();
  }

  private readResponse(): Promise<string[]> {
    const ready = this.completedResponses.shift();
    if (ready) return Promise.resolve(ready);

    return new Promise<string[]>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  private consume(chunk: string): void {
    this.buffer += chunk;
    const pieces = this.buffer.split(/\r?\n/);
    this.buffer = pieces.pop() ?? '';

    for (const line of pieces) {
      if (!line) continue;
      this.responseLines.push(line);
      if (/^\d{3} /.test(line)) {
        const completed = this.responseLines;
        this.responseLines = [];
        const waiter = this.waiters.shift();
        if (waiter) waiter.resolve(completed);
        else this.completedResponses.push(completed);
      }
    }
  }

  private fail(error: Error): void {
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
  }
}

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('SMTP_HOST', '').trim());
  }

  async sendAuthenticationCode(
    email: string,
    code: string,
    purpose: 'registration' | 'password_reset',
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      if (this.configService.get<string>('NODE_ENV', 'development') === 'production') {
        throw new ServiceUnavailableException('El envío de correo no está configurado. Contacta al administrador.');
      }
      return false;
    }

    const isRegistration = purpose === 'registration';
    const subject = isRegistration ? 'Código de registro de KittyHP' : 'Código para cambiar tu contraseña';
    const action = isRegistration ? 'completar tu registro' : 'cambiar tu contraseña';
    const text = [
      'KittyHP',
      '',
      `Tu código para ${action} es: ${code}`,
      '',
      'El código vence en 10 minutos y solo puede utilizarse una vez.',
      'Si tú no solicitaste esta operación, ignora este mensaje.',
    ].join('\r\n');

    await this.sendMail(email, subject, text);
    return true;
  }

  private async sendMail(to: string, subject: string, text: string): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST', '').trim();
    const port = Number(this.configService.get<string>('SMTP_PORT', '25'));
    const secure = this.configService.get<string>('SMTP_SECURE', 'false').toLowerCase() === 'true';
    const username = this.configService.get<string>('SMTP_USER', '').trim();
    const password = this.configService.get<string>('SMTP_PASSWORD', '');
    const from = this.sanitizeHeader(this.configService.get<string>('SMTP_FROM', 'KittyHP <no-reply@inventec.com>'));

    const socket = await this.connect(host, port, secure);
    const session = new SmtpSession(socket);

    try {
      await session.expect([220]);
      await session.command(`EHLO ${this.hostname()}`, [250]);

      if (username) {
        await session.command('AUTH LOGIN', [334]);
        await session.command(Buffer.from(username, 'utf8').toString('base64'), [334]);
        await session.command(Buffer.from(password, 'utf8').toString('base64'), [235]);
      }

      const envelopeFrom = this.extractEmail(from);
      await session.command(`MAIL FROM:<${envelopeFrom}>`, [250]);
      await session.command(`RCPT TO:<${to}>`, [250, 251]);
      await session.command('DATA', [354]);

      const message = [
        `From: ${from}`,
        `To: ${this.sanitizeHeader(to)}`,
        `Subject: ${this.encodeSubject(subject)}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        this.escapeDots(text),
        '.',
        '',
      ].join('\r\n');

      session.writeRaw(message);
      await session.expect([250]);
      await session.command('QUIT', [221]);
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? `No fue posible enviar el correo: ${error.message}` : 'No fue posible enviar el correo.',
      );
    } finally {
      session.close();
    }
  }

  private connect(host: string, port: number, secure: boolean): Promise<SmtpSocket> {
    return new Promise((resolve, reject) => {
      const socket = secure
        ? connectTls({ host, port, servername: host, rejectUnauthorized: true })
        : connectNet({ host, port });

      const eventName = secure ? 'secureConnect' : 'connect';
      socket.once(eventName, () => resolve(socket));
      socket.once('error', reject);
    });
  }

  private hostname(): string {
    return this.configService.get<string>('SMTP_HELO_NAME', 'kittyhp.local').replace(/[^a-zA-Z0-9.-]/g, '') || 'kittyhp.local';
  }

  private sanitizeHeader(value: string): string {
    return value.replace(/[\r\n]/g, '').trim();
  }

  private extractEmail(value: string): string {
    const match = value.match(/<([^>]+)>/);
    return (match?.[1] ?? value).replace(/[\r\n<>]/g, '').trim();
  }

  private encodeSubject(subject: string): string {
    return `=?UTF-8?B?${Buffer.from(this.sanitizeHeader(subject), 'utf8').toString('base64')}?=`;
  }

  private escapeDots(text: string): string {
    return text.replace(/(^|\r\n)\./g, '$1..');
  }
}
