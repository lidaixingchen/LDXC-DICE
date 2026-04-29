/**
 * 高级骰子预设加载器
 *
 * 处理预设的导入、版本迁移和验证
 */

import type { AdvancedDicePreset, OutcomeLevel } from '../core/types';
import { PRESET_FORMAT_VERSION } from '../core/types';
import { BUILTIN_PRESETS } from './builtin-presets';
import { compareVersion } from '../utils/helpers';

type PresetVersion = '1.0.0' | '1.1.0' | '1.2.0' | '1.3.0' | '1.4.0' | '1.5.0' | '1.6.0' | '1.7.0' | '2.0.0';

function migrateOutcome(outcome: Record<string, unknown>): OutcomeLevel {
  const migrated: OutcomeLevel = {
    id: String(outcome.id || 'outcome_' + Date.now()),
    name: String(outcome.name || '未知结果'),
    condition: String(outcome.condition || 'true'),
  };

  if (outcome.priority !== undefined) {
    migrated.priority = Number(outcome.priority);
  }
  if (outcome.rank !== undefined) {
    migrated.rank = Number(outcome.rank);
  }
  if (outcome.isSuccess !== undefined) {
    migrated.isSuccess = Boolean(outcome.isSuccess);
  }
  if (outcome.color !== undefined) {
    migrated.color = String(outcome.color);
  }
  if (outcome.icon !== undefined) {
    migrated.icon = String(outcome.icon);
  }

  if (outcome.outputText !== undefined && outcome.outputTemplate === undefined) {
    migrated.outputTemplate = String(outcome.outputText);
  } else if (outcome.outputTemplate !== undefined) {
    migrated.outputTemplate = String(outcome.outputTemplate);
  }

  return migrated;
}

function migrateFromV1x(preset: Record<string, unknown>): AdvancedDicePreset {
  const migrated: AdvancedDicePreset = {
    kind: 'advanced',
    id: String(preset.id || 'imported_' + Date.now()),
    name: String(preset.name || '导入的预设'),
    version: PRESET_FORMAT_VERSION,
    diceExpression: String(preset.diceExpression || '1d20'),
    attribute: {
      ...(preset.attribute as Record<string, unknown> || {}),
      defaultValue: (preset.attribute as Record<string, unknown>)?.defaultValue ?? 10,
    } as AdvancedDicePreset['attribute'],
    dc: {
      ...(preset.dc as Record<string, unknown> || {}),
      defaultValue: (preset.dc as Record<string, unknown>)?.defaultValue ?? 10,
    } as AdvancedDicePreset['dc'],
    outcomes: [],
  };

  if (preset.description) {
    migrated.description = String(preset.description);
  }
  if (preset.builtin !== undefined) {
    migrated.builtin = Boolean(preset.builtin);
  }
  if (preset.mod) {
    migrated.mod = preset.mod as AdvancedDicePreset['mod'];
  }
  if (preset.skillMod) {
    migrated.skillMod = preset.skillMod as AdvancedDicePreset['skillMod'];
  }
  if (preset.attrTargetMapping) {
    migrated.attrTargetMapping = preset.attrTargetMapping as Record<string, string[]>;
  }
  if (preset.customFields) {
    migrated.customFields = preset.customFields as AdvancedDicePreset['customFields'];
  }
  if (preset.derivedVars) {
    migrated.derivedVars = preset.derivedVars as AdvancedDicePreset['derivedVars'];
  }
  if (preset.dicePatches) {
    migrated.dicePatches = preset.dicePatches as AdvancedDicePreset['dicePatches'];
  }
  if (preset.outcomes && Array.isArray(preset.outcomes)) {
    migrated.outcomes = preset.outcomes.map(migrateOutcome);
  }
  if (preset.contestRule) {
    migrated.contestRule = preset.contestRule as AdvancedDicePreset['contestRule'];
  }
  if (preset.outputTemplate) {
    migrated.outputTemplate = String(preset.outputTemplate);
  }
  if (preset.contestOutputTemplate) {
    migrated.contestOutputTemplate = String(preset.contestOutputTemplate);
  }
  if (preset.outcomePolicy) {
    migrated.outcomePolicy = preset.outcomePolicy as AdvancedDicePreset['outcomePolicy'];
  }
  if (preset.effectsConfig) {
    migrated.effectsConfig = preset.effectsConfig as AdvancedDicePreset['effectsConfig'];
  }
  if (preset.effectConfirmUi) {
    migrated.effectConfirmUi = preset.effectConfirmUi as AdvancedDicePreset['effectConfirmUi'];
  }
  if (preset.resourceBurners) {
    migrated.resourceBurners = preset.resourceBurners as AdvancedDicePreset['resourceBurners'];
  }
  if (preset.quickActions) {
    migrated.quickActions = preset.quickActions as AdvancedDicePreset['quickActions'];
  }
  if (preset.currentAttrAutoUpdate) {
    migrated.currentAttrAutoUpdate = preset.currentAttrAutoUpdate as AdvancedDicePreset['currentAttrAutoUpdate'];
  }
  if (preset.secondaryEffects) {
    migrated.secondaryEffects = preset.secondaryEffects as AdvancedDicePreset['secondaryEffects'];
  }
  if (preset.secondaryMaxDepth !== undefined) {
    migrated.secondaryMaxDepth = Number(preset.secondaryMaxDepth);
  }
  if (preset.secondaryTriggerMode) {
    migrated.secondaryTriggerMode = preset.secondaryTriggerMode as 'first' | 'all';
  }
  if (preset.pushedRoll) {
    migrated.pushedRoll = preset.pushedRoll as AdvancedDicePreset['pushedRoll'];
  }
  if (preset.errorHandling) {
    migrated.errorHandling = preset.errorHandling as AdvancedDicePreset['errorHandling'];
  }
  if (preset.visible !== undefined) {
    migrated.visible = Boolean(preset.visible);
  }
  if (preset.order !== undefined) {
    migrated.order = Number(preset.order);
  }

  return migrated;
}

