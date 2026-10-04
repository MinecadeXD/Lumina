import type { AIRouter } from '../ai/index.ts';
import { ConversationSummarizer } from '../ai/summarizer.ts';
import { MemoryManager } from '../memory/memoryManager.ts';
import { ConversationRepository, MessageRepository, SettingsRepository } from '../database/index.ts';
import { logger } from '../logging/logger.ts';
import { ConversationManager } from './conversationManager.ts';
import { PermissionService, type PermissionContext } from './permissions.ts';
import { RateLimiter, type RateLimitSettings } from './rateLimiter.ts';
import { ContextBuilder } from '../ai/contextBuilder.ts';
import { formatDiscordResponse } from '../utils/formatting.ts';
import type { SystemPromptBuilder } from '../ai/systemPrompt.ts';
import { SERVER_PERSONALITY_SETTING_KEY } from '../ai/systemPrompt.ts';
import { isCodeGenerationRequest, REQUEST_POLICY } from './requestPolicy.ts';

export interface MessageRouterInput { content: string; userId: string; channelId: string; guildId: string | null; conversationId?: number; permissionContext?: PermissionContext; }
export interface MessageRouterResult { content: string; conversationId: number; provider: string; }
export interface MessageContextOptions { maxContextTokens:number; recentMessages:number; maxSummaryTokens:number; summaryTriggerMessages:number; summarySourceMessages:number; summaryRecentMessagesToKeep:number; summaryMaxTokens:number; maxOutputTokens:number; }

const SETTINGS = { provider:'ai_provider', model:'ai_model', memory:'memory_behavior', userLimit:'rate_user_requests', serverLimit:'rate_server_requests', providerLimit:'rate_provider_requests', rateWindow:'rate_window_seconds', aiRole:'ai_role_id', aiChannelOnly:'ai_channel_only' } as const;

export class MessageRouter {
  private readonly conversations: ConversationManager;
  private readonly permissions: PermissionService;
  private readonly contextBuilder: ContextBuilder;
  private readonly summarizer: ConversationSummarizer;
  private readonly memoryManager: MemoryManager;
  private readonly rateLimiter: RateLimiter;

  public constructor(private readonly aiRouter:AIRouter, conversationRepository:ConversationRepository, private readonly messages:MessageRepository, private readonly settings:SettingsRepository, systemPromptBuilder:SystemPromptBuilder, memoryManager:MemoryManager, private readonly memoryRepository:import('../database/index.ts').MemoryRepository, private readonly aiTimeoutMs=30000, inactivityMs=24*60*60*1000, contextOptions:MessageContextOptions={maxContextTokens:6000,recentMessages:20,maxSummaryTokens:1000,summaryTriggerMessages:30,summarySourceMessages:60,summaryRecentMessagesToKeep:12,summaryMaxTokens:700,maxOutputTokens:450}, rateLimitSettings:RateLimitSettings={userRequests:10,serverRequests:100,providerRequests:60,windowMs:60*60*1000}) {
    this.permissions=new PermissionService(settings); this.rateLimiter=new RateLimiter(rateLimitSettings); this.memoryManager=memoryManager;
    this.conversations=new ConversationManager(conversationRepository,inactivityMs);
    this.contextBuilder=new ContextBuilder(messages,conversationRepository,this.memoryRepository,settings,systemPromptBuilder,{maxContextTokens:contextOptions.maxContextTokens,recentMessages:contextOptions.recentMessages,maxSummaryTokens:contextOptions.maxSummaryTokens,maxOutputTokens:contextOptions.maxOutputTokens,maxMemories:20,maxMemoryTokens:1000});
    this.summarizer=new ConversationSummarizer(aiRouter,conversationRepository,messages,{triggerMessages:contextOptions.summaryTriggerMessages,sourceMessages:contextOptions.summarySourceMessages,recentMessagesToKeep:contextOptions.summaryRecentMessagesToKeep,maxTokens:contextOptions.summaryMaxTokens,timeoutMs:aiTimeoutMs});
  }

