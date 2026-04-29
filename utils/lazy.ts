export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export class LazyLoader {
  private observer: IntersectionObserver | null = null;
  private elements: Map<Element, () => void> = new Map();

  constructor(options: LazyLoadOptions = {}) {
    const threshold = options.threshold ?? 0.1;
    const rootMargin = options.rootMargin ?? '100px';

    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        entries => this.handleIntersection(entries, options.triggerOnce),
        { threshold, rootMargin },
      );
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[], triggerOnce?: boolean): void {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const callback = this.elements.get(entry.target);
        if (callback) {
          callback();
          if (triggerOnce) {
            this.unobserve(entry.target);
          }
        }
      }
    }
  }

  observe(element: Element, callback: () => void): void {
    if (this.observer) {
      this.elements.set(element, callback);
      this.observer.observe(element);
    } else {
      callback();
    }
  }

  unobserve(element: Element): void {
    if (this.observer) {
      this.elements.delete(element);
      this.observer.unobserve(element);
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.elements.clear();
    }
  }
}

export interface DeferredOptions {
  delay?: number;
  priority?: 'high' | 'normal' | 'low';
}

export function defer(callback: () => void, options: DeferredOptions = {}): () => void {
  const delay = options.delay ?? 0;

  if (typeof requestIdleCallback !== 'undefined' && options.priority !== 'high') {
    const id = requestIdleCallback(() => callback(), { timeout: delay });
    return () => cancelIdleCallback(id);
  }

  const id = setTimeout(callback, delay);
  return () => clearTimeout(id);
}

export function deferHigh(callback: () => void): () => void {
  return defer(callback, { priority: 'high' });
}

export function deferLow(callback: () => void): () => void {
  return defer(callback, { priority: 'low', delay: 100 });
}

export class ChunkLoader<T> {
  private chunks: Map<string, Promise<T>> = new Map();
  private loaded: Map<string, T> = new Map();
  private accessOrder: string[] = [];

  constructor(
    private loader: (key: string) => Promise<T>,
    private options: {
      maxCache?: number;
      preload?: string[];
    } = {},
  ) {
    if (options.preload) {
      for (const key of options.preload) {
        this.load(key).catch(() => {});
      }
    }
  }

  async load(key: string): Promise<T> {
    const cached = this.loaded.get(key);
    if (cached) {
      this.touchAccess(key);
      return cached;
    }

    const pending = this.chunks.get(key);
    if (pending) return pending;

    let promise: Promise<T>;
    try {
      promise = this.loader(key);
    } catch (e) {
      throw e;
    }

    this.chunks.set(key, promise);

    try {
      const result = await promise;
      this.loaded.set(key, result);
      this.accessOrder.push(key);
      this.chunks.delete(key);

      this.evictIfNeeded();

      return result;
    } catch (e) {
      this.chunks.delete(key);
      throw e;
    }
  }

  private touchAccess(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx >= 0) {
      this.accessOrder.splice(idx, 1);
    }
    this.accessOrder.push(key);
  }

  private evictIfNeeded(): void {
    const maxCache = this.options.maxCache ?? 10;
    while (this.loaded.size > maxCache && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift();
      if (lruKey && this.loaded.has(lruKey)) {
        this.loaded.delete(lruKey);
      }
    }
  }

  has(key: string): boolean {
    return this.loaded.has(key);
  }

  get(key: string): T | undefined {
    const value = this.loaded.get(key);
    if (value !== undefined) {
      this.touchAccess(key);
    }
    return value;
  }

  clear(): void {
    this.chunks.clear();
    this.loaded.clear();
    this.accessOrder = [];
  }

  preload(keys: string[]): void {
    for (const key of keys) {
      this.load(key).catch(() => {});
    }
  }
}

export class ImagePreloader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loading: Map<string, Promise<HTMLImageElement>> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  load(src: string): Promise<HTMLImageElement> {
    const cached = this.cache.get(src);
    if (cached) {
      this.touchAccess(src);
      return Promise.resolve(cached);
    }

    const loading = this.loading.get(src);
    if (loading) return loading;

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        this.accessOrder.push(src);
        this.loading.delete(src);
        this.evictIfNeeded();
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });

    this.loading.set(src, promise);
    return promise;
  }

  private touchAccess(src: string): void {
    const idx = this.accessOrder.indexOf(src);
    if (idx >= 0) {
      this.accessOrder.splice(idx, 1);
    }
    this.accessOrder.push(src);
  }

  private evictIfNeeded(): void {
    while (this.cache.size > this.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift();
      if (lruKey && this.cache.has(lruKey)) {
        this.cache.delete(lruKey);
      }
    }
  }

  get(src: string): HTMLImageElement | undefined {
    const value = this.cache.get(src);
    if (value !== undefined) {
      this.touchAccess(src);
    }
    return value;
  }

  has(src: string): boolean {
    return this.cache.has(src);
  }

  preload(sources: string[]): void {
    for (const src of sources) {
      this.load(src).catch(() => {});
    }
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
    this.accessOrder = [];
  }
}

export const imagePreloader = new ImagePreloader();

export function createLazyComponent<T extends HTMLElement>(
  factory: () => Promise<{ default: new () => T }>,
): { mount: (container: HTMLElement) => Promise<T>; unmount: () => void } {
  let instance: T | null = null;
  let mounted = false;

  return {
    async mount(container: HTMLElement): Promise<T> {
      if (mounted && instance) {
        return instance;
      }

      const module = await factory();
      instance = new module.default();
      container.appendChild(instance);
      mounted = true;
      return instance;
    },

    unmount(): void {
      if (instance && instance.parentNode) {
        instance.parentNode.removeChild(instance);
        mounted = false;
      }
    },
  };
}
