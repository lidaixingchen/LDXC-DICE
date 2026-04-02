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

  constructor(
    private loader: (key: string) => Promise<T>,
    private options: {
      maxCache?: number;
      preload?: string[];
    } = {},
  ) {
    if (options.preload) {
      for (const key of options.preload) {
        this.load(key);
      }
    }
  }

  async load(key: string): Promise<T> {
    const cached = this.loaded.get(key);
    if (cached) return cached;

    const pending = this.chunks.get(key);
    if (pending) return pending;

    const promise = this.loader(key);
    this.chunks.set(key, promise);

    try {
      const result = await promise;
      this.loaded.set(key, result);
      this.chunks.delete(key);

      this.evictIfNeeded();

      return result;
    } catch (e) {
      this.chunks.delete(key);
      throw e;
    }
  }

  private evictIfNeeded(): void {
    const maxCache = this.options.maxCache ?? 10;
    if (this.loaded.size > maxCache) {
      const firstKey = this.loaded.keys().next().value;
      if (firstKey) {
        this.loaded.delete(firstKey);
      }
    }
  }

  has(key: string): boolean {
    return this.loaded.has(key);
  }

  get(key: string): T | undefined {
    return this.loaded.get(key);
  }

  clear(): void {
    this.chunks.clear();
    this.loaded.clear();
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
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  load(src: string): Promise<HTMLImageElement> {
    const cached = this.cache.get(src);
    if (cached) return Promise.resolve(cached);

    const loading = this.loading.get(src);
    if (loading) return loading;

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
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

  private evictIfNeeded(): void {
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  get(src: string): HTMLImageElement | undefined {
    return this.cache.get(src);
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
