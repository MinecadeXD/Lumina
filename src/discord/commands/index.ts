import type { Command } from './types.ts';
import { askCommand } from './ask.ts';
import { configCommand } from './config.ts';
import { newChatCommand } from './newchat.ts';
import { clearCommand } from './clear.ts';
import { memoryCommand } from './memory.ts';

export function loadCommands(): readonly Command[] {
  return [askCommand, configCommand, newChatCommand, clearCommand, memoryCommand];
}