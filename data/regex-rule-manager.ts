import type { RegexRule, RegexRuleCategory, TransformOptions } from '../core/validation/regex-engine';
import { regexEngine } from '../core/validation/regex-engine';

const REGEX_PRESETS_KEY = 'acu_regex_presets';
const CURRENT_REGEX_PRESET_KEY = 'acu_current_regex_preset';

export interface RegexPreset {
  id: string;
  name: string;
  description?: string;
  rules: RegexRuleConfig[];
  createdAt: number;
  updatedAt: number;
}

export interface RegexRuleConfig {
  id: string;
  name: string;
  description: string;
  pattern: string;
  replacement: string;
  flags?: string;
  enabled: boolean;
  priority: number;
  category: RegexRuleCategory;
}

export interface SillyTavernRegexScript {
  scriptName: string;
  findRegex: string;
  replaceString: string;
  wrapped?: boolean;
  runOn?: string;
}

export interface SillyTavernRegexExport {
  regex_scripts: SillyTavernRegexScript[];
}

export class RegexRuleManager {
  private presets: Map<string, RegexPreset> = new Map();
  private currentPresetId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(REGEX_PRESETS_KEY);
      if (stored) {
        const presets = JSON.parse(stored) as RegexPreset[];
        for (const preset of presets) {
          this.presets.set(preset.id, preset);
        }
      }

