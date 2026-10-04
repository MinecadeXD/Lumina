import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

export const newChatCommand:Command={
 data:new SlashCommandBuilder().setName('newchat').setDescription('Start a new Lumina conversation.'),
 async execute(interaction:ChatInputCommandInteraction,messageRouter:MessageRouter){
   if(interaction.guildId&&messageRouter.isDedicatedAIChannel(interaction.guildId,interaction.channelId)&&!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){await interaction.reply({content:'Only server managers can start a new shared conversation in the dedicated AI channel.',ephemeral:true});return;}
   const member=interaction.member;
   const id=messageRouter.startNewConversation({content:'',userId:interaction.user.id,channelId:interaction.channelId,guildId:interaction.guildId,permissionContext:{isAdministrator:interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)??false,roleIds:member&&'roles' in member?(Array.isArray(member.roles)?member.roles:member.roles.cache.map((role)=>role.id)):[]}});
   await interaction.reply({content:`Started a new conversation (#${id}).`,ephemeral:true});
 },
};