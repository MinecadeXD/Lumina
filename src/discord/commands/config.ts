import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

const PROVIDERS = ['gemini','groq','openrouter'] as const;

export const configCommand: Command = {
  data: new SlashCommandBuilder().setName('config').setDescription('Configure Lumina for this server.')
    .addSubcommand((s)=>s.setName('provider').setDescription('Set the server AI provider.').addStringOption((o)=>o.setName('provider').setDescription('AI provider').setRequired(true).addChoices(...PROVIDERS.map((p)=>({name:p,value:p})))))
    .addSubcommand((s)=>s.setName('provider-clear').setDescription('Use the host default AI provider.'))
    .addSubcommand((s)=>s.setName('model').setDescription('Set the server AI model.').addStringOption((o)=>o.setName('model').setDescription('Model identifier').setRequired(true).setMaxLength(200)))
    .addSubcommand((s)=>s.setName('model-clear').setDescription('Use the host default AI model.'))
    .addSubcommand((s)=>s.setName('ai-channel').setDescription('Set the dedicated AI channel.').addChannelOption((o)=>o.setName('channel').setDescription('Channel where Lumina responds automatically.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s)=>s.setName('ai-channel-clear').setDescription('Disable the dedicated AI channel.'))
    .addSubcommand((s)=>s.setName('ai-channel-only').setDescription('Restrict Lumina to the configured AI channel.').addBooleanOption((o)=>o.setName('enabled').setDescription('Enable channel restriction').setRequired(true)))
    .addSubcommand((s)=>s.setName('ai-role').setDescription('Require a role to use Lumina.').addRoleOption((o)=>o.setName('role').setDescription('Required role').setRequired(true)))
    .addSubcommand((s)=>s.setName('ai-role-clear').setDescription('Allow all server members to use Lumina.'))
    .addSubcommand((s)=>s.setName('personality').setDescription('Set server-specific instructions.').addStringOption((o)=>o.setName('text').setDescription('Instructions').setRequired(true).setMaxLength(1500)))
    .addSubcommand((s)=>s.setName('personality-clear').setDescription('Remove server personality customization.'))
    .addSubcommand((s)=>s.setName('personality-show').setDescription('Show server personality status.'))
    .addSubcommand((s)=>s.setName('memory').setDescription('Set automatic memory behavior.').addStringOption((o)=>o.setName('behavior').setDescription('Automatic memory mode').setRequired(true).addChoices({name:'conservative',value:'conservative'},{name:'off',value:'off'})))
    .addSubcommand((s)=>s.setName('rate-limits').setDescription('Configure request limits per time window.')
      .addIntegerOption((o)=>o.setName('user').setDescription('Requests per user').setRequired(true).setMinValue(1).setMaxValue(1000))
      .addIntegerOption((o)=>o.setName('server').setDescription('Requests per server').setRequired(true).setMinValue(1).setMaxValue(10000))
      .addIntegerOption((o)=>o.setName('provider').setDescription('Requests per provider').setRequired(true).setMinValue(1).setMaxValue(10000))
      .addIntegerOption((o)=>o.setName('window').setDescription('Window in seconds').setRequired(true).setMinValue(10).setMaxValue(86400)))
    .addSubcommand((s)=>s.setName('show').setDescription('Show Lumina server configuration.')),

  async execute(interaction: ChatInputCommandInteraction, messageRouter: MessageRouter) {
    if (!interaction.inGuild() || !interaction.guildId) { await interaction.reply({content:'This command can only be used in a server.',ephemeral:true}); return; }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) { await interaction.reply({content:'You need the Manage Server permission to change Lumina configuration.',ephemeral:true}); return; }
    const guildId=interaction.guildId; const sub=interaction.options.getSubcommand();
    if(sub==='provider'){const provider=interaction.options.getString('provider',true);messageRouter.setAIProvider(guildId,provider);await interaction.reply({content:'Server AI provider set to `'+provider+'`.',ephemeral:true});return;}
    if(sub==='provider-clear'){const cleared=messageRouter.clearAIProvider(guildId);await interaction.reply({content:cleared?'Server AI provider override cleared.':'No server AI provider override was set.',ephemeral:true});return;}
    if(sub==='model'){messageRouter.setAIModel(guildId,interaction.options.getString('model',true));await interaction.reply({content:'Server AI model override saved.',ephemeral:true});return;}
    if(sub==='model-clear'){const cleared=messageRouter.clearAIModel(guildId);await interaction.reply({content:cleared?'Server AI model override cleared.':'No server AI model override was set.',ephemeral:true});return;}
    if(sub==='ai-channel'){const channel=interaction.options.getChannel('channel',true);messageRouter.setDedicatedAIChannel(guildId,channel.id);await interaction.reply({content:'Dedicated AI channel set to <#'+channel.id+'>.',ephemeral:true});return;}
    if(sub==='ai-channel-clear'){const cleared=messageRouter.clearDedicatedAIChannel(guildId);await interaction.reply({content:cleared?'Dedicated AI channel disabled.':'No dedicated AI channel was configured.',ephemeral:true});return;}
    if(sub==='ai-channel-only'){const enabled=interaction.options.getBoolean('enabled',true);if(enabled&&!messageRouter.getDedicatedAIChannel(guildId)){await interaction.reply({content:'Set a dedicated AI channel first.',ephemeral:true});return;}messageRouter.setAIChannelOnly(guildId,enabled);await interaction.reply({content:enabled?'Lumina is now restricted to the configured AI channel.':'AI-channel restriction disabled.',ephemeral:true});return;}
    if(sub==='ai-role'){const role=interaction.options.getRole('role',true);messageRouter.setAIRole(guildId,role.id);await interaction.reply({content:'AI usage now requires <@&'+role.id+'> (server administrators can still use Lumina).',allowedMentions:{parse:[]},ephemeral:true});return;}
    if(sub==='ai-role-clear'){const cleared=messageRouter.clearAIRole(guildId);await interaction.reply({content:cleared?'AI role restriction cleared.':'No AI role restriction was configured.',ephemeral:true});return;}
    if(sub==='personality'){messageRouter.setServerPersonality(guildId,interaction.options.getString('text',true));await interaction.reply({content:'Server personality customization saved.',ephemeral:true});return;}
    if(sub==='personality-clear'){const cleared=messageRouter.clearServerPersonality(guildId);await interaction.reply({content:cleared?'Server personality customization removed.':'No server personality customization was configured.',ephemeral:true});return;}
    if(sub==='personality-show'){const personality=messageRouter.getServerPersonality(guildId);await interaction.reply({content:personality?'Current server personality customization:\n'+personality:'No server personality customization is set.',ephemeral:true});return;}
    if(sub==='memory'){const behavior=interaction.options.getString('behavior',true) as 'conservative'|'off';messageRouter.setMemoryBehavior(guildId,behavior);await interaction.reply({content:'Automatic memory behavior set to `'+behavior+'`.',ephemeral:true});return;}
    if(sub==='rate-limits'){messageRouter.setRateLimits(guildId,{user:interaction.options.getInteger('user',true),server:interaction.options.getInteger('server',true),provider:interaction.options.getInteger('provider',true),windowSeconds:interaction.options.getInteger('window',true)});await interaction.reply({content:'Rate limits saved for this server.',ephemeral:true});return;}
    const limits=messageRouter.getRateLimits(guildId);await interaction.reply({content:'Lumina configuration:\nProvider: '+(messageRouter.getAIProvider(guildId)??'host default')+'\nModel: '+(messageRouter.getAIModel(guildId)??'host default')+'\nAI channel: '+(messageRouter.getDedicatedAIChannel(guildId)?'<#'+messageRouter.getDedicatedAIChannel(guildId)+'>':'not set')+'\nAI-channel only: '+messageRouter.getAIChannelOnly(guildId)+'\nRate limits: user '+limits.user+', server '+limits.server+', provider '+limits.provider+' per '+limits.windowSeconds+'s\nMemory: '+messageRouter.getMemoryBehavior(guildId),ephemeral:true});
  },
};