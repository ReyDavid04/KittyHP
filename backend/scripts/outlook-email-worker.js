'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const mysql = require('mysql2/promise');

const backendRoot = path.resolve(__dirname, '..');
const env = loadEnv(path.join(backendRoot, '.env'));
const pollIntervalMs = positiveInteger(
  requiredEnv(env, 'EMAIL_WORKER_INTERVAL_MS'),
  'EMAIL_WORKER_INTERVAL_MS',
);
const staleLockMinutes = positiveInteger(
  requiredEnv(env, 'EMAIL_WORKER_STALE_MINUTES'),
  'EMAIL_WORKER_STALE_MINUTES',
);
const workerId = `${os.hostname()}:${process.pid}`;
const powershellScript = path.join(__dirname, 'outlook-send.ps1');

const pool = mysql.createPool({
  host: requiredEnv(env, 'DB_HOST'),
  port: positiveInteger(requiredEnv(env, 'DB_PORT'), 'DB_PORT'),
  user: requiredEnv(env, 'DB_USER'),
  password: requiredEnv(env, 'DB_PASSWORD'),
  database: requiredEnv(env, 'DB_NAME'),
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  charset: 'utf8mb4',
});

let stopping = false;
let timer = null;

async function main() {
  ensureWindowsAndScript();
  await releaseStaleLocks();

  console.log(`[KittyHP Email Worker] Iniciado como ${workerId}`);
  console.log(`[KittyHP Email Worker] Base: ${env.DB_NAME}; intervalo: ${pollIntervalMs} ms`);

  await processQueue();
  timer = setInterval(() => {
    processQueue().catch((error) => console.error('[KittyHP Email Worker]', error));
  }, pollIntervalMs);
}

async function processQueue() {
  if (stopping || processQueue.running) return;
  processQueue.running = true;

  try {
    while (!stopping) {
      const email = await claimNextEmail();
      if (!email) break;

      try {
        await sendWithOutlook(email);
        await pool.execute(
          `UPDATE email_queue
           SET status = 'sent', sent_at = NOW(), error_message = NULL,
               locked_by = NULL, locked_at = NULL
           WHERE id = ? AND locked_by = ?`,
          [email.id, workerId],
        );
        console.log(`[KittyHP Email Worker] Enviado #${email.id} a ${email.to_email}`);
      } catch (error) {
        const message = error instanceof Error
          ? error.message.slice(0, 4000)
          : String(error).slice(0, 4000);
        const nextStatus = Number(email.attempts) >= Number(email.max_attempts)
          ? 'error'
          : 'pending';

        await pool.execute(
          `UPDATE email_queue
           SET status = ?, error_message = ?, locked_by = NULL, locked_at = NULL
           WHERE id = ? AND locked_by = ?`,
          [nextStatus, message, email.id, workerId],
        );
        console.error(`[KittyHP Email Worker] Error #${email.id}: ${message}`);
      }
    }
  } finally {
    processQueue.running = false;
  }
}

processQueue.running = false;

async function claimNextEmail() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, to_email, cc_email, bcc_email, subject, body_html, body_text,
              attempts, max_attempts
       FROM email_queue
       WHERE status = 'pending' AND attempts < max_attempts
       ORDER BY created_at ASC, id ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );

    const email = rows[0];
    if (!email) {
      await connection.commit();
      return null;
    }

    await connection.execute(
      `UPDATE email_queue
       SET status = 'processing', attempts = attempts + 1,
           locked_by = ?, locked_at = NOW(), error_message = NULL
       WHERE id = ?`,
      [workerId, email.id],
    );
    await connection.commit();

    return { ...email, attempts: Number(email.attempts) + 1 };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function releaseStaleLocks() {
  const [result] = await pool.execute(
    `UPDATE email_queue
     SET status = CASE WHEN attempts >= max_attempts THEN 'error' ELSE 'pending' END,
         error_message = CASE
           WHEN attempts >= max_attempts THEN 'Se agotaron los intentos después de un bloqueo vencido.'
           ELSE error_message
         END,
         locked_by = NULL,
         locked_at = NULL
     WHERE status = 'processing'
       AND (locked_at IS NULL OR locked_at < DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
    [staleLockMinutes],
  );

  if (result.affectedRows > 0) {
    console.log(`[KittyHP Email Worker] Se liberaron ${result.affectedRows} correos bloqueados.`);
  }
}

async function sendWithOutlook(email) {
  const payloadPath = path.join(
    os.tmpdir(),
    `kittyhp-email-${email.id}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );

  const payload = {
    to: email.to_email,
    cc: email.cc_email || '',
    bcc: email.bcc_email || '',
    subject: email.subject,
    htmlBody: email.body_html || '',
    textBody: email.body_text || '',
  };

  fs.writeFileSync(payloadPath, JSON.stringify(payload), 'utf8');

  try {
    await runPowerShell(payloadPath);
  } finally {
    try {
      fs.unlinkSync(payloadPath);
    } catch {
      // El archivo temporal se eliminará posteriormente por Windows.
    }
  }
}

function runPowerShell(payloadPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        powershellScript,
        '-PayloadPath',
        payloadPath,
      ],
      { windowsHide: true },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && stdout.includes('SENT')) resolve();
      else reject(new Error((stderr || stdout || `PowerShell terminó con código ${code}`).trim()));
    });
  });
}

function ensureWindowsAndScript() {
  if (process.platform !== 'win32') {
    throw new Error('El worker de Outlook debe ejecutarse en Windows.');
  }
  if (!fs.existsSync(powershellScript)) {
    throw new Error(`No se encontró ${powershellScript}`);
  }
}

function requiredEnv(environment, name) {
  const value = environment[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Falta la variable ${name} en backend/.env`);
  }
  return value;
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`La variable ${name} debe ser un número entero mayor que cero.`);
  }
  return parsed;
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo obligatorio ${filePath}`);
  }

  const environment = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    environment[key] = value;
  }

  return environment;
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  if (timer) clearInterval(timer);
  console.log(`[KittyHP Email Worker] Cerrando por ${signal}...`);
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => { shutdown('SIGINT').catch(console.error); });
process.on('SIGTERM', () => { shutdown('SIGTERM').catch(console.error); });

main().catch(async (error) => {
  console.error('[KittyHP Email Worker] No pudo iniciar:', error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
