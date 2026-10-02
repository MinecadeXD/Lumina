export class PermissionService {
  public canUseAI(_userId: string, _guildId: string | null): boolean {
    return true;
  }
}
