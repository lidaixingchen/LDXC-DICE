import { ref, computed } from 'vue';
import type { MvuData, MvuPanelState, MvuVariable, NumericVariable } from '../types/mvu';

const MVU_NUMERIC_MODE_KEY = 'acu_mvu_numeric_mode';
const MVU_VISIBLE_LEVELS_KEY = 'acu_mvu_numeric_mode_visible_levels';
const MVU_PANEL_STATE_KEY = 'acu_mvu_panel_state';

const mvuData = ref<MvuData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const panelState = ref<MvuPanelState>({
  visible: false,
  minimized: false,
  numericMode: false,
  visibleLevels: {},
  height: 400,
  position: { x: 20, y: 80 },
});

function loadSavedState(): void {
  try {
    const savedNumeric = localStorage.getItem(MVU_NUMERIC_MODE_KEY);
    panelState.value.numericMode = savedNumeric === 'true';

    const savedLevels = localStorage.getItem(MVU_VISIBLE_LEVELS_KEY);
    if (savedLevels) {
      panelState.value.visibleLevels = JSON.parse(savedLevels);
    }

    const savedPanel = localStorage.getItem(MVU_PANEL_STATE_KEY);
    if (savedPanel) {
      const parsed = JSON.parse(savedPanel);
      panelState.value.height = parsed.height ?? 400;
      panelState.value.position = parsed.position ?? { x: 20, y: 80 };
    }
  } catch (e) {
    console.warn('[MVU] Failed to load saved state:', e);
  }
}

function saveState(): void {
  try {
    localStorage.setItem(MVU_NUMERIC_MODE_KEY, String(panelState.value.numericMode));
    localStorage.setItem(MVU_VISIBLE_LEVELS_KEY, JSON.stringify(panelState.value.visibleLevels));
    localStorage.setItem(MVU_PANEL_STATE_KEY, JSON.stringify({
      height: panelState.value.height,
      position: panelState.value.position,
    }));
  } catch (e) {
    console.warn('[MVU] Failed to save state:', e);
  }
}

let cachedTopWindow: Window | null = null;

function getTopWindow(): Window {
  if (cachedTopWindow) return cachedTopWindow;
  let topWindow: Window = window;
  try {
    let current: Window = window;
    while (current.parent && current.parent !== current) {
      current = current.parent;
      topWindow = current;
    }
  } catch {
    // 跨域拦截
  }
  cachedTopWindow = topWindow;
  return topWindow;
}

function getDbAPI(): any {
  const topWin = getTopWindow();
  return (topWin as any).AutoCardUpdaterAPI || (window as any).AutoCardUpdaterAPI;
}

