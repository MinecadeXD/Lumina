import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';
import { respondToInteraction } from '../responses/responder.ts';

export const askCommand: Command = {
  data:new SlashCommandBuilder().setName('ask').setDescription('Send a message to Lumina.').addStringOption((option)=>option.setName('message').setDescription('What would you like to ask Lumina?').setRequired(true)),
  async execute(interaction:ChatInputCommandInteraction,messageRouter:MessageRouter){
    await interaction.deferReply();
    const content=interaction.options.getString('message',true);
    const member=interaction.member;
    const result=await messageRouter.process({content,userId:interaction.user.id,channelId:interaction.channelId,guildId:interaction.guildId,permissionContext:{isAdministrator:interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)??false,roleIds:member&&'roles' in member?(Array.isArray(member.roles)?member.roles:member.roles.cache.map((role)=>role.id)):[]}});
    await respondToInteraction(interaction,result.content);
  },
};