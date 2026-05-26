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
  /**
   * ALTER TABLE, DROP TABLE, DROP PROCEDURE tetap diizinkan
   * karena migration/seed kamu memang butuh itu.
   */
  const blocked = [
    'DROP DATABASE',
    'CREATE DATABASE',
    'TRUNCATE',
    'DELETE FROM',
  ];

  const upper = sqlText.toUpperCase();

  for (const keyword of blocked) {
    if (upper.includes(keyword)) {
      throw new Error(
        `Seed dibatalkan karena SQL mengandung perintah berbahaya: ${keyword}`,
      );
    }
  }
}

function splitSqlStatements(sqlText: string): string[] {
  const statements: string[] = [];

  let delimiter = ';';
  let buffer = '';

  const lines = sqlText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.toUpperCase().startsWith('DELIMITER ')) {
      const pending = buffer.trim();

      if (pending) {
        statements.push(pending);
        buffer = '';
      }

      delimiter = trimmed.substring('DELIMITER '.length).trim();
      continue;
    }

    buffer += line + '\n';

    if (buffer.trimEnd().endsWith(delimiter)) {
      const statement = buffer.trimEnd().slice(0, -delimiter.length).trim();

      if (statement) {
        statements.push(statement);
      }

      buffer = '';
    }
  }

  const rest = buffer.trim();

  if (rest) {
    statements.push(rest);
  }

  return statements.filter((statement) => {
    const clean = statement.trim();

    return clean && !clean.startsWith('--');
  });
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
    multipleStatements: false,
  });

  try {
    console.log(`[SEED] Connected to ${database}`);

    const statements = splitSqlStatements(sqlText);

    console.log(`[SEED] Menjalankan ${statements.length} statement...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await connection.query(statement);
      } catch (error) {
        console.error(`[SEED] Error pada statement ke-${i + 1}:`);
        console.error(statement.slice(0, 800));
        throw error;
      }
    }

    console.log('[SEED] SkillLens seed selesai dijalankan.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[SEED] Gagal menjalankan seed:', error);
  process.exit(1);
});