function getMvuDataFromWindow(): MvuData | null {
  const win = window as any;
  const topWin = getTopWindow() as any;
  const api = getDbAPI();

  console.log('[MVU] 尝试获取变量数据...');
  console.log('[MVU] API 可用:', !!api);
  console.log('[MVU] API 方法:', api ? Object.keys(api) : 'N/A');

  if (api) {
    if (typeof api.getMvuData === 'function') {
      try {
        const data = api.getMvuData();
        if (data) {
          console.log('[MVU] 从 API.getMvuData 获取成功');
          return {
            _source: 'mvu',
            stat_data: data.stat_data || data,
            delta_data: data.delta_data,
          };
        }
      } catch (e) {
        console.warn('[MVU] API.getMvuData 调用失败:', e);
      }
    }

    if (typeof api.getVariables === 'function') {
      try {
        const data = api.getVariables();
        if (data) {
          console.log('[MVU] 从 API.getVariables 获取成功');
          return {
            _source: 'mvu',
            stat_data: data.stat_data || data,
            delta_data: data.delta_data,
          };
        }
      } catch (e) {
        console.warn('[MVU] API.getVariables 调用失败:', e);
      }
    }

    if (typeof api.exportTableAsJson === 'function') {
      try {
        const tableData = api.exportTableAsJson();
        if (tableData) {
          for (const key in tableData) {
            if (key.startsWith('sheet_')) {
              const sheet = tableData[key];
              if (sheet?.name && (
                sheet.name.includes('变量') ||
                sheet.name.includes('MVU') ||
                sheet.name.includes('状态') ||
                sheet.name.toLowerCase().includes('variable') ||
                sheet.name.toLowerCase().includes('stat')
              )) {
                console.log('[MVU] 从表格获取变量数据:', sheet.name);
                const vars: Record<string, any> = {};
                const headers = sheet.content?.[0] || [];
                const rows = sheet.content?.slice(1) || [];
                rows.forEach((row: any[]) => {
                  if (row && row[0]) {
                    const varName = String(row[0]);
                    const varValue = row[1] !== undefined ? row[1] : row[2];
                    vars[varName] = varValue;
                  }
                });
                if (Object.keys(vars).length > 0) {
                  return {
                    _source: 'mvu',
                    stat_data: vars,
                  };
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[MVU] 从表格获取变量失败:', e);
      }
    }
  }

  const mvuSource = topWin.MVU_VARS || topWin.mvu_vars || win.MVU_VARS || win.mvu_vars;
  if (mvuSource) {
    console.log('[MVU] 从全局变量获取成功');
    return {
      _source: 'mvu',
      stat_data: mvuSource.stat_data || mvuSource,
      delta_data: mvuSource.delta_data,
    };
  }

  if (win.ERA_VARS || topWin.ERA_VARS) {
    console.log('[MVU] 从 ERA_VARS 获取成功');
    return { _source: 'era', stat_data: win.ERA_VARS || topWin.ERA_VARS };
  }

  if (win.LWB_VARS || topWin.LWB_VARS) {
    console.log('[MVU] 从 LWB_VARS 获取成功');
    return { _source: 'lwb', stat_data: win.LWB_VARS || topWin.LWB_VARS };
  }

  if (topWin.variables || win.variables) {
    console.log('[MVU] 从 variables 获取成功');
    return { _source: 'mvu', stat_data: topWin.variables || win.variables };
  }

  if (topWin.gameState || win.gameState) {
    console.log('[MVU] 从 gameState 获取成功');
    return { _source: 'mvu', stat_data: topWin.gameState || win.gameState };
  }

  console.log('[MVU] 未找到变量数据源');
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumeric(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value);
}

function parseVariables(
  data: Record<string, unknown>,
  deltaData: Record<string, { old: unknown; new: unknown }> | undefined,
  parentPath = '',
  depth = 0
): MvuVariable[] {
  const result: MvuVariable[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('$') || key.startsWith('_')) continue;

    const path = parentPath ? `${parentPath}.${key}` : key;
    const delta = deltaData?.[path];

    const variable: MvuVariable = {
      name: key,
      value,
      path,
      depth,
      isExpanded: depth === 0,
      delta: delta ? { old: delta.old, new: delta.new } : undefined,
    };

    if (isPlainObject(value)) {
      variable.children = parseVariables(value, deltaData, path, depth + 1);
    } else if (Array.isArray(value) && value.length > 0 && isPlainObject(value[0])) {
      variable.children = value.map((item, index) => ({
        name: `[${index}]`,
        value: item,
        path: `${path}[${index}]`,
        depth: depth + 1,
        isExpanded: false,
        children: isPlainObject(item) ? parseVariables(item, deltaData, `${path}[${index}]`, depth + 2) : undefined,
      }));
    }

    result.push(variable);
  }

  return result;
}

function extractNumericVariables(
  data: Record<string, unknown>,
  deltaData: Record<string, { old: unknown; new: unknown }> | undefined,
  parentPath = '',
  levels: string[] = []
): NumericVariable[] {
  const result: NumericVariable[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('$') || key.startsWith('_')) continue;

    const path = parentPath ? `${parentPath}.${key}` : key;
    const currentLevels = [...levels, key];

    if (isNumeric(value)) {
      const delta = deltaData?.[path];
      result.push({
        path,
        value: value as number,
        levels: currentLevels,
        delta: delta && isNumeric(delta.old) && isNumeric(delta.new)
          ? { old: delta.old as number, new: delta.new as number }
          : undefined,
      });
    }

    if (isPlainObject(value)) {
      result.push(...extractNumericVariables(value, deltaData, path, currentLevels));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (isPlainObject(item)) {
          result.push(...extractNumericVariables(item, deltaData, `${path}[${index}]`, currentLevels));
        }
      });
    }
  }

  return result;
}

const variables = computed<MvuVariable[]>(() => {
  if (!mvuData.value?.stat_data) return [];
  return parseVariables(mvuData.value.stat_data, mvuData.value.delta_data);
});

const numericVariables = computed<NumericVariable[]>(() => {
  if (!mvuData.value?.stat_data) return [];
  return extractNumericVariables(mvuData.value.stat_data, mvuData.value.delta_data);
});

const allLevels = computed<string[]>(() => {
  const levels = new Set<string>();
  numericVariables.value.forEach(v => {
    v.levels.forEach(l => levels.add(l));
  });
  return Array.from(levels).sort();
});

const filteredNumericVariables = computed<NumericVariable[]>(() => {
  const visibleLevels = panelState.value.visibleLevels;
  if (Object.keys(visibleLevels).length === 0) {
    return numericVariables.value;
  }

  return numericVariables.value.filter(v => {
    return v.levels.some(level => visibleLevels[level] !== false);
  });
});

const variableCount = computed(() => {
  return Object.keys(mvuData.value?.stat_data || {}).filter(k => !k.startsWith('$') && !k.startsWith('_')).length;
});

const modeLabel = computed(() => {
  const mode = mvuData.value?._source || 'mvu';
  const labels: Record<string, string> = {
    mvu: 'MVU 变量',
    era: 'ERA 变量',
    lwb: 'LWB 变量',
  };
  return labels[mode] || 'MVU 变量';
});

async function refresh(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const data = getMvuDataFromWindow();
    if (data) {
      mvuData.value = data;
      console.log('[MVU] 变量数据刷新成功，共', variableCount.value, '个变量');
    } else {
      error.value = '无法获取变量数据';
      console.log('[MVU] 变量数据获取失败');
    }
  } catch (e) {
    error.value = String(e);
    console.error('[MVU] Refresh error:', e);
  } finally {
    loading.value = false;
  }
}

