import { MemoryRepository } from '../database/index.ts';

export class MemoryManager {
  public constructor(private readonly memories: MemoryRepository) {}

  public list(userId: string) {
    return this.memories.listByUser(userId);
  }

  public add(userId: string, content: string) {
    const normalized = this.normalize(content);
    if (!normalized) throw new Error('Memory cannot be empty.');
    if (normalized.length > 500) throw new Error('Memory is too long. Keep memories concise.');
    return this.memories.create(userId, normalized);
  }

  public remove(userId: string, id: number): boolean {
    return this.memories.deleteByIdForUser(id, userId);
  }

  public clear(userId: string): number {
    return this.memories.deleteAllForUser(userId);
  }

  private normalize(content: string): string {
    return content.trim().replace(/\s+/g, ' ');
  }
}
