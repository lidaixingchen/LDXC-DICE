export interface DiceSystemSettings {
  general: GeneralSettings;
  display: DisplaySettings;
  behavior: BehaviorSettings;
  validation: ValidationSettings;
  advanced: AdvancedSettings;
  legacy: LegacySettings;
}

export interface LegacySettings {
  layout: 'horizontal' | 'vertical';
  collapseStyle: 'bar' | 'dot' | 'icon'; // [补回] 折叠样式
  collapseAlign: 'left' | 'right' | 'center'; // [补回] 折叠对齐
  fontFamily: string;
  theme: string;
  cardWidth: number;
  fontSize: number;
  highlightNew: boolean;
  itemsPerPage: number;
  actionsPosition: 'top' | 'bottom'; // [补回] 导航栏位置
  gridColumns: 'auto' | '2' | '3' | '4'; // [补回] 导航网格列数
  positionMode: 'fixed' | 'embedded';
  bottomOffset: number; // [新增] 悬浮模式垂直偏移
  showOptionPanel: boolean;
  clickOptionToAutoSend: boolean;
  optionFontSize: number;
  muteDatabaseToasts: boolean;
  navButtonHeight: number;
  navButtonIconSize: number;
  actionButtonSize: number;
  actionButtonIconSize: number;
  hideDashboardButton: boolean;
  hideDiceResultFromUser: boolean;
  crazyMode: boolean;
  hiddenTableKeys: string[];
  tableOrderKeys: string[];
  tableFontSize: number;
}

export interface GeneralSettings {
  defaultPresetId: string;
  defaultAttribute: string;
  defaultDc: number;
  defaultModifier: number;
  autoSave: boolean;
  autoSaveInterval: number;
  language: 'zh-CN' | 'en-US';
}

export interface DisplaySettings {
  theme: string;
  fontSize: 'small' | 'medium' | 'large';
  showAnimations: boolean;
  showTooltips: boolean;
  compactMode: boolean;
  showRollAnimation: boolean;
  resultDisplayMode: 'simple' | 'detailed' | 'verbose';
  showEffectConfirmation: boolean;
}

export interface BehaviorSettings {
  confirmBeforeEffect: boolean;
  autoApplyEffects: boolean;
  rememberLastValues: boolean;
  quickRollEnabled: boolean;
  quickRollModifier: number;
  historySize: number;
  autoHidePanel: boolean;
  autoHideDelay: number;
}

export interface ValidationSettings {
  strictMode: boolean;
  validateOnLoad: boolean;
  validateOnSave: boolean;
  showValidationWarnings: boolean;
  autoFixCommonErrors: boolean;
  customValidationRules: CustomValidationRule[];
}

export interface AdvancedSettings {
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableExperimentalFeatures: boolean;
  customCss: string;
  performanceMode: boolean;
  cacheSize: number;
}

export interface CustomValidationRule {
  id: string;
  name: string;
  enabled: boolean;
  pattern: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SettingsGroup {
  key: keyof DiceSystemSettings;
  label: string;
  icon: string;
  description: string;
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    key: 'legacy',
    label: '全能设置',
    icon: 'fa:cogs',
    description: '原版兼容设置',
  },
  {
    key: 'general',
    label: '常规设置',
    icon: 'fa:cog',
    description: '基础配置选项',
  },
  {
    key: 'display',
    label: '显示设置',
    icon: 'fa:palette',
    description: '界面外观配置',
  },
  {
    key: 'behavior',
    label: '行为设置',
    icon: 'fa:play',
    description: '交互行为配置',
  },
  {
    key: 'validation',
    label: '验证设置',
    icon: 'fa:check-circle',
    description: '数据验证配置',
  },
  {
    key: 'advanced',
    label: '高级设置',
    icon: 'fa:wrench',
    description: '高级选项配置',
  },
];

const SETTINGS_STORAGE_KEY = 'acu_dice_settings';
const ISOLATED_LEGACY_UI_CONFIG_STORAGE_KEY = 'acu_ui_config_reset_v1';
const ORIGINAL_LEGACY_UI_CONFIG_STORAGE_KEY = 'acu_ui_config_v19';

