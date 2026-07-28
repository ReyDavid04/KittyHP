import mysql from '../../backend/node_modules/mysql2/promise.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const text = await readFile(path.join(root, 'backend', '.env'), 'utf8');
const env = Object.fromEntries(text.split(/\r?\n/).filter((line) => line && !line.trim().startsWith('#') && line.includes('=')).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
}));

const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});
const [rows] = await connection.query('SELECT id, email, role, is_active FROM users ORDER BY id');
console.log(JSON.stringify(rows));
await connection.end();
