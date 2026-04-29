export interface RenderOptions {
  targetFPS?: number;
  enableThrottle?: boolean;
  enableDebounce?: boolean;
  throttleMs?: number;
  debounceMs?: number;
}

export class RenderOptimizer {
  private rafId: number | null = null;
  private lastRenderTime: number = 0;
  private targetFPS: number;
  private frameInterval: number;
  private pendingRender: boolean = false;
  private renderCallback: (() => void) | null = null;

  constructor(options: RenderOptions = {}) {
    this.targetFPS = options.targetFPS ?? 60;
    this.frameInterval = 1000 / this.targetFPS;
  }

  requestRender(callback: () => void): void {
    this.renderCallback = callback;

    if (this.pendingRender) return;

    this.pendingRender = true;
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (this.rafId !== null) return;

    this.rafId = requestAnimationFrame(this.handleFrame);
  }

  private handleFrame = (timestamp: number): void => {
    this.rafId = null;

    const elapsed = timestamp - this.lastRenderTime;

    if (elapsed >= this.frameInterval) {
      this.lastRenderTime = timestamp - (elapsed % this.frameInterval);
      this.pendingRender = false;

      if (this.renderCallback) {
        this.renderCallback();
      }
    } else {
      this.scheduleFrame();
    }
  };

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingRender = false;
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }

    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        return fn(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      return fn(...args);
    }, delay);
  }) as T;
}

export class BatchProcessor<T> {
  private queue: T[] = [];
  private processing: boolean = false;
  private processor: (items: T[]) => Promise<void> | void;
  private batchSize: number;
  private delay: number;

  constructor(
    processor: (items: T[]) => Promise<void> | void,
    options: { batchSize?: number; delay?: number } = {},
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize ?? 10;
    this.delay = options.delay ?? 16;
  }

  add(item: T): void {
    this.queue.push(item);
    this.scheduleProcess();
  }

  addMany(items: T[]): void {
    this.queue.push(...items);
    this.scheduleProcess();
  }

  private scheduleProcess(): void {
    if (this.processing) return;

    this.processing = true;
    requestAnimationFrame(() => this.process());
  }

  private async process(): Promise<void> {
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      await this.processor(batch);

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    this.processing = false;
  }

  clear(): void {
    this.queue = [];
  }

  get size(): number {
    return this.queue.length;
  }
}

export class VirtualScroller<T> {
  private containerHeight: number = 0;
  private itemHeight: number = 50;
  private overscan: number = 3;
  private scrollTop: number = 0;
  private items: T[] = [];

  constructor(options: { itemHeight?: number; overscan?: number } = {}) {
    this.itemHeight = options.itemHeight ?? 50;
    this.overscan = options.overscan ?? 3;
  }

  setItems(items: T[]): void {
    this.items = items;
  }

  setContainerHeight(height: number): void {
    this.containerHeight = height;
  }

  setScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getVisibleRange(): { start: number; end: number; visibleItems: T[] } {
    const start = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.overscan);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight) + this.overscan * 2;
    const end = Math.min(this.items.length, start + visibleCount);

    return {
      start,
      end,
      visibleItems: this.items.slice(start, end),
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  getOffsetY(): number {
    return Math.floor(this.scrollTop / this.itemHeight) * this.itemHeight;
  }
}

export class CanvasPool {
  private pool: HTMLCanvasElement[] = [];
  private maxSize: number;

  constructor(maxSize: number = 5) {
    this.maxSize = maxSize;
  }

  acquire(): HTMLCanvasElement {
    const canvas = this.pool.pop();
    if (canvas) return canvas;

    return document.createElement('canvas');
  }

  release(canvas: HTMLCanvasElement): void {
    if (this.pool.length >= this.maxSize) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 0;
    canvas.height = 0;

    this.pool.push(canvas);
  }

  clear(): void {
    this.pool = [];
  }
}

export const canvasPool = new CanvasPool();

export function measurePerformance(name: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;

  if (duration > 16) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms (>${16}ms threshold)`);
  }

  return duration;
}

export async function measureAsyncPerformance(name: string, fn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  const duration = end - start;

  if (duration > 100) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms (>${100}ms threshold)`);
  }

  return duration;
}
