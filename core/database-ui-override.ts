/**
 * 神-数据库UI主题同步
 *
 * 此文件从 index.ts 拆分出来，专门用于同步数据库界面的主题颜色与样式。
 *
 * ## 为什么拆分？
 * - index.ts 过于庞大，拆分后降低维护成本
 * - 样式同步逻辑相对独立，适合单独管理
 *
 * ## 如何使用？
 * - 在 index.ts 中通过 `import { injectDatabaseStyles } from './database-ui-override'` 导入
 * - 在主题切换或初始化时调用该函数
 *
 * ## 如何修改样式？
 * - 直接在本文件中编辑 DATABASE_THEME_MAP 或 injectDatabaseStyles 逻辑
 * - 运行 `pnpm build` 验证构建成功
 *
 * @see index.ts - injectDatabaseStyles() 函数（约第 9491 行）
 */

export interface ThemeColors {
  bgNav: string;
  bgPanel: string;
  border: string;
  textMain: string;
  textSub: string;
  btnBg: string;
  btnHover: string;
  btnActiveBg: string;
  btnActiveText: string;
  accent: string;
  inputBg: string;
}

type DatabaseThemeMap = Record<string, ThemeColors>;

const DATABASE_THEME_MAP: DatabaseThemeMap = {
  retro: {
    bgNav: '#e6e2d3',
    bgPanel: '#e6e2d3',
    border: '#dcd0c0',
    textMain: '#5e4b35',
    textSub: '#999',
    btnBg: '#dcd0c0',
    btnHover: '#cbbba8',
    btnActiveBg: '#8d7b6f',
    btnActiveText: '#fdfaf5',
    accent: '#7a695f',
    inputBg: '#f5f2eb',
  },
  dark: {
    bgNav: '#2b2b2b',
    bgPanel: '#252525',
    border: '#444',
    textMain: '#eee',
    textSub: '#aaa',
    btnBg: '#3a3a3a',
    btnHover: '#4a4a4a',
    btnActiveBg: '#6a5acd',
    btnActiveText: '#fff',
    accent: '#9b8cd9',
    inputBg: '#3a3a3a',
  },
  modern: {
    bgNav: '#ffffff',
    bgPanel: '#f8f9fa',
    border: '#e0e0e0',
    textMain: '#333',
    textSub: '#666',
    btnBg: '#f1f3f5',
    btnHover: '#e9ecef',
    btnActiveBg: '#007bff',
    btnActiveText: '#fff',
    accent: '#007bff',
    inputBg: '#f1f3f5',
  },
  forest: {
    bgNav: '#e8f5e9',
    bgPanel: '#e8f5e9',
    border: '#c8e6c9',
    textMain: '#2e7d32',
    textSub: '#81c784',
    btnBg: '#c8e6c9',
    btnHover: '#a5d6a7',
    btnActiveBg: '#43a047',
    btnActiveText: '#fff',
    accent: '#4caf50',
    inputBg: '#c8e6c9',
  },
  ocean: {
    bgNav: '#e3f2fd',
    bgPanel: '#e3f2fd',
    border: '#90caf9',
    textMain: '#1565c0',
    textSub: '#64b5f6',
    btnBg: '#bbdefb',
    btnHover: '#90caf9',
    btnActiveBg: '#1976d2',
    btnActiveText: '#fff',
    accent: '#2196f3',
    inputBg: '#bbdefb',
  },
  cyber: {
    bgNav: '#000000',
    bgPanel: '#0a0a0a',
    border: '#333',
    textMain: '#00ffcc',
    textSub: '#ff00ff',
    btnBg: '#111',
    btnHover: '#222',
    btnActiveBg: '#ff00ff',
    btnActiveText: '#000',
    accent: '#00ffcc',
    inputBg: '#111',
  },
  nightowl: {
    bgNav: '#0a2133',
    bgPanel: '#011627',
    border: '#132e45',
    textMain: '#e0e6f2',
    textSub: '#a6b8cc',
    btnBg: '#1f3a52',
    btnHover: '#2a4a68',
    btnActiveBg: '#7fdbca',
    btnActiveText: '#011627',
    accent: '#7fdbca',
    inputBg: '#1f3a52',
  },
  sakura: {
    bgNav: '#F9F0EF',
    bgPanel: '#F9F0EF',
    border: '#EBDCD9',
    textMain: '#6B5552',
    textSub: '#C08D8D',
    btnBg: '#EBDCD9',
    btnHover: '#D8C7C4',
    btnActiveBg: '#C08D8D',
    btnActiveText: '#F9F0EF',
    accent: '#C08D8D',
    inputBg: '#EBDCD9',
  },
  minepink: {
    bgNav: '#1a1a1a',
    bgPanel: '#1a1a1a',
    border: '#333333',
    textMain: '#ffb3d9',
    textSub: '#ff80c1',
    btnBg: '#2a2a2a',
    btnHover: '#3a3a3a',
    btnActiveBg: '#ff80c1',
    btnActiveText: '#1a1a1a',
    accent: '#ff80c1',
    inputBg: '#2a2a2a',
  },
  purple: {
    bgNav: '#f3e5f5',
    bgPanel: '#f3e5f5',
    border: '#ce93d8',
    textMain: '#6a1b9a',
    textSub: '#9c27b0',
    btnBg: '#e1bee7',
    btnHover: '#ce93d8',
    btnActiveBg: '#9c27b0',
    btnActiveText: '#fff',
    accent: '#9c27b0',
    inputBg: '#e1bee7',
  },
  wechat: {
    bgNav: '#F7F7F7',
    bgPanel: '#F7F7F7',
    border: '#E5E5E5',
    textMain: '#333333',
    textSub: '#666666',
    btnBg: '#E5E5E5',
    btnHover: '#D5D5D5',
    btnActiveBg: '#09B83E',
    btnActiveText: '#FFFFFF',
    accent: '#09B83E',
    inputBg: '#E5E5E5',
  },
  educational: {
    bgNav: '#000000',
    bgPanel: '#000000',
    border: '#1B1B1B',
    textMain: '#FFFFFF',
    textSub: '#CCCCCC',
    btnBg: '#1B1B1B',
    btnHover: '#2B2B2B',
    btnActiveBg: '#FF9900',
    btnActiveText: '#000000',
    accent: '#FF9900',
    inputBg: '#1B1B1B',
  },
  vaporwave: {
    bgNav: '#191970',
    bgPanel: '#191970',
    border: 'rgba(0,255,255,0.3)',
    textMain: '#00FFFF',
    textSub: '#FF00FF',
    btnBg: 'rgba(25,25,112,0.8)',
    btnHover: 'rgba(0,255,255,0.2)',
    btnActiveBg: '#FF00FF',
    btnActiveText: '#191970',
    accent: '#00FFFF',
    inputBg: 'rgba(25,25,112,0.6)',
  },
  classicpackaging: {
    bgNav: '#000000',
    bgPanel: '#000000',
    border: '#FFFF00',
    textMain: '#FFFF00',
    textSub: '#CCCC00',
    btnBg: '#FF0000',
    btnHover: '#CC0000',
    btnActiveBg: '#0000FF',
    btnActiveText: '#FFFF00',
    accent: '#FF0000',
    inputBg: '#1a1a1a',
  },
  galgame: {
    bgNav: '#FFF0F5',
    bgPanel: '#FFF0F5',
    border: '#F0D4E4',
    textMain: '#6B4A5A',
    textSub: '#B08A9A',
    btnBg: '#FFE4E9',
    btnHover: '#FFD4E4',
    btnActiveBg: '#E8B4D9',
    btnActiveText: '#6B4A5A',
    accent: '#E8B4D9',
    inputBg: '#FFF8FA',
  },
  terminal: {
    bgNav: '#0c0c0c',
    bgPanel: '#0c0c0c',
    border: '#00ff00',
    textMain: '#00ff00',
    textSub: '#00cc00',
    btnBg: '#1a1a1a',
    btnHover: '#2a2a2a',
    btnActiveBg: '#00ff00',
    btnActiveText: '#0c0c0c',
    accent: '#00ff00',
    inputBg: '#0c0c0c',
  },
  dreamcore: {
    bgNav: '#F4F1EA',
    bgPanel: '#F4F1EA',
    border: '#D6D2C4',
    textMain: '#5C5869',
    textSub: '#9490A0',
    btnBg: '#E6E1D5',
    btnHover: '#DBD8CC',
    btnActiveBg: '#8A9AC6',
    btnActiveText: '#FFFFFF',
    accent: '#8A9AC6',
    inputBg: '#FFFFFF',
  },
  aurora: {
    bgNav: 'linear-gradient(135deg,#0f172a,#1e293b)',
    bgPanel: 'linear-gradient(180deg,#0f172a 0%,#334155 100%)',
    border: '#38bdf8',
    textMain: '#e2e8f0',
    textSub: '#94a3b8',
    btnBg: 'linear-gradient(135deg,#162a3d,#25224d)',
    btnHover: 'linear-gradient(135deg,#1e3a5f,#312e81)',
    btnActiveBg: 'linear-gradient(135deg,#38bdf8,#a855f7)',
    btnActiveText: '#fff',
    accent: '#38bdf8',
    inputBg: '#0f172a',
  },
  chouten: {
    bgNav: 'linear-gradient(135deg,rgba(26,10,46,0.95) 0%,rgba(45,27,78,0.95) 50%,rgba(26,10,46,0.95) 100%)',
    bgPanel: 'rgba(26,10,46,0.95)',
    border: '#FF7EB6',
    textMain: '#FFFFFF',
    textSub: '#D0BFFF',
    btnBg: 'rgba(255,255,255,0.1)',
    btnHover: 'rgba(255,107,157,0.3)',
    btnActiveBg: 'linear-gradient(90deg,#FF6B9D,#B388FF)',
    btnActiveText: '#FFFFFF',
    accent: '#7FFFD4',
    inputBg: 'rgba(0,0,0,0.3)',
  },
};

