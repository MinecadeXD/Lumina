import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { MessageRouter } from '../../core/messageRouter.ts';
import type { MemoryManager } from '../../memory/memoryManager.ts';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (
    interaction: ChatInputCommandInteraction,
    messageRouter: MessageRouter,
    memoryManager: MemoryManager,
  ) => Promise<void>;
}
