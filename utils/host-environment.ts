/**
 * 宿主环境访问层
 *
 * 集中管理跨域窗口解析和宿主全局变量访问，消除项目中重复的
 * `while(win.parent !== win)` 跨域检测模式。
 */

/** AutoCardUpdaterAPI 宿主接口 */
export interface GodDatabaseAPI {
  exportTableAsJson(): Record<string, { name: string; content: (string | number | null)[][] }> | null;
  importTableAsJson(data: Record<string, unknown>): Promise<boolean> | boolean;
  getTableLockState?(sheetKey: string): { locked: boolean; by?: string } | null;
  openSettings?(): void;
  openVisualizer?(): void;
  manualUpdate?(): Promise<void> | void;
  getMvuData?(...args: unknown[]): unknown;
  getVariables?(...args: unknown[]): unknown;
}

/** TavernHelper 宿主接口 */
export interface TavernHelperAPI {
  createChatMessages?(messages: unknown[], options?: Record<string, unknown>): Promise<void> | void;
  triggerSlash?(command: string): Promise<void> | void;
  [key: string]: unknown;
}

let cachedTopWindow: Window | null = null;

/**
 * 获取 iframe 嵌套链中最顶层可访问的窗口，结果带缓存。
 * 遇到跨域限制时静默降级到当前可达的最高层。
 */
export function getTopWindow(): Window {
  if (cachedTopWindow) return cachedTopWindow;
  let current: Window = window;
  try {
    while (current.parent && current.parent !== current) {
      current = current.parent;
    }
  } catch {
    // 跨域限制，使用当前可达的最高层
  }
  cachedTopWindow = current;
  return current;
}

export function isCrossOrigin(): boolean {
  return getTopWindow() !== window;
}

/**
 * 从顶层窗口或当前窗口获取宿主全局变量。
 */
export function getHostGlobal<T>(name: string): T | null {
  const top = getTopWindow();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (top as any)[name] ?? (window as any)[name] ?? null;
}

export function getDatabaseApi(): GodDatabaseAPI | null {
  return getHostGlobal<GodDatabaseAPI>('AutoCardUpdaterAPI');
}

export function getTavernHelper(): TavernHelperAPI | null {
  return getHostGlobal<TavernHelperAPI>('TavernHelper');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getHostjQuery(): any | null {
  return getHostGlobal('jQuery');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSillyTavern(): any | null {
  return getHostGlobal('SillyTavern');
}

/** 仅用于测试 */
export function resetHostEnvironmentCache(): void {
  cachedTopWindow = null;
}