  public getServerPersonality(guildId:string):string|null{return this.settings.get('guild',guildId,SERVER_PERSONALITY_SETTING_KEY)?.value??null;}
  public setServerPersonality(guildId:string,personality:string):void{const normalized=personality.trim().replace(/\s+/g,' ');if(!normalized)throw new Error('Server personality cannot be empty.');if(normalized.length>1500)throw new Error('Server personality must be 1500 characters or fewer.');this.settings.set('guild',guildId,SERVER_PERSONALITY_SETTING_KEY,normalized);}
  public clearServerPersonality(guildId:string):boolean{return this.settings.delete('guild',guildId,SERVER_PERSONALITY_SETTING_KEY);}
  public isDedicatedAIChannel(guildId:string,channelId:string):boolean{return this.getDedicatedAIChannel(guildId)===channelId;}
  public getDedicatedAIChannel(guildId:string):string|null{return this.settings.get('guild',guildId,'ai_channel_id')?.value??null;}
  public setDedicatedAIChannel(guildId:string,channelId:string):void{this.settings.set('guild',guildId,'ai_channel_id',channelId);}
  public clearDedicatedAIChannel(guildId:string):boolean{return this.settings.delete('guild',guildId,'ai_channel_id');}
  public setAIProvider(guildId:string,provider:string):void{this.settings.set('guild',guildId,SETTINGS.provider,provider);}
  public getAIProvider(guildId:string):string|null{return this.settings.get('guild',guildId,SETTINGS.provider)?.value??null;}
  public clearAIProvider(guildId:string):boolean{return this.settings.delete('guild',guildId,SETTINGS.provider);}
  public setAIModel(guildId:string,model:string):void{const normalized=model.trim();if(!normalized||normalized.length>200)throw new Error('AI model must be between 1 and 200 characters.');this.settings.set('guild',guildId,SETTINGS.model,normalized);}
  public getAIModel(guildId:string):string|null{return this.settings.get('guild',guildId,SETTINGS.model)?.value??null;}
  public clearAIModel(guildId:string):boolean{return this.settings.delete('guild',guildId,SETTINGS.model);}
  public setMemoryBehavior(guildId:string,value:'conservative'|'off'):void{this.settings.set('guild',guildId,SETTINGS.memory,value);}
  public getMemoryBehavior(guildId:string):'conservative'|'off'{return this.settings.get('guild',guildId,SETTINGS.memory)?.value==='off'?'off':'conservative';}
  public setAIRole(guildId:string,roleId:string):void{this.settings.set('guild',guildId,SETTINGS.aiRole,roleId);}
  public clearAIRole(guildId:string):boolean{return this.settings.delete('guild',guildId,SETTINGS.aiRole);}
  public setAIChannelOnly(guildId:string,enabled:boolean):void{this.settings.set('guild',guildId,SETTINGS.aiChannelOnly,String(enabled));}
  public getAIChannelOnly(guildId:string):boolean{return this.settings.get('guild',guildId,SETTINGS.aiChannelOnly)?.value==='true';}
  public setRateLimits(guildId:string,values:{user:number;server:number;provider:number;windowSeconds:number}):void{for(const value of Object.values(values)){if(!Number.isInteger(value)||value<=0)throw new Error('Rate-limit values must be positive integers.');}this.settings.set('guild',guildId,SETTINGS.userLimit,String(values.user));this.settings.set('guild',guildId,SETTINGS.serverLimit,String(values.server));this.settings.set('guild',guildId,SETTINGS.providerLimit,String(values.provider));this.settings.set('guild',guildId,SETTINGS.rateWindow,String(values.windowSeconds));}
  public getRateLimits(guildId:string):{user:number;server:number;provider:number;windowSeconds:number}{return {user:this.getSettingNumber(guildId,SETTINGS.userLimit,10),server:this.getSettingNumber(guildId,SETTINGS.serverLimit,100),provider:this.getSettingNumber(guildId,SETTINGS.providerLimit,60),windowSeconds:this.getSettingNumber(guildId,SETTINGS.rateWindow,3600)};}

