import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import mysql from 'mysql2/promise';

config();

const ROOT_DIR = process.cwd();
const SQL_PATH = join(ROOT_DIR, 'database', 'skilllens_seed_only.sql');

function env(name: string, fallback = '') {
  return process.env[name] ?? fallback;
}

function assertSafeSeed(sqlText: string) {
  const blocked = [
    'DROP DATABASE',
    'DROP TABLE',
    'TRUNCATE',
    'DELETE FROM',
    'ALTER TABLE',
    'CREATE DATABASE',
  ];

  const upper = sqlText.toUpperCase();

  for (const keyword of blocked) {
    if (upper.includes(keyword)) {
      throw new Error(`Seed dibatalkan karena SQL mengandung perintah berbahaya: ${keyword}`);
    }
  }
}

async function main() {
  const sqlText = readFileSync(SQL_PATH, 'utf8');

  assertSafeSeed(sqlText);

  const host = env('DB_HOST', env('MYSQL_HOST', '127.0.0.1'));
  const port = Number(env('DB_PORT', env('MYSQL_PORT', '3306')));
  const user = env('DB_USERNAME', env('MYSQL_USER', 'root'));
  const password = env('DB_PASSWORD', env('MYSQL_PASSWORD', 'root123'));
  const database = env('DB_DATABASE', env('MYSQL_DATABASE', 'skilllens_db'));

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  try {
    console.log(`[SEED] Connected to ${database}`);
    await connection.query(sqlText);
    console.log('[SEED] SkillLens seed selesai dijalankan.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[SEED] Gagal menjalankan seed:', error);
  process.exit(1);
});
