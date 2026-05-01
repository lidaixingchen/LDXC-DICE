/**
 * 安全的 localStorage 封装，处理配额超限错误
 */

export function isQuotaError(e: unknown): boolean {
  if (e instanceof DOMException) {
    return e.name === 'QuotaExceededError' || e.code === 22 || !!e.message?.includes('quota');
  }
  return false;
}

/**
 * 安全写入 localStorage，捕获配额错误返回 false
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (isQuotaError(e)) {
      console.warn(`[SafeStorage] 存储空间不足，key="${key}"`);
      return false;
    }
    throw e;
  }
}

/**
 * 安全读取 localStorage
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