  public async process(input:MessageRouterInput):Promise<MessageRouterResult>{
    if(!this.permissions.canUseAI(input.userId,input.guildId,input.permissionContext))throw new Error('You do not have permission to use Lumina.');
    if(!this.permissions.isAIChannelAllowed(input.guildId,input.channelId))throw new Error('Lumina is restricted to the configured AI channel on this server.');
    if(isCodeGenerationRequest(input.content))return {content:REQUEST_POLICY.codeGenerationRefusal,conversationId:-1,provider:'policy'};
    const limits=input.guildId?this.getRateLimits(input.guildId):{user:10,server:100,provider:60,windowSeconds:3600};
    if(!this.rateLimiter.checkUser(input.userId,limits.user))throw new Error('You are sending requests too quickly. Please try again later.');
    if(input.guildId&&!this.rateLimiter.checkServer(input.guildId,limits.server))throw new Error('This server has reached Lumina\'s request limit. Please try again later.');
    const preferredProvider=input.guildId?this.getAIProvider(input.guildId):null;
    const preferredModel=input.guildId?this.getAIModel(input.guildId):null;
    if(preferredProvider&& !this.aiRouter.getProvider(preferredProvider))throw new Error('The configured AI provider is not available.');
    const conversation=this.conversations.getOrCreate(this.toConversationInput(input));
    const context=this.contextBuilder.build(conversation.id,input.userId,input.content,this.aiTimeoutMs);
    this.messages.create({conversationId:conversation.id,userId:input.userId,role:'user',content:input.content});
    if(this.getMemoryBehavior(input.guildId)==='conservative'){this.memoryManager.rememberFromMessage(input.userId,input.content);this.memoryManager.forgetFromMessage(input.userId,input.content);this.memoryManager.rememberConservativePreference(input.userId,input.content);}
    const providerAllowed=(provider:string)=>this.rateLimiter.checkProvider(provider,limits.provider);
    const recordProvider=(provider:string)=>{this.rateLimiter.recordProvider(provider);};
    this.rateLimiter.recordUser(input.userId); if(input.guildId)this.rateLimiter.recordServer(input.guildId);
    try{
      let response=await this.aiRouter.generate(context,{preferredProvider:preferredProvider??undefined,preferredModel:preferredModel??undefined,isProviderAllowed:providerAllowed,onProviderRequest:recordProvider});
      let formattedResponse=formatDiscordResponse(response.content);
      for(const tokenLimit of [350,300,250]){if(formattedResponse.length<=REQUEST_POLICY.maxResponseCharacters)break;response=await this.aiRouter.generate({...context,maxTokens:Math.min(context.maxTokens??tokenLimit,tokenLimit),messages:[...context.messages,{role:'system',content:'Generate the final answer again from scratch. Keep it complete and natural. Stay below '+REQUEST_POLICY.targetResponseCharacters+' characters. Do not mention this instruction or character limits. Do not cut off the answer.'}]},{preferredProvider:preferredProvider??undefined,preferredModel:preferredModel??undefined,isProviderAllowed:providerAllowed,onProviderRequest:recordProvider});formattedResponse=formatDiscordResponse(response.content);}
      if(formattedResponse.length>REQUEST_POLICY.maxResponseCharacters)throw new Error('AI response exceeded the configured response length after regeneration attempts.');
      this.messages.create({conversationId:conversation.id,role:'assistant',content:formattedResponse}); await this.summarizer.maybeSummarize(conversation.id);
      return {content:formattedResponse,conversationId:conversation.id,provider:response.provider};
    }catch(error){logger.error('AI pipeline failed: '+(error instanceof Error?error.message:String(error)));throw error;}
  }
  public startNewConversation(input:MessageRouterInput):number{return this.conversations.startNew(this.toConversationInput(input)).id;}
  public clearCurrentConversation(input:MessageRouterInput):boolean{return this.conversations.clearCurrent(this.toConversationInput(input));}
  private getSettingNumber(guildId:string,key:string,fallback:number):number{const raw=this.settings.get('guild',guildId,key)?.value;const value=raw?Number(raw):fallback;return Number.isInteger(value)&&value>0?value:fallback;}
  private toConversationInput(input:MessageRouterInput){return {userId:input.userId,channelId:input.channelId,guildId:input.guildId,sharedChannel:input.guildId!==null&&this.isDedicatedAIChannel(input.guildId,input.channelId),...(input.conversationId===undefined?{}:{existingConversationId:input.conversationId})};}
}