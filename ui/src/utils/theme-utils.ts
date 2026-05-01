/**
 * 从 DOM 读取 CSS 主题变量的工具函数
 * 用于 Canvas 等无法直接使用 CSS 变量的场景
 */

const cache = new Map<string, string>();

/**
 * 读取 CSS 自定义属性值，带缓存
 * @param varName CSS 变量名（如 '--acu-accent'）
 * @param fallback 缓存未命中时的回退值
 */
export function getThemeColor(varName: string, fallback: string): string {
  const cached = cache.get(varName);
  if (cached) return cached;

  try {
    if (typeof window !== 'undefined') {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (value) {
        cache.set(varName, value);
        return value;
      }
    }
  } catch {
    // SSR 或 DOM 不可用
  }
  return fallback;
}

/**
 * 预加载所有定义的颜色，避免懒加载时连续触发回流
 */
export function prefetchThemeColors(): void {
  if (typeof window === 'undefined') return;
  const style = getComputedStyle(document.documentElement);
  
  const varsToFetch = [
    '--acu-accent', '--acu-text-main', '--acu-text-sub', 
    '--acu-border', '--acu-bg-panel', '--acu-bg-header',
    '--acu-btn-bg', '--acu-btn-hover', '--acu-danger', '--acu-success'
  ];

  varsToFetch.forEach(varName => {
    const value = style.getPropertyValue(varName).trim();
    if (value) cache.set(varName, value);
  });
}

/**
 * 清除颜色缓存（主题切换时调用）
 */
export function clearThemeColorCache(): void {
  cache.clear();
}

/**
 * 预定义的主题颜色键，供 Canvas 组件使用
 */
export const THEME_COLORS = {
  accent: () => getThemeColor('--acu-accent', '#89b4fa'),
  textMain: () => getThemeColor('--acu-text-main', '#cdd6f4'),
  textSub: () => getThemeColor('--acu-text-sub', '#a6adc8'),
  border: () => getThemeColor('--acu-border', '#45475a'),
  bgPanel: () => getThemeColor('--acu-bg-panel', '#1e1e2e'),
  bgHeader: () => getThemeColor('--acu-bg-header', '#181825'),
  btnBg: () => getThemeColor('--acu-btn-bg', '#313244'),
  btnHover: () => getThemeColor('--acu-btn-hover', '#45475a'),
  danger: () => getThemeColor('--acu-danger', '#f38ba8'),
  success: () => getThemeColor('--acu-success', '#a6e3a1'),
} as const;
