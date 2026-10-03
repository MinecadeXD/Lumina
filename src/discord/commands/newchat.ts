import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

export const newChatCommand:Command={
  data:new SlashCommandBuilder().setName('newchat').setDescription('Start a new Lumina conversation.'),
  async execute(interaction:ChatInputCommandInteraction,messageRouter:MessageRouter){
    const id=messageRouter.startNewConversation({content:'',userId:interaction.user.id,channelId:interaction.channelId,guildId:interaction.guildId});
    await interaction.reply({content:`Started a new conversation (#${id}).`,ephemeral:true});
  },
};