/**
 * Optional Redis client with safe in-memory fallback
 */

const memoryStore = new Map<string, any>();

export const redis = {
  async ping(): Promise<string> {
    return 'PONG';
  },
  async get<T = any>(key: string): Promise<T | null> {
    return (memoryStore.get(key) as T) ?? null;
  },
  async set(key: string, value: any, options?: { ex?: number }): Promise<string> {
    memoryStore.set(key, value);
    return 'OK';
  },
  async del(key: string): Promise<number> {
    const existed = memoryStore.has(key);
    memoryStore.delete(key);
    return existed ? 1 : 0;
  },
};
