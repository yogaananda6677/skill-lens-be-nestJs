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

/**
 * Seed SkillLens berisi data master SPK yang cukup besar.
 * Supaya aman dijalankan berulang di laptop lokal, tabel master/SPK
 * direset dulu sebelum seed. Ini mencegah error duplicate/row kosong
 * seperti master_tags tipe/label kosong.
 *
 * Set SEED_RESET=0 kalau benar-benar ingin menjalankan seed tanpa reset.
 */
const RESET_TABLES = [
  // data pilihan profil siswa
  'siswa_tag',
  'master_tags',

  // data SPK
  'criteria_weights',
  'weight_profiles',
  'source_tag_weights',
  'tag_category_scores',
  'tag_similarity_groups',
  'prestasi_level_weights',
  'prestasi_rank_weights',
  'prestasi_type_weights',
  'dataset_source_map',
  'source_references',

  // roadmap hasil generate dari alternatives
  'roadmap_step_detail',
  'roadmap_step',
  'roadmap_master',

  // alternatif rekomendasi
  'alternatives',
];

function assertSafeSeed(sqlText: string) {
  /**
   * ALTER TABLE, DROP TABLE, DROP PROCEDURE tetap diizinkan
   * karena migration/seed memang butuh itu.
   *
   * TRUNCATE/DELETE FROM tidak diblokir di file ini karena proses reset
   * sudah dikendalikan oleh script seed.
   */
  const blocked = ['DROP DATABASE', 'CREATE DATABASE'];

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

async function tableExists(connection: mysql.Connection, tableName: string) {
  const [rows] = await connection.query<any[]>(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName],
  );

  return Number(rows?.[0]?.total ?? 0) > 0;
}

async function resetMasterSpkTables(connection: mysql.Connection) {
  if (String(process.env.SEED_RESET ?? '1') === '0') {
    console.log('[SEED] Reset master/SPK dilewati karena SEED_RESET=0.');
    return;
  }

  console.log('[SEED] Reset master_tags + data SPK agar seed bersih...');

  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  try {
    for (const tableName of RESET_TABLES) {
      if (!(await tableExists(connection, tableName))) continue;

      await connection.query(`DELETE FROM \`${tableName}\``).catch(async () => {
        // Fallback untuk tabel dengan constraint/struktur aneh.
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      });

      await connection
        .query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = 1`)
        .catch(() => undefined);
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  console.log('[SEED] Reset selesai.');
}

async function cleanupMasterTags(connection: mysql.Connection) {
  if (!(await tableExists(connection, 'master_tags'))) return;

  await connection.query(`
    DELETE FROM master_tags
    WHERE tipe IS NULL
       OR label IS NULL
       OR TRIM(tipe) = ''
       OR TRIM(label) = ''
  `);

  // Hapus duplikat tipe+label, sisakan id paling kecil.
  await connection.query(`
    DELETE mt1
    FROM master_tags mt1
    JOIN master_tags mt2
      ON LOWER(TRIM(mt1.tipe)) = LOWER(TRIM(mt2.tipe))
     AND LOWER(TRIM(mt1.label)) = LOWER(TRIM(mt2.label))
     AND mt1.id > mt2.id
  `).catch(() => undefined);
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

    await resetMasterSpkTables(connection);

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

    await cleanupMasterTags(connection);

    console.log('[SEED] SkillLens seed selesai dijalankan.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[SEED] Gagal menjalankan seed:', error);
  process.exit(1);
});
