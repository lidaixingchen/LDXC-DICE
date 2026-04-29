import type { AdvancedDicePreset, OutcomeLevel } from '../core/types';
import { PRESET_FORMAT_VERSION } from '../core/types';
import { validatePreset, type ValidationResult } from '../core/validation';
import { loadPresetFromJson, type ImportResult } from '../presets/advanced-preset-loader';

export type { ImportResult };

export class PresetManager {
  private presets: Map<string, AdvancedDicePreset> = new Map();
  private currentPresetId: string | null = null;
  private validationEnabled: boolean = true;

  constructor() {
    this.loadFromStorage();
  }

  setValidationEnabled(enabled: boolean): void {
    this.validationEnabled = enabled;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('dice_presets');
      if (stored) {
        const data = JSON.parse(stored);
        for (const preset of data) {
          if (preset.id && preset.kind === 'advanced') {
            if (this.validationEnabled) {
              const result = validatePreset(preset);
              if (!result.valid) {
                console.warn(`[PresetManager] 预设 "${preset.name}" 验证失败:`, result.errors);
              }
            }
            this.presets.set(preset.id, preset);
          }
        }
      }
    } catch (e) {
      console.warn('[PresetManager] 加载预设失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.presets.values());
      localStorage.setItem('dice_presets', JSON.stringify(data));
    } catch (e) {
      console.warn('[PresetManager] 保存预设失败:', e);
    }
  }

  validatePreset(preset: AdvancedDicePreset): ValidationResult {
    return validatePreset(preset);
  }

  registerPreset(preset: AdvancedDicePreset): ValidationResult {
    const result = validatePreset(preset);

    if (!preset.id) {
      console.error('[PresetManager] 预设缺少 ID');
      result.errors.push({
        path: 'preset',
        message: '预设ID不能为空',
        severity: 'error',
        code: 'MISSING_ID',
      });
      result.valid = false;
      return result;
    }

    if (this.validationEnabled && !result.valid) {
      console.warn(`[PresetManager] 预设 "${preset.name}" 验证失败:`, result.errors);
    }

    preset.version = preset.version || PRESET_FORMAT_VERSION;
    this.presets.set(preset.id, preset);
    this.saveToStorage();
    console.log(`[PresetManager] 注册预设: ${preset.name} (${preset.id})`);

    return result;
  }

  unregisterPreset(id: string): boolean {
    const result = this.presets.delete(id);
    if (result) {
      this.saveToStorage();
      console.log(`[PresetManager] 删除预设: ${id}`);
    }
    return result;
  }

  getPreset(id: string): AdvancedDicePreset | null {
    return this.presets.get(id) || null;
  }

  getAllPresets(): AdvancedDicePreset[] {
    return Array.from(this.presets.values());
  }

  getBuiltinPresets(): AdvancedDicePreset[] {
    return Array.from(this.presets.values()).filter(p => p.builtin);
  }

  getCustomPresets(): AdvancedDicePreset[] {
    return Array.from(this.presets.values()).filter(p => !p.builtin);
  }

  setCurrentPreset(id: string): boolean {
    if (!this.presets.has(id)) {
      return false;
    }
    this.currentPresetId = id;
    console.log(`[PresetManager] 切换预设: ${id}`);
    return true;
  }

  getCurrentPreset(): AdvancedDicePreset | null {
    if (!this.currentPresetId) return null;
    return this.presets.get(this.currentPresetId) || null;
  }

  duplicatePreset(id: string, newName: string): AdvancedDicePreset | null {
    const original = this.presets.get(id);
    if (!original) return null;

    const newId = `${id}_copy_${Date.now()}`;
    const copy: AdvancedDicePreset = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: newName,
      builtin: false,
    };

