import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

export const clearCommand:Command={
 data:new SlashCommandBuilder().setName('clear').setDescription('Clear the current Lumina conversation.').addBooleanOption((option)=>option.setName('confirm').setDescription('Confirm deletion of the current conversation.').setRequired(true)),
 async execute(interaction:ChatInputCommandInteraction,messageRouter:MessageRouter){
   if(!interaction.options.getBoolean('confirm',true)){await interaction.reply({content:'Conversation was not cleared. Set confirm to true to delete the current conversation.',ephemeral:true});return;}
   if(interaction.guildId&&messageRouter.isDedicatedAIChannel(interaction.guildId,interaction.channelId)&&!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){await interaction.reply({content:'Only server managers can clear the shared dedicated AI conversation.',ephemeral:true});return;}
   const member=interaction.member;
   const cleared=messageRouter.clearCurrentConversation({content:'',userId:interaction.user.id,channelId:interaction.channelId,guildId:interaction.guildId,permissionContext:{isAdministrator:interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)??false,roleIds:member&&'roles' in member?(Array.isArray(member.roles)?member.roles:member.roles.cache.map((role)=>role.id)):[]}});
   await interaction.reply({content:cleared?'Current conversation and its messages were cleared.':'There is no active conversation to clear.',ephemeral:true});
 },
};