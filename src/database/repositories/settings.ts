import type { SQLiteDatabase } from '../database.ts';

export interface SettingRecord {
  id: number;
  scopeType: string;
  scopeId: string;
  key: string;
  value: string;
  updatedAt: string;
}

export class SettingsRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public isHealthy(): boolean {
    try {
      this.database.prepare('SELECT 1 AS ok').get();
      return true;
    } catch {
      return false;
    }
  }

  public get(scopeType: string, scopeId: string, key: string): SettingRecord | null {
    const row = this.database
      .prepare(
        `SELECT id, scope_type, scope_id, key, value, updated_at
         FROM settings
         WHERE scope_type = ? AND scope_id = ? AND key = ?`,
      )
      .get(scopeType, scopeId, key) as
      | {
          id: number;
          scope_type: string;
          scope_id: string;
          key: string;
          value: string;
          updated_at: string;
        }
      | undefined;

    return row ? this.map(row) : null;
  }

  public set(scopeType: string, scopeId: string, key: string, value: string): void {
    const now = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO settings (scope_type, scope_id, key, value, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(scope_type, scope_id, key)
         DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(scopeType, scopeId, key, value, now);
  }

  public delete(scopeType: string, scopeId: string, key: string): boolean {
    return this.database
      .prepare(
        'DELETE FROM settings WHERE scope_type = ? AND scope_id = ? AND key = ?',
      )
      .run(scopeType, scopeId, key).changes > 0;
  }

  private map(row: {
    id: number;
    scope_type: string;
    scope_id: string;
    key: string;
    value: string;
    updated_at: string;
  }): SettingRecord {
    return {
      id: row.id,
      scopeType: row.scope_type,
      scopeId: row.scope_id,
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at,
    };
  }
}
