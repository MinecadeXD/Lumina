import type { Command } from './types.ts';
import { askCommand } from './ask.ts';
import { configCommand } from './config.ts';

export function loadCommands(): readonly Command[] {
  return [askCommand, configCommand];
}