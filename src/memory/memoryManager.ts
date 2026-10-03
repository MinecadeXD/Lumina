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

  public rememberFromMessage(userId: string, content: string): boolean {
    const match = content.match(/^\s*(?:remember that|remember)\s+(.+)$/i);
    if (!match) return false;
    const memory = match[1]?.trim();
    if (!memory || memory.length > 500) return false;
    this.add(userId, memory);
    return true;
  }

  public rememberConservativePreference(userId: string, content: string): boolean {
    const match = content.match(/^\s*(?:i prefer|i use|my favorite)\s+(.+)$/i);
    if (!match) return false;
    const value = match[0].trim();
    if (value.length > 200) return false;
    this.add(userId, value);
    return true;
  }

  public forgetFromMessage(userId: string, content: string): boolean {
    const match = content.match(/^\s*(?:forget that|forget|don't remember that|do not remember that)\s+(.+)$/i);
    if (!match) return false;
    const target = match[1]?.trim().toLowerCase();
    if (!target) return false;
    const memories = this.list(userId);
    const matchMemory = memories.find((memory) => memory.content.toLowerCase() === target);
    return matchMemory ? this.remove(userId, matchMemory.id) : false;
  }

  public clear(userId: string): number {
    return this.memories.deleteAllForUser(userId);
  }

  private normalize(content: string): string {
    return content.trim().replace(/\s+/g, ' ');
  }
}
