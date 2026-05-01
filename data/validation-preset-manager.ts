/**
 * 验证规则预设管理器
 *
 * 用于管理数据库验证规则的预设
 */

import { AIDM_VALIDATION_PRESET } from './validation-presets';
import { storageSyncBus } from '../utils/storage-sync';
import type { ValidationRuleConfig, ValidationPreset } from './validation-presets';
import { compareVersion } from '../utils/helpers';

const STORAGE_KEY_PRESETS = 'acu_validation_presets_v1';
const STORAGE_KEY_ACTIVE_PRESET = 'acu_active_preset_id';
const PRESET_FORMAT_VERSION = '1.7.0';

export interface StoredValidationPreset {
  id: string;
  name: string;
  builtin: boolean;
  rules: ValidationRuleConfig[];
  version: string;
  createdAt: string;
}

export class ValidationPresetManager {
  private cache: StoredValidationPreset[] | null = null;

  constructor() {
    storageSyncBus.register(STORAGE_KEY_PRESETS, () => {
      this.cache = null;
    });
    storageSyncBus.register(STORAGE_KEY_ACTIVE_PRESET, () => {
      this.cache = null;
    });
  }

  private save(presets: StoredValidationPreset[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
      this.cache = presets;
    } catch (e) {
      console.warn('[ValidationPresetManager] 保存预设失败:', e);
    }
  }

