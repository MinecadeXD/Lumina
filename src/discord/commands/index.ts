import type { Command } from './types.ts';
import { askCommand } from './ask.ts';

export function loadCommands(): readonly Command[] {
  return [askCommand];
}