function toggleNumericMode(): void {
  panelState.value.numericMode = !panelState.value.numericMode;
  saveState();
}

function toggleLevelVisibility(level: string): void {
  panelState.value.visibleLevels[level] = !panelState.value.visibleLevels[level];
  saveState();
}

function show(): void {
  panelState.value.visible = true;
  panelState.value.minimized = false;
  refresh();
}

function hide(): void {
  panelState.value.visible = false;
}

function minimize(): void {
  panelState.value.minimized = true;
}

function restore(): void {
  panelState.value.minimized = false;
}

function setHeight(height: number): void {
  panelState.value.height = Math.max(200, Math.min(800, height));
  saveState();
}

function setPosition(x: number, y: number): void {
  panelState.value.position = { x, y };
  saveState();
}

let mvuInitialized = false;

function initMvu(): void {
  if (mvuInitialized) return;
  mvuInitialized = true;

  loadSavedState();
  refresh();

  if (typeof window !== 'undefined') {
    window.addEventListener('acu-data-updated', () => {
      refresh();
    });
  }
}

export function useMvu() {
  initMvu();
  return {
    mvuData,
    variables,
    numericVariables,
    filteredNumericVariables,
    allLevels,
    variableCount,
    modeLabel,
    loading,
    error,
    panelState,
    refresh,
    toggleNumericMode,
    toggleLevelVisibility,
    show,
    hide,
    minimize,
    restore,
    setHeight,
    setPosition,
  };
}