    this.presets.set(newId, copy);
    this.saveToStorage();
    console.log(`[PresetManager] 复制预设: ${original.name} -> ${newName}`);
    return copy;
  }

  updatePreset(id: string, updates: Partial<AdvancedDicePreset>): ValidationResult {
    const preset = this.presets.get(id);
    const emptyResult: ValidationResult = { valid: false, errors: [], warnings: [], infos: [] };

    if (!preset) {
      emptyResult.errors.push({
        path: 'preset',
        message: `预设 "${id}" 不存在`,
        severity: 'error',
        code: 'NOT_FOUND',
      });
      return emptyResult;
    }

    const updated = { ...preset, ...updates, id, version: PRESET_FORMAT_VERSION };
    const result = validatePreset(updated);

    if (this.validationEnabled && !result.valid) {
      console.warn(`[PresetManager] 更新预设 "${updated.name}" 验证失败:`, result.errors);
    }

    this.presets.set(id, updated);
    this.saveToStorage();

    return result;
  }

  importPreset(json: string): { preset: AdvancedDicePreset | null; validation: ValidationResult; wasMigrated?: boolean } {
    const emptyResult: ValidationResult = { valid: false, errors: [], warnings: [], infos: [] };

    const loadResult = loadPresetFromJson(json);
    if (!loadResult.success || !loadResult.preset) {
      emptyResult.errors.push({
        path: 'preset',
        message: loadResult.error || '导入失败',
        severity: 'error',
        code: 'IMPORT_FAILED',
      });
      return { preset: null, validation: emptyResult };
    }

    const preset = loadResult.preset;

    if (this.presets.has(preset.id)) {
      preset.id = `${preset.id}_${Date.now()}`;
    }

    const result = validatePreset(preset);
    this.presets.set(preset.id, preset);
    this.saveToStorage();

    if (loadResult.wasMigrated) {
      console.log(`[PresetManager] 导入并迁移预设: ${preset.name} (从 v${loadResult.originalVersion})`);
    } else {
      console.log(`[PresetManager] 导入预设: ${preset.name}`);
    }

    return { preset, validation: result, wasMigrated: loadResult.wasMigrated };
  }

  async importPresetsFromFiles(files: FileList): Promise<ImportResult[]> {
    const { loadPresetsFromFiles } = await import('../presets/advanced-preset-loader');
    const results = await loadPresetsFromFiles(files);

    for (const result of results) {
      if (result.success && result.preset) {
        if (this.presets.has(result.preset.id)) {
          result.preset.id = `${result.preset.id}_${Date.now()}`;
        }
        this.presets.set(result.preset.id, result.preset);
      }
    }

    this.saveToStorage();
    return results;
  }

  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) return null;
    return JSON.stringify(preset, null, 2);
  }

  private static readonly SAFE_EXPR_REGEX = /^[0-9a-zA-Z_+\-*/%().><=!&|?:,\s]+$/;
  private static readonly DANGEROUS_PATTERNS = /\b(alert|eval|Function|fetch|XMLHttpRequest|import|require|process|global|window|document|console|setTimeout|setInterval|__proto__|constructor|prototype)\b/i;
  private static readonly MAX_EXPR_LENGTH = 500;

  matchOutcome(preset: AdvancedDicePreset, roll: number, context: Record<string, number>): OutcomeLevel | null {
    const sortedOutcomes = [...preset.outcomes].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const outcome of sortedOutcomes) {
      const condition = outcome.condition;
      if (!condition) continue;

      let expr = condition;
      for (const [key, value] of Object.entries(context)) {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\$${escapedKey}\\b`, 'g');
        expr = expr.replace(regex, String(value));
      }

      try {
        if (
          expr.length > PresetManager.MAX_EXPR_LENGTH ||
          !PresetManager.SAFE_EXPR_REGEX.test(expr) ||
          PresetManager.DANGEROUS_PATTERNS.test(expr)
        ) {
          continue;
        }
        const fn = new Function(`return ${expr}`);
        if (fn()) {
          return outcome;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  searchPresets(query: string): AdvancedDicePreset[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.presets.values()).filter(
      p => p.name.toLowerCase().includes(lowerQuery) ||
           p.description?.toLowerCase().includes(lowerQuery),
    );
  }

  validateAllPresets(): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    for (const [id, preset] of this.presets) {
      results.set(id, validatePreset(preset));
    }
    return results;
  }

  getInvalidPresets(): Array<{ id: string; name: string; errors: ValidationResult['errors'] }> {
    const invalid: Array<{ id: string; name: string; errors: ValidationResult['errors'] }> = [];
    for (const [id, preset] of this.presets) {
      const result = validatePreset(preset);
      if (!result.valid) {
        invalid.push({ id, name: preset.name, errors: result.errors });
      }
    }
    return invalid;
  }
}

export const presetManager = new PresetManager();