  private load(): StoredValidationPreset[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRESETS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[ValidationPresetManager] 加载预设失败:', e);
    }
    return [];
  }

  private initDefaultPreset(): void {
    const stored = this.load();
    if (stored.length > 0) {
      this.cache = stored;
      return;
    }

    const defaultPreset: StoredValidationPreset = {
      id: 'default',
      name: '默认预设',
      builtin: true,
      rules: AIDM_VALIDATION_PRESET.preset.rules.map(r => ({ ...r })),
      version: PRESET_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
    };

    this.cache = [defaultPreset];
    this.save(this.cache);
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, 'default');
  }

  private mergeBuiltinRules(preset: StoredValidationPreset): void {
    const builtinRuleMap = new Map<string, ValidationRuleConfig>();
    AIDM_VALIDATION_PRESET.preset.rules.forEach(r => {
      const key = r.id || `${r.targetTable}_${r.ruleType}`;
      builtinRuleMap.set(key, r);
    });

    const mergedRules: ValidationRuleConfig[] = [];
    const processedKeys = new Set<string>();

    for (const rule of preset.rules) {
      const key = rule.id || `${rule.targetTable}_${rule.ruleType}`;
      if (rule.builtin && builtinRuleMap.has(key)) {
        const builtinRule = builtinRuleMap.get(key)!;
        mergedRules.push({
          ...builtinRule,
          enabled: rule.enabled,
          intercept: rule.intercept,
        });
        processedKeys.add(key);
      } else if (!rule.builtin) {
        mergedRules.push(rule);
      }
    }

    for (const [key, rule] of builtinRuleMap) {
      if (!processedKeys.has(key)) {
        mergedRules.push({ ...rule });
      }
    }

    preset.rules = mergedRules;
  }

  getAllPresets(): StoredValidationPreset[] {
    const stored = this.load();
    if (stored.length === 0) {
      this.initDefaultPreset();
      return this.cache!;
    }

    let needsSave = false;
    for (const preset of stored) {
      if (!preset.version || compareVersion(preset.version, PRESET_FORMAT_VERSION) < 0) {
        console.log(
          `[ValidationPresetManager] 检测到预设 "${preset.name}" 版本较旧 (${preset.version || '无版本'})，自动更新`,
        );

        if (preset.id === 'default') {
          const customRules = preset.rules.filter(r => !r.builtin);
          const existingBuiltinMap = new Map<string, { enabled: boolean; intercept: boolean }>();
          preset.rules
            .filter(r => r.builtin)
            .forEach(r => {
              const key = r.id || `${r.targetTable}_${r.ruleType}`;
              existingBuiltinMap.set(key, { enabled: r.enabled, intercept: r.intercept });
            });

          preset.rules = [
            ...AIDM_VALIDATION_PRESET.preset.rules.map(r => {
              const key = r.id || `${r.targetTable}_${r.ruleType}`;
              const existing = existingBuiltinMap.get(key);
              return {
                ...r,
                builtin: true,
                ...(existing ? { enabled: existing.enabled, intercept: existing.intercept } : {}),
              };
            }),
            ...customRules,
          ];
        } else {
          this.mergeBuiltinRules(preset);
        }

        preset.version = PRESET_FORMAT_VERSION;
        needsSave = true;
      }
    }

    if (needsSave) {
      this.save(stored);
    }

    this.cache = stored;
    return stored;
  }

  getActivePreset(): StoredValidationPreset {
    const presets = this.getAllPresets();
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET) || 'default';
    return presets.find(p => p.id === activeId) || presets[0];
  }

  setActivePreset(id: string): boolean {
    if (!this.getAllPresets().find(p => p.id === id)) return false;
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, id);
    console.log('[ValidationPresetManager] 切换预设:', id);
    return true;
  }

  createPreset(name: string): StoredValidationPreset {
    const presets = this.getAllPresets();
    const newPreset: StoredValidationPreset = {
      id: 'preset_' + Date.now(),
      name: name || '新预设',
      builtin: false,
      rules: [],
      version: PRESET_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
    };
    presets.push(newPreset);
    this.save(presets);
    return newPreset;
  }

  duplicatePreset(id: string): StoredValidationPreset | null {
    const source = this.getAllPresets().find(p => p.id === id);
    if (!source) return null;

    const presets = this.getAllPresets();
    const newPreset: StoredValidationPreset = {
      id: 'preset_' + Date.now(),
      name: source.name + ' (副本)',
      builtin: false,
      rules: JSON.parse(JSON.stringify(source.rules)),
      version: source.version || PRESET_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
    };
    presets.push(newPreset);
    this.save(presets);
    console.log('[ValidationPresetManager] 复制预设:', source.name, '->', newPreset.name);
    return newPreset;
  }

  deletePreset(id: string): boolean {
    const presets = this.getAllPresets();
    const preset = presets.find(p => p.id === id);
    if (!preset || preset.id === 'default') return false;

    const filtered = presets.filter(p => p.id !== id);
    this.save(filtered);

    if (localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET) === id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, 'default');
    }

    console.log('[ValidationPresetManager] 删除预设:', id);
    return true;
  }

  updatePresetRules(id: string, rules: ValidationRuleConfig[]): boolean {
    const presets = this.getAllPresets();
    const preset = presets.find(p => p.id === id);
    if (!preset) return false;

    preset.rules = rules;
    this.save(presets);
    return true;
  }

  exportPreset(id: string): string | null {
    const preset = this.getAllPresets().find(p => p.id === id);
    if (!preset) return null;

    return JSON.stringify(
      {
        format: 'acu_preset_v1',
        version: PRESET_FORMAT_VERSION,
        preset: { name: preset.name, rules: preset.rules },
      },
      null,
      2,
    );
  }

  importPreset(json: string, autoMerge = false): { preset: StoredValidationPreset | null; needsMerge: boolean } {
    try {
      const data = JSON.parse(json) as ValidationPreset;
      if (data.format !== 'acu_preset_v1' || !data.preset) {
        return { preset: null, needsMerge: false };
      }

      const importedVersion = data.version || '0.0.0';
      const needsMerge = compareVersion(importedVersion, PRESET_FORMAT_VERSION) < 0;

      const presets = this.getAllPresets();
      const newPreset: StoredValidationPreset = {
        id: 'imported_' + Date.now(),
        name: data.preset.name || '导入的预设',
        builtin: false,
        rules: data.preset.rules || [],
        version: importedVersion,
        createdAt: new Date().toISOString(),
      };

      presets.push(newPreset);
      this.save(presets);

      if (needsMerge && autoMerge) {
        this.mergePresetWithDefaults(newPreset.id);
        console.log('[ValidationPresetManager] 导入并合并预设:', newPreset.name);
      } else if (needsMerge) {
        console.warn('[ValidationPresetManager] 预设版本较旧，建议使用 mergePresetWithDefaults 方法合并新版本的默认值');
      } else {
        console.log('[ValidationPresetManager] 导入预设:', newPreset.name);
      }

      return { preset: newPreset, needsMerge: needsMerge && !autoMerge };
    } catch (e) {
      console.error('[ValidationPresetManager] 导入失败:', e);
      return { preset: null, needsMerge: false };
    }
  }

  mergePresetWithDefaults(presetId: string): boolean {
    const presets = this.getAllPresets();
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return false;

    const customRules = preset.rules.filter(r => !r.builtin);
    const builtinRuleIds = new Set(
      AIDM_VALIDATION_PRESET.preset.rules.map(r => r.id || `${r.targetTable}_${r.ruleType}`),
    );

    const builtinRuleMap = new Map<string, ValidationRuleConfig>();
    AIDM_VALIDATION_PRESET.preset.rules.forEach(r => {
      const key = r.id || `${r.targetTable}_${r.ruleType}`;
      builtinRuleMap.set(key, r);
    });

    const mergedRules: ValidationRuleConfig[] = [];
    const processedCustomIds = new Set<string>();

    for (const newRule of AIDM_VALIDATION_PRESET.preset.rules) {
      const key = newRule.id || `${newRule.targetTable}_${newRule.ruleType}`;
      const existingRule = preset.rules.find(
        r => (r.id || `${r.targetTable}_${r.ruleType}`) === key && r.builtin,
      );

      if (existingRule) {
        const isModified = JSON.stringify(existingRule) !== JSON.stringify(newRule);
        if (isModified) {
          mergedRules.push({ ...existingRule, builtin: true });
        } else {
          mergedRules.push({ ...newRule, builtin: true });
        }
      } else {
        mergedRules.push({ ...newRule, builtin: true });
      }
      processedCustomIds.add(key);
    }

    for (const rule of customRules) {
      const key = rule.id || `${rule.targetTable}_${rule.ruleType}`;
      if (!builtinRuleIds.has(key)) {
        mergedRules.push({ ...rule, builtin: false });
      }
    }

    preset.rules = mergedRules;
    preset.version = PRESET_FORMAT_VERSION;
    this.save(presets);
    console.log('[ValidationPresetManager] 合并预设:', preset.name);
    return true;
  }

  resetDefaultPreset(): boolean {
    const presets = this.getAllPresets();
    const defaultPreset = presets.find(p => p.id === 'default');
    if (!defaultPreset) return false;

    defaultPreset.rules = AIDM_VALIDATION_PRESET.preset.rules.map(r => ({ ...r }));
    defaultPreset.version = PRESET_FORMAT_VERSION;
    this.save(presets);
    console.log('[ValidationPresetManager] 重置默认预设');
    return true;
  }

  getRulesByTable(tableName: string): ValidationRuleConfig[] {
    const preset = this.getActivePreset();
    return preset.rules.filter(r => r.targetTable === tableName);
  }

  getEnabledRules(): ValidationRuleConfig[] {
    const preset = this.getActivePreset();
    return preset.rules.filter(r => r.enabled);
  }
}

export const validationPresetManager = new ValidationPresetManager();
