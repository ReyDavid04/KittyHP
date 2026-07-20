import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

type AuthenticationPurpose = 'registration' | 'password_reset';

@Injectable()
export class MailService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureEmailQueueTable();
  }

  async sendAuthenticationCode(
    email: string,
    code: string,
    purpose: AuthenticationPurpose,
  ): Promise<boolean> {
    const isRegistration = purpose === 'registration';
    const subject = isRegistration
      ? 'Código de registro de KittyHP'
      : 'Código para cambiar tu contraseña';
    const action = isRegistration
      ? 'completar tu registro'
      : 'cambiar tu contraseña';
    const bodyText = [
      'KittyHP',
      '',
      `Tu código para ${action} es: ${code}`,
      '',
      'El código vence en 10 minutos y solo puede utilizarse una vez.',
      'Si tú no solicitaste esta operación, ignora este mensaje.',
    ].join('\r\n');
    const bodyHtml = this.buildAuthenticationCodeHtml(code, action);
    const uniqueKey = `kittyhp-auth:${purpose}:${email.toLowerCase()}`;

    await this.dataSource.query(
      `INSERT INTO email_queue
        (
          to_email,
          cc_email,
          bcc_email,
          subject,
          body_html,
          body_text,
          status,
          attempts,
          max_attempts,
          error_message,
          locked_by,
          locked_at,
          sent_at,
          unique_key
        )
       VALUES (?, NULL, NULL, ?, ?, ?, 'pending', 0, 3, NULL, NULL, NULL, NULL, ?)
       ON DUPLICATE KEY UPDATE
         to_email = VALUES(to_email),
         subject = VALUES(subject),
         body_html = VALUES(body_html),
         body_text = VALUES(body_text),
         status = 'pending',
         attempts = 0,
         max_attempts = VALUES(max_attempts),
         error_message = NULL,
         locked_by = NULL,
         locked_at = NULL,
         sent_at = NULL,
         updated_at = CURRENT_TIMESTAMP`,
      [email, subject, bodyHtml, bodyText, uniqueKey],
    );

    return true;
  }

  private async ensureEmailQueueTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        to_email VARCHAR(255) NOT NULL,
        cc_email VARCHAR(500) NULL,
        bcc_email VARCHAR(500) NULL,
        subject VARCHAR(500) NOT NULL,
        body_html LONGTEXT NULL,
        body_text LONGTEXT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        max_attempts INT UNSIGNED NOT NULL DEFAULT 3,
        error_message TEXT NULL,
        locked_by VARCHAR(120) NULL,
        locked_at DATETIME NULL,
        sent_at DATETIME NULL,
        unique_key VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_email_queue_unique_key (unique_key),
        KEY idx_email_queue_status_created (status, created_at),
        KEY idx_email_queue_locked_at (locked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  private buildAuthenticationCodeHtml(code: string, action: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KittyHP</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:36px 16px;background:#f3f6fa;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;overflow:hidden;border:1px solid #dce4ee;border-radius:14px;background:#ffffff;">
          <tr>
            <td style="padding:28px 32px;border-top:6px solid #174c8c;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#14213d;">KittyHP</div>
              <div style="margin-top:7px;font-size:13px;color:#66758a;">Control de fallas y reparaciones</div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 32px;border-top:1px solid #edf1f5;text-align:center;">
              <div style="font-size:14px;line-height:1.6;color:#344054;">Utiliza el siguiente código para ${this.escapeHtml(action)}:</div>
              <div style="margin:22px auto;padding:14px 20px;border:1px solid #cddbec;border-radius:10px;background:#f4f8fc;font-size:32px;font-weight:800;letter-spacing:8px;color:#174c8c;">${this.escapeHtml(code)}</div>
              <div style="font-size:12px;line-height:1.6;color:#7a8798;">El código vence en 10 minutos y solo puede utilizarse una vez.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #edf1f5;background:#fafbfc;text-align:center;font-size:11px;line-height:1.6;color:#98a2b3;">
              Si tú no solicitaste esta operación, ignora este mensaje.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
