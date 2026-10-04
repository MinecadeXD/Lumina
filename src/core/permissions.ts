import type { SettingsRepository } from '../database/index.ts';

export interface PermissionContext {
  isAdministrator?: boolean;
  roleIds?: readonly string[];
}

export class PermissionService {
  public constructor(private readonly settings: SettingsRepository) {}

  public canUseAI(
    userId: string,
    guildId: string | null,
    context: PermissionContext = {},
  ): boolean {
    if (!guildId) return true;
    const roleId = this.settings.get('guild', guildId, 'ai_role_id')?.value;
    if (!roleId) return true;
    if (context.isAdministrator) return true;
    return context.roleIds?.includes(roleId) ?? false;
  }

  public isAIChannelAllowed(guildId: string | null, channelId: string): boolean {
    if (!guildId) return true;
    const only = this.settings.get('guild', guildId, 'ai_channel_only')?.value === 'true';
    if (!only) return true;
    const configured = this.settings.get('guild', guildId, 'ai_channel_id')?.value;
    return configured === channelId;
  }

  public getAIOnlyChannelEnabled(guildId: string): boolean {
    return this.settings.get('guild', guildId, 'ai_channel_only')?.value === 'true';
  }
}