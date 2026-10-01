import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { migrations } from './migrations.ts';
import { DatabaseError } from '../utils/errors.ts';

export type SQLiteDatabase = Database.Database;

export function createDatabase(databasePath = 'data/lumina.sqlite'): SQLiteDatabase {
  const absolutePath = resolve(databasePath);

  try {
    mkdirSync(dirname(absolutePath), { recursive: true });

    const database = new Database(absolutePath);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    database.pragma('busy_timeout = 5000');

    runMigrations(database);
    return database;
  } catch (error) {
    throw new DatabaseError(
      `Failed to initialize SQLite database at ${absolutePath}.`,
      error,
    );
  }
}

function runMigrations(database: SQLiteDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    database
      .prepare('SELECT version FROM schema_migrations ORDER BY version')
      .all()
      .map((row) => Number((row as { version: number }).version)),
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    const transaction = database.transaction(() => {
      database.exec(migration.sql);
      database
        .prepare(
          'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        )
        .run(migration.version, new Date().toISOString());
    });

    try {
      transaction();
    } catch (error) {
      throw new DatabaseError(
        `Database migration ${migration.version} failed.`,
        error,
      );
    }
  }
}

export function closeDatabase(database: SQLiteDatabase): void {
  try {
    if (database.open) {
      database.close();
    }
  } catch (error) {
    throw new DatabaseError('Failed to close SQLite database.', error);
  }
}
