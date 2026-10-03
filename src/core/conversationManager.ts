import { ConversationRepository, type ConversationRecord, type ConversationScope } from '../database/index.ts';

export interface ConversationInput { userId:string; channelId:string; guildId:string|null; sharedChannel:boolean; existingConversationId?:number; }

export class ConversationManager {
  public constructor(private readonly conversations:ConversationRepository,private readonly inactivityMs=24*60*60*1000){}
  public getOrCreate(input:ConversationInput):ConversationRecord {
    this.expireInactive();
    if(input.existingConversationId!==undefined){const existing=this.conversations.getById(input.existingConversationId);if(existing&&this.canAccess(existing,input)){this.conversations.touch(existing.id);return existing;}}
    const {scopeType,userId}=this.scope(input);
    const active=this.conversations.findActive(scopeType,userId,input.channelId); if(active){this.conversations.touch(active.id);return active;}
    const restorable=this.conversations.findRestorable(scopeType,userId,input.channelId); if(restorable){this.conversations.touch(restorable.id);return restorable;}
    return this.conversations.create({scopeType,userId,channelId:input.channelId,guildId:input.guildId});
  }
  public startNew(input:ConversationInput):ConversationRecord {
    this.expireInactive(); const {scopeType,userId}=this.scope(input); const active=this.conversations.findActive(scopeType,userId,input.channelId); if(active)this.conversations.setStatus(active.id,'inactive');
    return this.conversations.create({scopeType,userId,channelId:input.channelId,guildId:input.guildId});
  }
  public clearCurrent(input:ConversationInput):boolean { const {scopeType,userId}=this.scope(input); const active=this.conversations.findActive(scopeType,userId,input.channelId); return active?this.conversations.delete(active.id):false; }
  private expireInactive():void { this.conversations.expireInactive(new Date(Date.now()-this.inactivityMs).toISOString()); }
  private scope(input:ConversationInput):{scopeType:ConversationScope;userId:string|null}{const scopeType:ConversationScope=input.guildId===null?'dm':input.sharedChannel?'channel':'user-channel';return{scopeType,userId:scopeType==='channel'?null:input.userId};}
  private canAccess(conversation:ConversationRecord,input:ConversationInput):boolean {if(conversation.scopeType==='channel')return conversation.guildId===input.guildId&&conversation.channelId===input.channelId;return conversation.guildId===input.guildId&&conversation.channelId===input.channelId&&conversation.userId===input.userId;}
}