const DEFAULT_SETTINGS: DiceSystemSettings = {
  legacy: {
    layout: 'horizontal',
    collapseStyle: 'bar',
    collapseAlign: 'right',
    fontFamily: 'default',
    theme: 'retro',
    cardWidth: 260,
    fontSize: 13,
    highlightNew: true,
    itemsPerPage: 50,
    actionsPosition: 'bottom',
    gridColumns: 'auto',
    positionMode: 'fixed',
    bottomOffset: 20, // [新增]
    showOptionPanel: true,
    clickOptionToAutoSend: true,
    optionFontSize: 12,
    muteDatabaseToasts: false,
    navButtonHeight: 32,
    navButtonIconSize: 12,
    actionButtonSize: 30,
    actionButtonIconSize: 12,
    hideDashboardButton: false,
    hideDiceResultFromUser: false,
    hiddenTableKeys: [],
    tableOrderKeys: [],
    tableFontSize: 13,
  },
  general: {
    defaultPresetId: 'aidm_standard_check',
    defaultAttribute: '',
    defaultDc: 50,
    defaultModifier: 0,
    autoSave: true,
    autoSaveInterval: 30000,
    language: 'zh-CN',
  },
  display: {
    theme: 'aurora',
    fontSize: 'medium',
    showAnimations: true,
    showTooltips: true,
    compactMode: false,
    showRollAnimation: true,
    resultDisplayMode: 'detailed',
    showEffectConfirmation: true,
  },
  behavior: {
    confirmBeforeEffect: true,
    autoApplyEffects: false,
    rememberLastValues: true,
    quickRollEnabled: true,
    quickRollModifier: 0,
    historySize: 50,
    autoHidePanel: false,
    autoHideDelay: 5000,
  },
  validation: {
    strictMode: false,
    validateOnLoad: true,
    validateOnSave: true,
    showValidationWarnings: true,
    autoFixCommonErrors: true,
    customValidationRules: [],
  },
  advanced: {
    debugMode: false,
    logLevel: 'info',
    enableExperimentalFeatures: false,
    customCss: '',
    performanceMode: false,
    cacheSize: 100,
  },
};

type SettingsChangeCallback = (settings: DiceSystemSettings) => void;

