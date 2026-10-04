import type { PermissionContext } from './permissions.ts';

export interface PermissionContext {
  isAdministrator?: boolean;
  roleIds?: readonly string[];
}

export interface PermissionConfig {
  guildId: string;
  aiRoleId?: string;
  aiChannelId?: string;
  aiChannelOnly: boolean;
}

export class PermissionService {
  public constructor(private readonly config: PermissionConfig) {}

  public canUseAI(
    _userId: string,
    guildId: string | null,
    context: PermissionContext = {},
  ): boolean {
    if (!guildId) return true;
    if (guildId !== this.config.guildId) return false;
    if (!this.config.aiRoleId) return true;
    if (context.isAdministrator) return true;
    return context.roleIds?.includes(this.config.aiRoleId) ?? false;
  }

  public isAIChannelAllowed(guildId: string | null, channelId: string): boolean {
    if (!guildId) return true;
    if (guildId !== this.config.guildId) return false;
    if (!this.config.aiChannelOnly) return true;
    return this.config.aiChannelId === channelId;
  }

  public getAIOnlyChannelEnabled(guildId: string): boolean {
    return guildId === this.config.guildId && this.config.aiChannelOnly;
  }
}
