import type { Command } from './types.js';
import { askCommand } from './ask.js';

export function loadCommands(): readonly Command[] {
  return [askCommand];
}