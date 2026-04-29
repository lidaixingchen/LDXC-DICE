export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function formatNumber(num: number, decimals: number = 0): string {
  return num.toFixed(decimals);
}

export function formatDiceRoll(dice: number[]): string {
  if (dice.length === 0) return '0';
  if (dice.length === 1) return String(dice[0]);
  return `${dice.join(' + ')} = ${dice.reduce((a, b) => a + b, 0)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

export function unescapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
  };
  return text.replace(/&(amp|lt|gt|quot|#039);/g, entity => map[entity]);
}

export function parseJsonSafe<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return fallback;
    }
    if (typeof current !== 'object') {
      return fallback;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current !== undefined && current !== null ? (current as T) : fallback;
}

export function safeSet<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * 去除字符串中的孤立代理对（surrogate pair），避免 encodeURIComponent 报错
 */
export function stripLoneSurrogates(value: string): string {
  let sanitized = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        sanitized += value[i] + value[i + 1];
        i++;
      } else {
        sanitized += '�';
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      sanitized += '�';
      continue;
    }
    sanitized += value[i];
  }
  return sanitized;
}

/**
 * 安全地 encodeURIComponent（处理孤立代理对）
 */
export function safeEncodeURIComponent(value: unknown): string {
  const text = String(value ?? '');
  try {
    return encodeURIComponent(text);
  } catch {
    return encodeURIComponent(stripLoneSurrogates(text));
  }
}

/**
 * 安全地 decodeURIComponent（处理孤立代理对）
 */
export function safeDecodeURIComponent(value: unknown): string {
  const text = String(value ?? '');
  try {
    return decodeURIComponent(text);
  } catch {
    return stripLoneSurrogates(text);
  }
}

/**
 * 生成唯一名称（处理重名，追加 (2), (3)...）
 */
export function generateUniqueName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) return baseName;
  let counter = 2;
  let newName = `${baseName} (${counter})`;
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }
  return newName;
}

/**
 * 检测当前设备是否为移动端
 */
export function isMobileDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 判断表名是否为 NPC 表（兼容新旧模板）
 */
export function isNpcTableName(name: string): boolean {
  return name === '重要人物表' || name === '重要角色表';
}

/**
 * 比较语义化版本号 (x.y.z)
 * @returns -1 | 0 | 1
 */
export function compareVersion(v1: string, v2: string): number {
  const normalizeVersion = (v: string): string => {
    if (typeof v === 'number') return `${v}.0.0`;
    if (typeof v !== 'string') return '0.0.0';
    return v;
  };
  const nv1 = normalizeVersion(v1);
  const nv2 = normalizeVersion(v2);
  const parts1 = nv1.split('.').map(Number);
  const parts2 = nv2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

export function formatTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDate(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateTime(date: Date = new Date()): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}