export class SettingsManager {
  private settings: DiceSystemSettings;
  private callbacks: Set<SettingsChangeCallback> = new Set();
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.settings = this.loadFromStorage();
    this.setupAutoSave();
  }

  private loadFromStorage(): DiceSystemSettings {
    const legacyConfig = this.readLegacyUiConfig();

    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const merged = this.mergeWithDefaults(data);
        return {
          ...merged,
          legacy: {
            ...merged.legacy,
            ...legacyConfig,
          },
        };
      }
    } catch (e) {
      console.warn('[SettingsManager] 加载设置失败:', e);
    }

    const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as DiceSystemSettings;
    defaults.legacy = {
      ...defaults.legacy,
      ...legacyConfig,
    };
    return defaults;
  }

  private readLegacyUiConfig(): Partial<LegacySettings> {
    const isolated = this.readConfigByKey(ISOLATED_LEGACY_UI_CONFIG_STORAGE_KEY);
    if (Object.keys(isolated).length > 0) {
      return this.normalizeLegacyConfig(isolated);
    }

    const original = this.readConfigByKey(ORIGINAL_LEGACY_UI_CONFIG_STORAGE_KEY);
    return this.normalizeLegacyConfig(original);
  }

  private readConfigByKey(storageKey: string): Record<string, unknown> {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return {};

      const data = JSON.parse(stored) as Record<string, unknown>;
      if (!data || typeof data !== 'object') return {};
      return data;
    } catch {
      return {};
    }
  }

  private normalizeLegacyConfig(raw: Record<string, unknown>): Partial<LegacySettings> {
    const normalized: Partial<LegacySettings> = {};

    if (raw.layout === 'horizontal' || raw.layout === 'vertical') {
      normalized.layout = raw.layout;
    }

    if (raw.collapseAlign === 'left' || raw.collapseAlign === 'right' || raw.collapseAlign === 'center') {
      normalized.collapseAlign = raw.collapseAlign;
    }

    const collapseStyleRaw = raw.collapseStyle;
    if (collapseStyleRaw === 'bar' || collapseStyleRaw === 'dot' || collapseStyleRaw === 'icon') {
      normalized.collapseStyle = collapseStyleRaw;
    } else if (collapseStyleRaw === 'mini') {
      normalized.collapseStyle = 'dot';
    } else if (collapseStyleRaw === 'pill') {
      normalized.collapseStyle = 'icon';
    }

    const gridColumnsRaw = raw.gridColumns;
    if (gridColumnsRaw === 'auto' || gridColumnsRaw === '2' || gridColumnsRaw === '3' || gridColumnsRaw === '4') {
      normalized.gridColumns = gridColumnsRaw;
    } else if (gridColumnsRaw === 2 || gridColumnsRaw === 3 || gridColumnsRaw === 4) {
      normalized.gridColumns = String(gridColumnsRaw) as LegacySettings['gridColumns'];
    }

    if (raw.actionsPosition === 'top' || raw.actionsPosition === 'bottom') {
      normalized.actionsPosition = raw.actionsPosition;
    }

    if (raw.positionMode === 'fixed' || raw.positionMode === 'embedded') {
      normalized.positionMode = raw.positionMode;
    }

    if (typeof raw.fontFamily === 'string') normalized.fontFamily = raw.fontFamily;
    if (typeof raw.theme === 'string') normalized.theme = raw.theme;
    if (typeof raw.cardWidth === 'number') normalized.cardWidth = raw.cardWidth;
    if (typeof raw.fontSize === 'number') normalized.fontSize = raw.fontSize;
    if (typeof raw.highlightNew === 'boolean') normalized.highlightNew = raw.highlightNew;
    if (typeof raw.itemsPerPage === 'number') normalized.itemsPerPage = raw.itemsPerPage;
    if (typeof raw.showOptionPanel === 'boolean') normalized.showOptionPanel = raw.showOptionPanel;
    if (typeof raw.clickOptionToAutoSend === 'boolean') {
      normalized.clickOptionToAutoSend = raw.clickOptionToAutoSend;
    }
    if (typeof raw.optionFontSize === 'number') normalized.optionFontSize = raw.optionFontSize;
    if (typeof raw.muteDatabaseToasts === 'boolean') normalized.muteDatabaseToasts = raw.muteDatabaseToasts;
    if (typeof raw.navButtonHeight === 'number') normalized.navButtonHeight = raw.navButtonHeight;
    if (typeof raw.navButtonIconSize === 'number') normalized.navButtonIconSize = raw.navButtonIconSize;
    if (typeof raw.actionButtonSize === 'number') normalized.actionButtonSize = raw.actionButtonSize;
    if (typeof raw.actionButtonIconSize === 'number') normalized.actionButtonIconSize = raw.actionButtonIconSize;
    if (typeof raw.hideDashboardButton === 'boolean') normalized.hideDashboardButton = raw.hideDashboardButton;
    if (Array.isArray(raw.hiddenTableKeys)) {
      normalized.hiddenTableKeys = raw.hiddenTableKeys.filter(v => typeof v === 'string') as string[];
    }
    if (Array.isArray(raw.tableOrderKeys)) {
      normalized.tableOrderKeys = raw.tableOrderKeys.filter(v => typeof v === 'string') as string[];
    }

    return normalized;
  }

  private mergeWithDefaults(data: Partial<DiceSystemSettings>): DiceSystemSettings {
    const result = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    for (const groupKey of Object.keys(data) as Array<keyof DiceSystemSettings>) {
      if (result[groupKey] && typeof data[groupKey] === 'object') {
        result[groupKey] = {
          ...result[groupKey],
          ...data[groupKey],
        };
      }
    }

    return result;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      localStorage.setItem(ISOLATED_LEGACY_UI_CONFIG_STORAGE_KEY, JSON.stringify(this.settings.legacy));
    } catch (e) {
      console.warn('[SettingsManager] 保存设置失败:', e);
    }
  }

  private setupAutoSave(): void {
    if (this.settings.general.autoSave) {
      this.autoSaveTimer = setInterval(() => {
        this.saveToStorage();
      }, this.settings.general.autoSaveInterval);
    }
  }

  getSettings(): DiceSystemSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  getGroup<K extends keyof DiceSystemSettings>(group: K): DiceSystemSettings[K] {
    return JSON.parse(JSON.stringify(this.settings[group]));
  }

  getValue<K extends keyof DiceSystemSettings, F extends keyof DiceSystemSettings[K]>(
    group: K,
    field: F,
  ): DiceSystemSettings[K][F] {
    return this.settings[group][field];
  }

  updateSettings(updates: Partial<DiceSystemSettings>): void {
    const current = this.settings as unknown as Record<string, unknown>;
    const update = updates as unknown as Record<string, unknown>;
    for (const groupKey of Object.keys(updates) as Array<keyof DiceSystemSettings>) {
      if (update[groupKey] && typeof update[groupKey] === 'object') {
        current[groupKey] = {
          ...(current[groupKey] as object),
          ...(update[groupKey] as object),
        };
      }
    }
    this.saveToStorage();
    this.notifyChange();
  }

  updateValue<K extends keyof DiceSystemSettings, F extends keyof DiceSystemSettings[K]>(
    group: K,
    field: F,
    value: DiceSystemSettings[K][F],
  ): void {
    (this.settings[group] as unknown as Record<string, unknown>)[field as string] = value;
    this.saveToStorage();
    this.notifyChange();
  }

  resetGroup(group: keyof DiceSystemSettings): void {
    this.settings[group] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[group]));
    this.saveToStorage();
    this.notifyChange();
  }

  resetAll(): void {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.saveToStorage();
    this.notifyChange();
  }

  onChange(callback: SettingsChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyChange(): void {
    for (const callback of this.callbacks) {
      try {
        callback(this.settings);
      } catch (e) {
        console.error('[SettingsManager] 回调执行失败:', e);
      }
    }
  }

  exportSettings(): string {
    return JSON.stringify(
      {
        settings: this.settings,
        exportedAt: Date.now(),
        version: '1.0.0',
      },
      null,
      2,
    );
  }

  importSettings(json: string): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const data = JSON.parse(json);

      if (data.settings) {
        this.settings = this.mergeWithDefaults(data.settings);
        this.saveToStorage();
        this.notifyChange();
        return { success: true, errors: [] };
      }

      errors.push('无效的设置文件格式');
      return { success: false, errors };
    } catch (e) {
      errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
      return { success: false, errors };
    }
  }

  addCustomValidationRule(rule: Omit<CustomValidationRule, 'id'>): CustomValidationRule {
    const newRule: CustomValidationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.settings.validation.customValidationRules.push(newRule);
    this.saveToStorage();
    this.notifyChange();

    return newRule;
  }

  updateCustomValidationRule(id: string, updates: Partial<CustomValidationRule>): boolean {
    const idx = this.settings.validation.customValidationRules.findIndex(r => r.id === id);
    if (idx < 0) return false;

    this.settings.validation.customValidationRules[idx] = {
      ...this.settings.validation.customValidationRules[idx],
      ...updates,
    };

    this.saveToStorage();
    this.notifyChange();
    return true;
  }

  removeCustomValidationRule(id: string): boolean {
    const idx = this.settings.validation.customValidationRules.findIndex(r => r.id === id);
    if (idx < 0) return false;

    this.settings.validation.customValidationRules.splice(idx, 1);
    this.saveToStorage();
    this.notifyChange();
    return true;
  }

  getCustomValidationRules(): CustomValidationRule[] {
    return [...this.settings.validation.customValidationRules];
  }

  getEnabledCustomValidationRules(): CustomValidationRule[] {
    return this.settings.validation.customValidationRules.filter(r => r.enabled);
  }

  isDebugMode(): boolean {
    return this.settings.advanced.debugMode;
  }

  getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    return this.settings.advanced.logLevel;
  }

  shouldValidateOnLoad(): boolean {
    return this.settings.validation.validateOnLoad;
  }

  shouldValidateOnSave(): boolean {
    return this.settings.validation.validateOnSave;
  }

  shouldConfirmBeforeEffect(): boolean {
    return this.settings.behavior.confirmBeforeEffect;
  }

  shouldShowEffectConfirmation(): boolean {
    return this.settings.display.showEffectConfirmation;
  }

  getTheme(): string {
    return this.settings.display.theme;
  }

  setTheme(theme: string): void {
    this.updateValue('display', 'theme', theme);
  }

  getHistorySize(): number {
    return this.settings.behavior.historySize;
  }

  getDefaultPresetId(): string {
    return this.settings.general.defaultPresetId;
  }

  setDefaultPresetId(id: string): void {
    this.updateValue('general', 'defaultPresetId', id);
  }

  getLegacySettings(): LegacySettings {
    return JSON.parse(JSON.stringify(this.settings.legacy));
  }

  updateLegacySettings(updates: Partial<LegacySettings>): void {
    this.settings.legacy = {
      ...this.settings.legacy,
      ...updates,
    };
    this.saveToStorage();
    this.notifyChange();
  }

  resetLegacySettings(): void {
    this.settings.legacy = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.legacy));
    this.saveToStorage();
    this.notifyChange();
  }
}

export const settingsManager = new SettingsManager();
