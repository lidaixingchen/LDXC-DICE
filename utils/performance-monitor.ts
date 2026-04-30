export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  totalDuration: number;
  averageDuration: number;
  slowOperations: PerformanceMetric[];
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: Map<string, number> = new Map();
  private enabled: boolean = true;
  private maxMetrics: number = 1000;

  constructor() {
    this.thresholds.set('default', 16);
    this.thresholds.set('render', 16);
    this.thresholds.set('network', 100);
    this.thresholds.set('storage', 50);
    this.thresholds.set('calculation', 10);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setThreshold(category: string, ms: number): void {
    this.thresholds.set(category, ms);
  }

  getThreshold(category: string): number {
    return this.thresholds.get(category) || this.thresholds.get('default')!;
  }

  measure<T>(name: string, fn: () => T, category: string = 'default'): T {
    if (!this.enabled) return fn();

    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, category);
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>, category: string = 'default'): Promise<T> {
    if (!this.enabled) return fn();

    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, category);
    }
  }

  private recordMetric(name: string, duration: number, category: string): void {
    const threshold = this.getThreshold(category);

    if (duration > threshold) {
      console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
    }

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata: { category },
    });

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(filter?: { name?: string; category?: string; minDuration?: number }): PerformanceMetric[] {
    let result = this.metrics;

    if (filter) {
      if (filter.name) {
        result = result.filter(m => m.name.includes(filter.name!));
      }
      if (filter.category) {
        result = result.filter(m => m.metadata?.category === filter.category);
      }
      if (filter.minDuration !== undefined) {
        result = result.filter(m => m.duration >= filter.minDuration!);
      }
    }

    return result;
  }

  getReport(filter?: { name?: string; category?: string }): PerformanceReport {
    const metrics = this.getMetrics(filter);
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = metrics.length > 0 ? totalDuration / metrics.length : 0;

    const slowOperations = metrics.filter(m => {
      const category = m.metadata?.category as string | undefined;
      const threshold = category ? this.getThreshold(category) : this.thresholds.get('default')!;
      return m.duration > threshold;
    });

    return {
      metrics,
      totalDuration,
      averageDuration,
      slowOperations,
      timestamp: Date.now(),
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  exportReport(): string {
    const report = this.getReport();
    return JSON.stringify(report, null, 2);
  }
}

export const performanceMonitor = new PerformanceMonitor();

export class MemoryMonitor {
  private samples: Array<{ timestamp: number; usedJSHeapSize: number; totalJSHeapSize: number }> = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = false;

  startSampling(intervalMs: number = 5000): void {
    if (this.enabled) return;

    this.enabled = true;
    this.interval = setInterval(() => this.sample(), intervalMs);
  }

  stopSampling(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.enabled = false;
  }

  private sample(): void {
    const memory = (performance as any).memory;
    if (!memory) return;

    this.samples.push({
      timestamp: Date.now(),
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
    });

    if (this.samples.length > 100) {
      this.samples.shift();
    }
  }

  getSamples(): Array<{ timestamp: number; usedMB: number; totalMB: number }> {
    return this.samples.map(s => ({
      timestamp: s.timestamp,
      usedMB: Math.round(s.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(s.totalJSHeapSize / 1024 / 1024),
    }));
  }

  getCurrentMemory(): { usedMB: number; totalMB: number; limitMB: number } | null {
    const memory = (performance as any).memory;
    if (!memory) return null;

    return {
      usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
    };
  }

  checkMemoryUsage(): { status: 'ok' | 'warning' | 'critical'; message: string } {
    const current = this.getCurrentMemory();
    if (!current) {
      return { status: 'ok', message: 'Memory monitoring not available' };
    }

    const usagePercent = (current.usedMB / current.limitMB) * 100;

    if (usagePercent > 90) {
      return { status: 'critical', message: `Memory usage critical: ${usagePercent.toFixed(1)}%` };
    }
    if (usagePercent > 75) {
      return { status: 'warning', message: `Memory usage high: ${usagePercent.toFixed(1)}%` };
    }

    return { status: 'ok', message: `Memory usage normal: ${usagePercent.toFixed(1)}%` };
  }

  clearSamples(): void {
    this.samples = [];
  }
}

export const memoryMonitor = new MemoryMonitor();

export class CacheManager<T> {
  private cache: Map<string, { value: T; timestamp: number; ttl: number }> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 100, defaultTTL: number = 60000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0,
    };
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

export function createCache<T>(maxSize?: number, defaultTTL?: number): CacheManager<T> {
  return new CacheManager<T>(maxSize, defaultTTL);
}

export class LazyLoader<T> {
  private loader: () => Promise<T>;
  private value: T | null = null;
  private loading: boolean = false;
  private error: Error | null = null;
  private subscribers: Array<(value: T | null, error: Error | null) => void> = [];

  constructor(loader: () => Promise<T>) {
    this.loader = loader;
  }

  async get(): Promise<T> {
    if (this.value !== null) return this.value;
    if (this.loading) {
      return new Promise((resolve, reject) => {
        this.subscribers.push((value, error) => {
          if (error) reject(error);
          else resolve(value!);
        });
      });
    }

    this.loading = true;
    try {
      this.value = await this.loader();
      this.notifySubscribers(this.value, null);
      return this.value;
    } catch (e) {
      this.error = e instanceof Error ? e : new Error(String(e));
      this.notifySubscribers(null, this.error);
      throw this.error;
    } finally {
      this.loading = false;
    }
  }

  private notifySubscribers(value: T | null, error: Error | null): void {
    for (const subscriber of this.subscribers) {
      subscriber(value, error);
    }
    this.subscribers = [];
  }

  reset(): void {
    this.value = null;
    this.loading = false;
    this.error = null;
  }

  isLoaded(): boolean {
    return this.value !== null;
  }

  isLoading(): boolean {
    return this.loading;
  }

  getError(): Error | null {
    return this.error;
  }
}

export function createLazyLoader<T>(loader: () => Promise<T>): LazyLoader<T> {
  return new LazyLoader(loader);
}

export class EventBus {
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;

    for (const callback of callbacks) {
      try {
        callback(...args);
      } catch (e) {
        console.error(`[EventBus] Error in listener for ${event}:`, e);
      }
    }
  }

  once(event: string, callback: (...args: unknown[]) => void): void {
    const wrapper = (...args: unknown[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = new EventBus();