      const currentId = localStorage.getItem(CURRENT_REGEX_PRESET_KEY);
      if (currentId && this.presets.has(currentId)) {
        this.currentPresetId = currentId;
      }
    } catch (e) {
      console.warn('[RegexRuleManager] 加载预设失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const presets = Array.from(this.presets.values());
      localStorage.setItem(REGEX_PRESETS_KEY, JSON.stringify(presets));

      if (this.currentPresetId) {
        localStorage.setItem(CURRENT_REGEX_PRESET_KEY, this.currentPresetId);
      }
    } catch (e) {
      console.warn('[RegexRuleManager] 保存预设失败:', e);
    }
  }

  createPreset(name: string, description?: string): RegexPreset {
    const preset: RegexPreset = {
      id: `regex_preset_${Date.now()}`,
      name,
      description,
      rules: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.presets.set(preset.id, preset);
    this.saveToStorage();

    return preset;
  }

  updatePreset(id: string, updates: Partial<RegexPreset>): boolean {
    const preset = this.presets.get(id);
    if (!preset) return false;

    const updated = {
      ...preset,
      ...updates,
      id: preset.id,
      updatedAt: Date.now(),
    };

    this.presets.set(id, updated);
    this.saveToStorage();

    return true;
  }

  deletePreset(id: string): boolean {
    const result = this.presets.delete(id);
    if (result) {
      if (this.currentPresetId === id) {
        this.currentPresetId = null;
      }
      this.saveToStorage();
    }
    return result;
  }

  getPreset(id: string): RegexPreset | null {
    return this.presets.get(id) || null;
  }

  getAllPresets(): RegexPreset[] {
    return Array.from(this.presets.values());
  }

  setCurrentPreset(id: string): boolean {
    if (!this.presets.has(id)) return false;
    this.currentPresetId = id;
    this.saveToStorage();
    return true;
  }

  getCurrentPreset(): RegexPreset | null {
    if (!this.currentPresetId) return null;
    return this.presets.get(this.currentPresetId) || null;
  }

  addRuleToPreset(presetId: string, rule: Omit<RegexRuleConfig, 'id'>): RegexRuleConfig {
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error('预设不存在');

    const newRule: RegexRuleConfig = {
      ...rule,
      id: `regex_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    preset.rules.push(newRule);
    preset.updatedAt = Date.now();
    this.saveToStorage();

    this.syncToEngine(preset);

    return newRule;
  }

  updateRuleInPreset(presetId: string, ruleId: string, updates: Partial<RegexRuleConfig>): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) return false;

    const ruleIndex = preset.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    preset.rules[ruleIndex] = {
      ...preset.rules[ruleIndex],
      ...updates,
      id: ruleId,
    };
    preset.updatedAt = Date.now();
    this.saveToStorage();

    this.syncToEngine(preset);

    return true;
  }

  removeRuleFromPreset(presetId: string, ruleId: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) return false;

    preset.rules = preset.rules.filter(r => r.id !== ruleId);
    preset.updatedAt = Date.now();
    this.saveToStorage();

    this.syncToEngine(preset);

    return true;
  }

  toggleRule(presetId: string, ruleId: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) return false;

    const rule = preset.rules.find(r => r.id === ruleId);
    if (!rule) return false;

    rule.enabled = !rule.enabled;
    preset.updatedAt = Date.now();
    this.saveToStorage();

    this.syncToEngine(preset);

    return true;
  }

  private syncToEngine(preset: RegexPreset): void {
    for (const rule of preset.rules) {
      try {
        if (regexEngine.getRule(rule.id)) {
          regexEngine.removeRule(rule.id);
        }

        const engineRule: RegexRule = {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          pattern: new RegExp(rule.pattern, rule.flags || 'g'),
          replacement: rule.replacement,
          enabled: rule.enabled,
          priority: rule.priority,
          category: rule.category,
        };

        regexEngine.addRule(engineRule);
      } catch (e) {
        console.warn(`[RegexRuleManager] 同步规则 ${rule.name} 失败:`, e);
      }
    }
  }

  applyCurrentPreset(): void {
    const preset = this.getCurrentPreset();
    if (!preset) return;

    this.syncToEngine(preset);
  }

  testRule(ruleId: string, input: string): { original: string; transformed: string; matched: boolean } {
    const result = regexEngine.testRule(ruleId, input);
    return {
      original: result.original,
      transformed: result.transformed,
      matched: result.appliedRules.length > 0,
    };
  }

  transform(input: string, options?: Partial<TransformOptions>): { original: string; transformed: string; appliedRules: string[] } {
    const result = regexEngine.transform(input, { options: options as any });
    return {
      original: result.original,
      transformed: result.transformed,
      appliedRules: result.appliedRules.map(r => r.ruleName),
    };
  }

  importFromSillyTavern(json: string): { imported: number; errors: string[]; rules: RegexRuleConfig[] } {
    const result = {
      imported: 0,
      errors: [] as string[],
      rules: [] as RegexRuleConfig[],
    };

    try {
      const data: SillyTavernRegexExport = JSON.parse(json);

      if (!Array.isArray(data.regex_scripts)) {
        result.errors.push('无效的酒馆正则格式：缺少 regex_scripts 数组');
        return result;
      }

      for (let i = 0; i < data.regex_scripts.length; i++) {
        const script = data.regex_scripts[i];

        if (!script.findRegex) {
          result.errors.push(`脚本 ${i + 1}: 缺少正则表达式`);
          continue;
        }

        try {
          new RegExp(script.findRegex);

          const rule: RegexRuleConfig = {
            id: `st_${Date.now()}_${i}`,
            name: script.scriptName || `酒馆正则 ${i + 1}`,
            description: `从酒馆导入: ${script.scriptName || ''}`,
            pattern: script.findRegex,
            replacement: script.replaceString || '',
            enabled: true,
            priority: 100 - i,
            category: 'custom',
          };

          result.rules.push(rule);
          result.imported++;
        } catch (e) {
          result.errors.push(`脚本 ${i + 1} (${script.scriptName}): 无效的正则表达式`);
        }
      }
    } catch (e) {
      result.errors.push(`解析失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }

    return result;
  }

  exportToSillyTavern(presetId: string): string | null {
    const preset = this.presets.get(presetId);
    if (!preset) return null;

    const scripts: SillyTavernRegexScript[] = preset.rules
      .filter(r => r.enabled)
      .map(rule => ({
        scriptName: rule.name,
        findRegex: rule.pattern,
        replaceString: rule.replacement,
        wrapped: false,
        runOn: 'ai_output',
      }));

    const exportData: SillyTavernRegexExport = {
      regex_scripts: scripts,
    };

    return JSON.stringify(exportData, null, 2);
  }

  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) return null;
    return JSON.stringify(preset, null, 2);
  }

  importPreset(json: string): { success: boolean; preset: RegexPreset | null; error?: string } {
    try {
      const data = JSON.parse(json);

      if (!data.name || !Array.isArray(data.rules)) {
        return { success: false, preset: null, error: '无效的预设格式' };
      }

      const preset: RegexPreset = {
        id: data.id || `imported_${Date.now()}`,
        name: data.name,
        description: data.description,
        rules: data.rules,
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (this.presets.has(preset.id)) {
        preset.id = `${preset.id}_${Date.now()}`;
      }

      this.presets.set(preset.id, preset);
      this.saveToStorage();

      return { success: true, preset };
    } catch (e) {
      return {
        success: false,
        preset: null,
        error: e instanceof Error ? e.message : '解析失败',
      };
    }
  }

  duplicatePreset(id: string, newName?: string): RegexPreset | null {
    const original = this.presets.get(id);
    if (!original) return null;

    const duplicate: RegexPreset = {
      ...JSON.parse(JSON.stringify(original)),
      id: `duplicated_${Date.now()}`,
      name: newName || `${original.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.presets.set(duplicate.id, duplicate);
    this.saveToStorage();

    return duplicate;
  }
}

export const regexRuleManager = new RegexRuleManager();