const DB_TOAST_MUTE_STYLE_ID = 'dice-db-toast-mute';

function getJQuery(w: Window | null | undefined): any {
  try {
    return (w as any)?.jQuery as any;
  } catch {
    return null;
  }
}

function collectDatabaseDocuments(): Document[] {
  const docs: Document[] = [];
  const tryAddDoc = (w: Window | null | undefined) => {
    try {
      const doc = w?.document;
      if (doc && !docs.includes(doc)) docs.push(doc);
    } catch {
      return;
    }
  };

  tryAddDoc(window);
  tryAddDoc(window.parent);
  tryAddDoc(window.top);
  return docs;
}

export function injectDatabaseStyles(themeId: string, fontFamily?: string): void {
  try {
    const targets = [getJQuery(window), getJQuery(window.parent), getJQuery(window.top)].filter(
      (v, idx, arr) => !!v && arr.indexOf(v) === idx,
    );
    if (!targets.length) return;

    const t = DATABASE_THEME_MAP[themeId] || DATABASE_THEME_MAP.aurora;
    const darkThemeIds = new Set(['cyber', 'terminal', 'aurora', 'chouten', 'classicpackaging']);
    const isDarkTheme = darkThemeIds.has(themeId);
    const stepperSpinFilter = isDarkTheme ? 'invert(1) brightness(1.05)' : 'none';
    const stepperSpinOpacity = isDarkTheme ? '0.85' : '0.55';
    const stepperColorScheme = isDarkTheme ? 'dark' : 'light';

    const S_POPUP = `#shujuku_v104-popup.auto-card-updater-popup, [id^="shujuku"][id$="-popup"].auto-card-updater-popup`;
    const S_MAIN = `#shujuku_v104-main-window, [id^="shujuku"][id$="-main-window"]`;
    const S_VIS = `#shujuku_v104-visualizer-window, [id^="shujuku"][id$="-visualizer-window"]`;
    const S_ALL_WINDOWS = `${S_POPUP}, ${S_MAIN}, ${S_VIS}`;
    const S_POPUP_MAIN = `${S_POPUP}, ${S_MAIN}`;

    const fontCss = fontFamily
      ? `
        html body .auto-card-updater-popup,
        html body #shujuku_v104-main-window,
        html body [id^="shujuku"][id$="-main-window"],
        html body #shujuku_v104-popup.auto-card-updater-popup,
        html body [id^="shujuku"][id$="-popup"].auto-card-updater-popup {
          --acu-font-family: ${fontFamily};
          font-family: var(--acu-font-family) !important;
        }
      `
      : '';

    const css = `
      <style id="dice-db-theme-sync">
        ${fontCss}
        html body .auto-card-updater-popup {
          --acu-bg-0: ${t.bgPanel} !important;
          --acu-bg-1: ${t.bgNav} !important;
          --acu-bg-2: ${t.btnBg} !important;
          --acu-border: ${t.border} !important;
          --acu-border-2: ${t.border} !important;
          --acu-text-1: ${t.textMain} !important;
          --acu-text-2: ${t.textSub} !important;
          --acu-text-3: ${t.textSub} !important;
          --acu-accent: ${t.accent} !important;
          --acu-accent-glow: ${t.accent}1a !important;
        }
        html body .auto-card-updater-popup button,
        html body .auto-card-updater-popup .button {
          background: ${t.btnBg} !important;
          color: ${t.textMain} !important;
          border: 1px solid ${t.border} !important;
          border-radius: 8px !important;
          padding: 8px 16px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        html body .auto-card-updater-popup button:hover,
        html body .auto-card-updater-popup .button:hover {
          background: ${t.btnHover} !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        html body .auto-card-updater-popup button.primary,
        html body .auto-card-updater-popup .button.primary {
          background: ${t.btnActiveBg} !important;
          color: ${t.btnActiveText} !important;
          border-color: ${t.btnActiveBg} !important;
          font-weight: 600 !important;
        }
        html body .auto-card-updater-popup button.primary:hover,
        html body .auto-card-updater-popup .button.primary:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px ${t.accent}44 !important;
          filter: brightness(1.1) !important;
        }
        html body .auto-card-updater-popup button:disabled,
        html body .auto-card-updater-popup .button:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }
        html body :is(${S_ALL_WINDOWS}) {
          border-radius: 16px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px ${t.border} !important;
        }
        html body :is(${S_POPUP}) :is(input, select, textarea) {
          background-color: ${t.inputBg} !important;
          color: ${t.textMain} !important;
          border: 1px solid ${t.border} !important;
          border-radius: 6px !important;
          padding: 8px 12px !important;
        }
        html body :is(${S_POPUP}) :is(input, select, textarea):focus {
          border-color: ${t.accent} !important;
          box-shadow: 0 0 0 3px ${t.accent}22 !important;
          outline: none !important;
        }
        html body :is(${S_POPUP}) table {
          border-collapse: separate !important;
          border-spacing: 0 !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          border: 1px solid ${t.border} !important;
        }
        html body :is(${S_POPUP}) table thead th {
          background: ${t.btnActiveBg} !important;
          color: ${t.btnActiveText} !important;
        }
        html body :is(${S_POPUP}) table tbody tr:nth-child(even) {
          background-color: ${t.bgNav} !important;
        }
        html body :is(${S_POPUP}) table tbody tr:hover {
          background-color: ${t.btnHover} !important;
        }
        html body :is(${S_POPUP}) input[type="checkbox"] {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 18px !important;
          height: 18px !important;
          border-radius: 5px !important;
          border: 1.5px solid ${t.border} !important;
          background-color: ${t.inputBg} !important;
          cursor: pointer !important;
        }
        html body :is(${S_POPUP}) input[type="checkbox"]:checked {
          background-color: ${t.accent} !important;
          border-color: ${t.accent} !important;
        }
        html body :is(${S_POPUP}) .acu-tabs-nav {
          background-color: ${t.bgPanel} !important;
          border-bottom: 1px solid ${t.border} !important;
        }
        html body :is(${S_POPUP_MAIN}) .acu-tab-button {
          background-color: transparent !important;
          color: ${t.textSub} !important;
          border: 1px solid transparent !important;
          border-radius: 8px !important;
        }
        html body :is(${S_POPUP_MAIN}) .acu-tab-button:hover {
          background-color: ${t.btnBg} !important;
          color: ${t.textMain} !important;
        }
        html body :is(${S_POPUP_MAIN}) .acu-tab-button.active {
          background-color: ${t.btnActiveBg} !important;
          color: ${t.btnActiveText} !important;
        }
        html body :is(${S_POPUP}) input[type="number"] {
          color-scheme: ${stepperColorScheme} !important;
        }
        html body :is(${S_POPUP}) input[type="number"]::-webkit-inner-spin-button,
        html body :is(${S_POPUP}) input[type="number"]::-webkit-outer-spin-button {
          filter: ${stepperSpinFilter} !important;
          opacity: ${stepperSpinOpacity} !important;
        }
        html body :is(${S_ALL_WINDOWS}) .acu-window-header {
          background: linear-gradient(135deg, ${t.bgNav} 0%, ${t.bgPanel} 100%) !important;
          border-bottom: 1px solid ${t.border} !important;
          color: ${t.textMain} !important;
          padding: 14px 18px !important;
        }
        html body :is(${S_ALL_WINDOWS}) .acu-window-title {
          color: ${t.textMain} !important;
          font-weight: 600 !important;
        }
        html body :is(${S_ALL_WINDOWS}) .acu-window-btn {
          background: ${t.btnBg} !important;
          color: ${t.textMain} !important;
          border: 1px solid ${t.border} !important;
          border-radius: 8px !important;
          padding: 6px 10px !important;
        }
        html body :is(${S_ALL_WINDOWS}) .acu-window-btn:hover {
          background: ${t.btnHover} !important;
        }
        html body :is(${S_ALL_WINDOWS}) .acu-window-btn.close:hover {
          background: ${t.btnActiveBg} !important;
          color: ${t.btnActiveText} !important;
        }
        #acu-visualizer-content .acu-vis-header {
          background: linear-gradient(135deg, ${t.bgNav} 0%, ${t.bgPanel} 100%) !important;
          border-bottom: 1px solid ${t.border} !important;
          color: ${t.textMain} !important;
        }
        #acu-visualizer-content .acu-vis-content {
          background-color: ${t.bgPanel} !important;
        }
        #acu-visualizer-content .acu-vis-sidebar {
          background-color: ${t.bgNav} !important;
          border-right: 1px solid ${t.border} !important;
        }
        #acu-visualizer-content .acu-vis-main {
          background-color: ${t.bgPanel} !important;
          color: ${t.textMain} !important;
        }
        #acu-visualizer-content .acu-data-card {
          background-color: ${t.bgPanel} !important;
          border: 1px solid ${t.border} !important;
          border-radius: 12px !important;
        }
        #acu-visualizer-content .acu-data-card:hover {
          border-color: ${t.accent}66 !important;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15) !important;
        }
        #acu-visualizer-content .acu-card-header {
          background: linear-gradient(135deg, ${t.btnActiveBg} 0%, ${t.accent} 100%) !important;
          color: ${t.btnActiveText} !important;
        }
        #acu-visualizer-content .acu-card-body {
          background-color: ${t.bgPanel} !important;
          color: ${t.textMain} !important;
        }
        #acu-visualizer-content .acu-field-value {
          background-color: ${t.inputBg} !important;
          color: ${t.textMain} !important;
          border: 1px solid ${t.border} !important;
        }
        #acu-visualizer-content .acu-field-value:focus {
          border-color: ${t.accent} !important;
          box-shadow: 0 0 0 3px ${t.accent}33 !important;
        }
        #acu-visualizer-content .acu-mode-btn {
          background: transparent !important;
          color: ${t.textSub} !important;
          border: 1px solid transparent !important;
        }
        #acu-visualizer-content .acu-mode-btn:hover {
          background: ${t.btnBg} !important;
          color: ${t.textMain} !important;
        }
        #acu-visualizer-content .acu-mode-btn.active {
          background: ${t.btnActiveBg} !important;
          color: ${t.btnActiveText} !important;
        }
        #acu-visualizer-content .acu-btn-primary {
          background: ${t.btnActiveBg} !important;
          color: ${t.btnActiveText} !important;
        }
        #acu-visualizer-content .acu-btn-secondary {
          background: ${t.btnBg} !important;
          color: ${t.textMain} !important;
          border: 1px solid ${t.border} !important;
        }
        #acu-visualizer-content .acu-table-nav-item {
          background: transparent !important;
          color: ${t.textSub} !important;
        }
        #acu-visualizer-content .acu-table-nav-item:hover {
          background: ${t.btnHover} !important;
          color: ${t.textMain} !important;
        }
        #acu-visualizer-content .acu-table-nav-item.active {
          background: ${t.btnActiveBg} !important;
          color: ${t.btnActiveText} !important;
        }
        @media (max-width: 768px) {
          html body .auto-card-updater-popup table {
            font-size: 0.85em !important;
          }
          html body :is(${S_ALL_WINDOWS}) {
            border-radius: 12px !important;
          }
        }
      </style>
    `;

    for (const $ of targets) {
      $('#dice-db-theme-sync').remove();
      $('head').append(css);
    }
  } catch (e) {
    console.warn('[DatabaseUIOverride] injectDatabaseStyles failed:', e);
  }
}

export function setDatabaseToastMute(enabled: boolean): void {
  try {
    const css = `
#toast-container .acu-toast,
.toast.acu-toast,
.acu-toast.toast {
  display: none !important;
}
`;
    const docs = collectDatabaseDocuments();
    for (const doc of docs) {
      const existing = doc.getElementById(DB_TOAST_MUTE_STYLE_ID);
      if (enabled) {
        if (!existing) {
          const style = doc.createElement('style');
          style.id = DB_TOAST_MUTE_STYLE_ID;
          style.textContent = css;
          (doc.head || doc.documentElement).appendChild(style);
        }
        doc.querySelectorAll('.acu-toast').forEach(node => node.remove());
      } else if (existing) {
        existing.remove();
      }
    }
  } catch {
    return;
  }
}

export function getThemeColors(themeId: string): ThemeColors {
  return DATABASE_THEME_MAP[themeId] || DATABASE_THEME_MAP.aurora;
}

export function getAvailableThemes(): string[] {
  return Object.keys(DATABASE_THEME_MAP);
}
