export interface Migration { version: number; sql: string; }

export const migrations: readonly Migration[] = [
  { version: 1, sql: `
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, scope_type TEXT NOT NULL, scope_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (scope_type, scope_id, key));
      CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, scope_type TEXT NOT NULL, user_id TEXT, channel_id TEXT, guild_id TEXT, summary TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_activity_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_conversations_scope ON conversations (scope_type, user_id, channel_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_activity ON conversations (last_activity_at);
      CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, user_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, id);
      CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_memories_user ON memories (user_id, id);
    ` },
  { version: 2, sql: `
      ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
      CREATE INDEX IF NOT EXISTS idx_conversations_status_activity ON conversations (status, last_activity_at);
    ` },
  { version: 3, sql: `
      ALTER TABLE conversations ADD COLUMN summary_message_count INTEGER NOT NULL DEFAULT 0;
    ` },
];