export function migratePreset(preset: Record<string, unknown>): AdvancedDicePreset {
  const version = String(preset.version || '1.0.0');
  const cmp = compareVersion(version, PRESET_FORMAT_VERSION);

  if (cmp >= 0) {
    return preset as unknown as AdvancedDicePreset;
  }

  console.log(`[PresetLoader] 迁移预设 "${preset.name}" 从版本 ${version} 到 ${PRESET_FORMAT_VERSION}`);

  return migrateFromV1x(preset);
}

export interface ImportResult {
  success: boolean;
  preset: AdvancedDicePreset | null;
  error?: string;
  wasMigrated?: boolean;
  originalVersion?: string;
}

export function loadPresetFromJson(json: string): ImportResult {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;

    if (data.kind !== 'advanced') {
      return {
        success: false,
        preset: null,
        error: '不支持的预设格式：缺少 kind="advanced"',
      };
    }

    if (!data.name || !data.diceExpression) {
      return {
        success: false,
        preset: null,
        error: '预设数据不完整：缺少名称或骰子表达式',
      };
    }

    if (!Array.isArray(data.outcomes) || data.outcomes.length === 0) {
      return {
        success: false,
        preset: null,
        error: '预设数据不完整：缺少 outcomes 判定条件',
      };
    }

    const originalVersion = String(data.version || '1.0.0');
    const needsMigration = compareVersion(originalVersion, PRESET_FORMAT_VERSION) < 0;

    const preset = migratePreset(data);

    if (preset.id) {
      const existing = BUILTIN_PRESETS.find(p => p.id === preset.id);
      if (existing) {
        preset.id = `${preset.id}_${Date.now()}`;
      }
    } else {
      preset.id = `imported_${Date.now()}`;
    }

    preset.builtin = false;
    preset.version = PRESET_FORMAT_VERSION;

    return {
      success: true,
      preset,
      wasMigrated: needsMigration,
      originalVersion,
    };
  } catch (e) {
    return {
      success: false,
      preset: null,
      error: `解析失败: ${e instanceof Error ? e.message : '未知错误'}`,
    };
  }
}

export async function loadPresetsFromFiles(files: FileList): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.name.endsWith('.json')) {
      results.push({
        success: false,
        preset: null,
        error: `文件 ${file.name} 不是 JSON 格式`,
      });
      continue;
    }

    try {
      const text = await file.text();
      const result = loadPresetFromJson(text);
      results.push(result);
    } catch (e) {
      results.push({
        success: false,
        preset: null,
        error: `读取文件 ${file.name} 失败: ${e instanceof Error ? e.message : '未知错误'}`,
      });
    }
  }

  return results;
}

export function validatePreset(preset: AdvancedDicePreset): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!preset.id) {
    errors.push('预设缺少 ID');
  }
  if (!preset.name) {
    errors.push('预设缺少名称');
  }
  if (!preset.diceExpression) {
    errors.push('预设缺少骰子表达式');
  }
  if (!preset.outcomes || preset.outcomes.length === 0) {
    errors.push('预设缺少判定条件');
  }

  if (preset.outcomes) {
    for (let i = 0; i < preset.outcomes.length; i++) {
      const outcome = preset.outcomes[i];
      if (!outcome.id) {
        errors.push(`判定条件 ${i + 1} 缺少 ID`);
      }
      if (!outcome.condition) {
        errors.push(`判定条件 ${i + 1} 缺少条件表达式`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function exportPresetToJson(preset: AdvancedDicePreset): string {
  const { builtin, ...rest } = preset;
  const exported = {
    ...rest,
    kind: 'advanced' as const,
    version: PRESET_FORMAT_VERSION,
  };
  return JSON.stringify(exported, null, 2);
}

export { BUILTIN_PRESETS };
