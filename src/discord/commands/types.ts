import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { MessageRouter } from '../../core/messageRouter.ts';

export interface Command {
  data: SlashCommandBuilder;
  execute: (
    interaction: ChatInputCommandInteraction,
    messageRouter: MessageRouter,
  ) => Promise<void>;
}
