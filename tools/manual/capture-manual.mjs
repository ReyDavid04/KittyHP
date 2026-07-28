import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const outputDir = path.join(import.meta.dirname, 'captures');
const baseUrl = 'http://localhost:4210';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9333;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

class CdpClient {
  constructor(url) {
    this.id = 0;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() { this.socket.close(); }
}

async function waitForDebugger() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) return response.json();
    } catch {}
    await delay(250);
  }
  throw new Error('Microsoft Edge no expuso el puerto de depuración.');
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const env = parseEnv(await readFile(path.join(root, 'backend', '.env'), 'utf8'));
  const edgeProfile = path.join(import.meta.dirname, '.edge-manual-profile');
  const edge = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${edgeProfile}`,
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-features=Translate',
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const pages = await waitForDebugger();
    const page = pages.find((item) => item.type === 'page');
    if (!page) throw new Error('No se encontró una página de Edge para capturar.');
    const cdp = new CdpClient(page.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const navigate = async (route, wait = 1800) => {
      await cdp.send('Page.navigate', { url: `${baseUrl}${route}` });
      await delay(wait);
    };
    const evaluate = (expression) => cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    const capture = async (name) => {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
      await writeFile(path.join(outputDir, `${name}.png`), Buffer.from(data, 'base64'));
    };

    await navigate('/login');
    await capture('01-login');
    await navigate('/register');
    await capture('02-register');
    await navigate('/forgot-password');
    await capture('03-recovery');

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.AUTH_EMAIL, password: env.AUTH_PASSWORD }),
    });
    let session;
    if (loginResponse.ok) {
      session = await loginResponse.json();
    } else {
      // El password inicial puede haber cambiado. Para documentar la instancia
      // local firmamos una sesión efímera sin modificar usuarios ni datos.
      const expiresAt = Date.now() + 15 * 60_000;
      const payload = { sub: 1, email: env.AUTH_EMAIL, role: 'admin', exp: expiresAt };
      const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
      const signature = createHmac('sha256', env.AUTH_TOKEN_SECRET).update(encoded).digest('base64url');
      session = {
        token: `${encoded}.${signature}`,
        userId: 1,
        email: env.AUTH_EMAIL,
        role: 'admin',
        expiresAt: new Date(expiresAt).toISOString(),
      };
    }

    await navigate('/login', 500);
    await evaluate(`localStorage.setItem('kittyhp-auth-session', ${JSON.stringify(JSON.stringify(session))})`);
    const apiHeaders = { Authorization: `Bearer ${session.token}` };
    const repairResponse = await fetch(`${baseUrl}/api/repairs`, { headers: apiHeaders });
    const repairs = repairResponse.ok ? await repairResponse.json() : [];
    const firstRepair = Array.isArray(repairs) ? repairs[0] : null;

    await navigate('/');
    await capture('04-reports');

    await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Configuración')); button?.click(); })()`);
    await delay(400);
    await capture('05-navigation-menu');

    await navigate('/repairs/new');
    await capture('06-create-report');
    await evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await delay(500);
    await capture('07-create-details');

    if (firstRepair?.id) {
      await navigate(`/repairs/${firstRepair.id}/view`);
      await capture('08-view-report');
      await evaluate('window.scrollTo(0, Math.min(document.body.scrollHeight, 720))');
      await delay(500);
      await capture('09-view-details');

      await navigate(`/repairs/${firstRepair.id}/edit`);
      await capture('10-edit-report');
      await evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await delay(500);
      await capture('11-edit-details');
    }

    await navigate('/production-defects', 2200);
    await capture('12-overall-trend');
    await navigate('/settings/catalogs/family');
    await capture('13-catalog-family');
    await navigate('/settings/users');
    await capture('14-users');

    cdp.close();
  } finally {
    edge.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
