import type { SQLiteDatabase } from '../database.ts';

export interface MemoryRecord {
  id: number;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class MemoryRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public create(userId: string, content: string): MemoryRecord {
    const now = new Date().toISOString();
    const result = this.database
      .prepare(
        'INSERT INTO memories (user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
      )
      .run(userId, content, now, now);

    return this.getById(Number(result.lastInsertRowid))!;
  }

  public getById(id: number): MemoryRecord | null {
    const row = this.database
      .prepare('SELECT * FROM memories WHERE id = ?')
      .get(id) as RawMemory | undefined;

    return row ? this.map(row) : null;
  }

  public listByUser(userId: string, limit = 100): MemoryRecord[] {
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = this.database
      .prepare(
        'SELECT * FROM memories WHERE user_id = ? ORDER BY id DESC LIMIT ?',
      )
      .all(userId, safeLimit) as RawMemory[];

    return rows.map((row) => this.map(row));
  }

  public deleteByIdForUser(id: number, userId: string): boolean {
    return this.database
      .prepare('DELETE FROM memories WHERE id = ? AND user_id = ?')
      .run(id, userId).changes > 0;
  }

  public deleteAllForUser(userId: string): number {
    return this.database
      .prepare('DELETE FROM memories WHERE user_id = ?')
      .run(userId).changes;
  }

  private map(row: RawMemory): MemoryRecord {
    return {
      id: row.id,
      userId: row.user_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

interface RawMemory {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
