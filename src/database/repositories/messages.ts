import type { SQLiteDatabase } from '../database.ts';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageRecord {
  id: number;
  conversationId: number;
  userId: string | null;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface CreateMessageInput {
  conversationId: number;
  userId?: string | null;
  role: MessageRole;
  content: string;
}

export class MessageRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public create(input: CreateMessageInput): MessageRecord {
    const createdAt = new Date().toISOString();
    const result = this.database
      .prepare(
        `INSERT INTO messages
         (conversation_id, user_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.conversationId,
        input.userId ?? null,
        input.role,
        input.content,
        createdAt,
      );

    return this.getById(Number(result.lastInsertRowid))!;
  }

  public getById(id: number): MessageRecord | null {
    const row = this.database
      .prepare('SELECT * FROM messages WHERE id = ?')
      .get(id) as RawMessage | undefined;

    return row ? this.map(row) : null;
  }

  public listByConversation(
    conversationId: number,
    limit = 50,
  ): MessageRecord[] {
    const safeLimit = Math.max(1, Math.floor(limit));
    const rows = this.database
      .prepare(
        `SELECT * FROM (
           SELECT * FROM messages
           WHERE conversation_id = ?
           ORDER BY id DESC
           LIMIT ?
         ) ORDER BY id ASC`,
      )
      .all(conversationId, safeLimit) as RawMessage[];

    return rows.map((row) => this.map(row));
  }

  public deleteByConversation(conversationId: number): number {
    return this.database
      .prepare('DELETE FROM messages WHERE conversation_id = ?')
      .run(conversationId).changes;
  }

  private map(row: RawMessage): MessageRecord {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      role: row.role as MessageRole,
      content: row.content,
      createdAt: row.created_at,
    };
  }
}

interface RawMessage {
  id: number;
  conversation_id: number;
  user_id: string | null;
  role: string;
  content: string;
  created_at: string;
}
