import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from './types.ts';
import type { MessageRouter } from '../../core/messageRouter.ts';

export const clearCommand:Command={
  data:new SlashCommandBuilder().setName('clear').setDescription('Clear the current Lumina conversation.').addBooleanOption((option)=>option.setName('confirm').setDescription('Confirm deletion of the current conversation.').setRequired(true)),
  async execute(interaction:ChatInputCommandInteraction,messageRouter:MessageRouter){
    if(!interaction.options.getBoolean('confirm',true)){await interaction.reply({content:'Conversation was not cleared. Set confirm to true to delete the current conversation.',ephemeral:true});return;}
    const cleared=messageRouter.clearCurrentConversation({content:'',userId:interaction.user.id,channelId:interaction.channelId,guildId:interaction.guildId});
    await interaction.reply({content:cleared?'Current conversation and its messages were cleared.':'There is no active conversation to clear.',ephemeral:true});
  },
};