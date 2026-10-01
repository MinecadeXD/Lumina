import type { SQLiteDatabase } from '../database.ts';

export type ConversationScope = 'user-channel' | 'channel' | 'dm';

export interface ConversationRecord {
  id: number;
  scopeType: ConversationScope;
  userId: string | null;
  channelId: string | null;
  guildId: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface CreateConversationInput {
  scopeType: ConversationScope;
  userId?: string | null;
  channelId?: string | null;
  guildId?: string | null;
}

export class ConversationRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public create(input: CreateConversationInput): ConversationRecord {
    const now = new Date().toISOString();
    const result = this.database
      .prepare(
        `INSERT INTO conversations
         (scope_type, user_id, channel_id, guild_id, summary, created_at, updated_at, last_activity_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      )
      .run(
        input.scopeType,
        input.userId ?? null,
        input.channelId ?? null,
        input.guildId ?? null,
        now,
        now,
        now,
      );

    return this.getById(Number(result.lastInsertRowid))!;
  }

  public getById(id: number): ConversationRecord | null {
    const row = this.database
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(id) as RawConversation | undefined;

    return row ? this.map(row) : null;
  }

  public findActive(
    scopeType: ConversationScope,
    userId: string | null,
    channelId: string | null,
  ): ConversationRecord | null {
    const row = this.database
      .prepare(
        `SELECT * FROM conversations
         WHERE scope_type = ?
           AND user_id IS ?
           AND channel_id IS ?
         ORDER BY last_activity_at DESC
         LIMIT 1`,
      )
      .get(scopeType, userId, channelId) as RawConversation | undefined;

    return row ? this.map(row) : null;
  }

  public touch(id: number): void {
    const now = new Date().toISOString();
    this.database
      .prepare(
        'UPDATE conversations SET updated_at = ?, last_activity_at = ? WHERE id = ?',
      )
      .run(now, now, id);
  }

  public updateSummary(id: number, summary: string | null): void {
    this.database
      .prepare(
        'UPDATE conversations SET summary = ?, updated_at = ? WHERE id = ?',
      )
      .run(summary, new Date().toISOString(), id);
  }

  public delete(id: number): boolean {
    return this.database
      .prepare('DELETE FROM conversations WHERE id = ?')
      .run(id).changes > 0;
  }

  private map(row: RawConversation): ConversationRecord {
    return {
      id: row.id,
      scopeType: row.scope_type as ConversationScope,
      userId: row.user_id,
      channelId: row.channel_id,
      guildId: row.guild_id,
      summary: row.summary,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at,
    };
  }
}

interface RawConversation {
  id: number;
  scope_type: string;
  user_id: string | null;
  channel_id: string | null;
  guild_id: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}
