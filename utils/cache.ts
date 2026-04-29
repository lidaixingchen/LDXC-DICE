export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  size: number;
}

export interface CacheOptions {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  onEvict?: (key: string, entry: CacheEntry<unknown>) => void;
}

const DEFAULT_OPTIONS: CacheOptions = {
  maxSize: 100,
  defaultTTL: 60000,
  cleanupInterval: 30000,
};

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private options: CacheOptions;
  private currentSize: number = 0;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startCleanup();
  }

  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.delete(key);
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl ?? this.options.defaultTTL;
    const size = this.estimateSize(value);

    if (size > this.options.maxSize) {
      console.warn(`[Cache] Value too large to cache: ${size} > ${this.options.maxSize}`);
      return;
    }

    while (this.currentSize + size > this.options.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      expiresAt: now + entryTTL,
      hits: existing?.hits || 0,
      size,
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (entry.expiresAt < now) {
      this.delete(key);
      return undefined;
    }

    entry.hits++;
    entry.timestamp = now;

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt < Date.now()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.currentSize -= entry.size;

    if (this.options.onEvict) {
      this.options.onEvict(key, entry);
    }

    return this.cache.delete(key);
  }

  clear(): void {
    if (this.options.onEvict) {
      for (const [key, entry] of this.cache) {
        this.options.onEvict(key, entry);
      }
    }

    this.cache.clear();
    this.currentSize = 0;
  }

  size(): number {
    return this.currentSize;
  }

  count(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private estimateSize(value: T): number {
    if (typeof value === 'string') {
      return value.length * 2;
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (value === null || value === undefined) {
      return 0;
    }

    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 100;
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

export class Memoizer {
  private static caches: Map<string, LRUCache<unknown>> = new Map();

  static memoize<T extends (...args: unknown[]) => unknown>(
    fn: T,
    options: {
      key?: (...args: Parameters<T>) => string;
      ttl?: number;
      maxSize?: number;
    } = {},
  ): T {
    const cache = new LRUCache<ReturnType<T>>({
      maxSize: options.maxSize || 50,
      defaultTTL: options.ttl || 60000,
    });

    const cacheId = `${fn.name || 'anonymous'}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    Memoizer.caches.set(cacheId, cache as LRUCache<unknown>);

    const memoized = ((...args: Parameters<T>) => {
      const key = options.key
        ? options.key(...args)
        : JSON.stringify(args);

      const cached = cache.get(key) as ReturnType<T> | undefined;
      if (cached !== undefined) {
        return cached;
      }

      const result = fn(...args) as ReturnType<T>;
      cache.set(key, result);
      return result;
    }) as T;

    return memoized;
  }

  static clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
    this.caches.clear();
  }
}

export function createCachedFunction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: {
    key?: (...args: Parameters<T>) => string;
    ttl?: number;
    maxSize?: number;
  },
): T & { clear: () => void } {
  const cache = new LRUCache<ReturnType<T>>({
    maxSize: options?.maxSize || 50,
    defaultTTL: options?.ttl || 60000,
  });

  const cachedFn = ((...args: Parameters<T>) => {
    const key = options?.key
      ? options.key(...args)
      : JSON.stringify(args);

    const cached = cache.get(key) as ReturnType<T> | undefined;
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T & { clear: () => void };

  cachedFn.clear = () => cache.clear();

  return cachedFn;
}

export const presetCache = new LRUCache<unknown>({ maxSize: 50, defaultTTL: 300000 });
export const diceResultCache = new LRUCache<unknown>({ maxSize: 200, defaultTTL: 60000 });
export const mapDataCache = new LRUCache<unknown>({ maxSize: 20, defaultTTL: 120000 });
