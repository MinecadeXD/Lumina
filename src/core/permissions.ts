import type { Message } from 'discord.js';

export class PermissionService {
  public canUseAI(message: Message): boolean {
    return !message.author.bot;
  }
}
