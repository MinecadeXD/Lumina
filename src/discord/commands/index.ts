import type { Command } from './types.ts';
import { askCommand } from './ask.ts';
import { newChatCommand } from './newchat.ts';
import { clearCommand } from './clear.ts';
import { memoryCommand } from './memory.ts';
import { statusCommand } from './status.ts';

export function loadCommands(): readonly Command[] {
  return [askCommand, newChatCommand, clearCommand, memoryCommand, statusCommand];
}
