/**
 * 跨 tab localStorage 同步总线
 * 利用浏览器原生 storage 事件实现跨 tab 数据同步
 */

type StorageChangeHandler = (newValue: string | null, oldValue: string | null) => void;

class StorageSyncBus {
  private listeners: Map<string, Set<StorageChangeHandler>> = new Map();
  private boundHandler: (e: StorageEvent) => void;

  constructor() {
    this.boundHandler = this.handleStorageEvent.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.boundHandler);
    }
  }

  /**
   * 注册指定 key 的变更监听，返回注销函数
   */
  register(key: string, handler: StorageChangeHandler): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);
    return () => {
      this.listeners.get(key)?.delete(handler);
    };
  }

  private handleStorageEvent(e: StorageEvent): void {
    if (e.key === null) return; // clear() 事件，忽略
    const handlers = this.listeners.get(e.key);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(e.newValue, e.oldValue);
      } catch (err) {
        console.error(`[StorageSyncBus] Handler error for key "${e.key}":`, err);
      }
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.boundHandler);
    }
    this.listeners.clear();
  }
}

export const storageSyncBus = new StorageSyncBus();
