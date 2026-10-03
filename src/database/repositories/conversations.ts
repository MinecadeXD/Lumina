import type { SQLiteDatabase } from '../database.ts';

export type ConversationScope = 'user-channel' | 'channel' | 'dm';
export type ConversationStatus = 'active' | 'inactive';

export interface ConversationRecord {
  id: number; scopeType: ConversationScope; status: ConversationStatus; userId: string | null; channelId: string | null; guildId: string | null;
  summary: string | null; summaryMessageCount: number; createdAt: string; updatedAt: string; lastActivityAt: string;
}
export interface CreateConversationInput { scopeType: ConversationScope; userId?: string | null; channelId?: string | null; guildId?: string | null; }

export class ConversationRepository {
  public constructor(private readonly database: SQLiteDatabase) {}
  public create(input: CreateConversationInput): ConversationRecord {
    const now = new Date().toISOString();
    const result = this.database.prepare(`INSERT INTO conversations (scope_type,user_id,channel_id,guild_id,summary,summary_message_count,created_at,updated_at,last_activity_at,status) VALUES (?,?,?,?,NULL,?,?,?,?,'active')`).run(input.scopeType,input.userId??null,input.channelId??null,input.guildId??null,0,now,now,now);
    return this.getById(Number(result.lastInsertRowid))!;
  }
  public getById(id: number): ConversationRecord | null {
    const row=this.database.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as RawConversation|undefined;
    return row?this.map(row):null;
  }
  public findActive(scopeType: ConversationScope,userId:string|null,channelId:string|null):ConversationRecord|null {
    const row=this.database.prepare(`SELECT * FROM conversations WHERE scope_type=? AND status='active' AND user_id IS ? AND channel_id IS ? ORDER BY last_activity_at DESC LIMIT 1`).get(scopeType,userId,channelId) as RawConversation|undefined;
    return row?this.map(row):null;
  }
  public findRestorable(scopeType: ConversationScope,userId:string|null,channelId:string|null):ConversationRecord|null {
    const row=this.database.prepare(`SELECT * FROM conversations WHERE scope_type=? AND status='inactive' AND user_id IS ? AND channel_id IS ? ORDER BY last_activity_at DESC LIMIT 1`).get(scopeType,userId,channelId) as RawConversation|undefined;
    return row?this.map(row):null;
  }
  public setStatus(id:number,status:ConversationStatus):void { this.database.prepare('UPDATE conversations SET status=?,updated_at=? WHERE id=?').run(status,new Date().toISOString(),id); }
  public expireInactive(before:string):number { return this.database.prepare("UPDATE conversations SET status='inactive',updated_at=? WHERE status='active' AND last_activity_at < ?").run(new Date().toISOString(),before).changes; }
  public touch(id:number):void { const now=new Date().toISOString(); this.database.prepare("UPDATE conversations SET updated_at=?,last_activity_at=?,status='active' WHERE id=?").run(now,now,id); }
  public updateSummary(id:number,summary:string|null,summaryMessageCount:number):void { this.database.prepare('UPDATE conversations SET summary=?,summary_message_count=?,updated_at=? WHERE id=?').run(summary,summaryMessageCount,new Date().toISOString(),id); }
  public delete(id:number):boolean { return this.database.prepare('DELETE FROM conversations WHERE id=?').run(id).changes>0; }
  private map(row:RawConversation):ConversationRecord { return {id:row.id,scopeType:row.scope_type as ConversationScope,status:row.status as ConversationStatus,userId:row.user_id,channelId:row.channel_id,guildId:row.guild_id,summary:row.summary,summaryMessageCount:row.summary_message_count,createdAt:row.created_at,updatedAt:row.updated_at,lastActivityAt:row.last_activity_at}; }
}
interface RawConversation { id:number;scope_type:string;status:string;user_id:string|null;channel_id:string|null;guild_id:string|null;summary:string|null;summary_message_count:number;created_at:string;updated_at:string;last_activity_at:string; }