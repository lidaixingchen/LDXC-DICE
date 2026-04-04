import { regexEngine, type RegexRule } from './regex-engine';

const STORAGE_KEY_REGEX_PRESETS = 'acu_regex_presets';
const STORAGE_KEY_CURRENT_PRESET = 'acu_current_regex_preset';
const STORAGE_KEY_REGEX_ENABLED = 'acu_regex_enabled_v1';

export interface StoredRegexRule {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  replacement: string;
  flags?: string;
  enabled: boolean;
  priority: number;
  scope?: { type: string };
  executeMode?: 'auto' | 'manual';
}

export interface RegexPreset {
  id: string;
  name: string;
  rules: StoredRegexRule[];
}

function getRulesKey(presetId: string): string {
  return `acu_regex_rules_${presetId}`;
}

export function loadRulesFromStorage(): StoredRegexRule[] {
  const currentPresetId = localStorage.getItem(STORAGE_KEY_CURRENT_PRESET);
  if (!currentPresetId) return [];

  const rulesJson = localStorage.getItem(getRulesKey(currentPresetId));
  if (!rulesJson) return [];

  try {
    return JSON.parse(rulesJson);
  } catch {
    return [];
  }
}

export function convertToEngineRule(stored: StoredRegexRule): RegexRule {
  return {
    id: stored.id,
    name: stored.name,
    description: stored.description || '',
    pattern: stored.pattern,
    replacement: stored.replacement,
    flags: stored.flags || 'g',
    enabled: stored.enabled,
    priority: stored.priority || 50,
    category: 'custom',
  };
}

export function syncRulesToEngine(): { loaded: number; skipped: number } {
  const storedRules = loadRulesFromStorage();
  let loaded = 0;
  let skipped = 0;

  for (const stored of storedRules) {
    try {
      const engineRule = convertToEngineRule(stored);
      regexEngine.addRule(engineRule);
      loaded++;
    } catch {
      skipped++;
    }
  }

  console.log(`[RegexSync] 已同步 ${loaded} 条规则到引擎，跳过 ${skipped} 条`);
  return { loaded, skipped };
}

export function saveRuleToStorage(rule: StoredRegexRule, presetId?: string): void {
  const targetPresetId = presetId || localStorage.getItem(STORAGE_KEY_CURRENT_PRESET);
  if (!targetPresetId) return;

  const rulesJson = localStorage.getItem(getRulesKey(targetPresetId));
  const rules: StoredRegexRule[] = rulesJson ? JSON.parse(rulesJson) : [];

  const existingIndex = rules.findIndex(r => r.id === rule.id);
  if (existingIndex >= 0) {
    rules[existingIndex] = rule;
  } else {
    rules.push(rule);
  }

  localStorage.setItem(getRulesKey(targetPresetId), JSON.stringify(rules));
  syncRulesToEngine();
}

export function deleteRuleFromStorage(ruleId: string, presetId?: string): void {
  const targetPresetId = presetId || localStorage.getItem(STORAGE_KEY_CURRENT_PRESET);
  if (!targetPresetId) return;

  const rulesJson = localStorage.getItem(getRulesKey(targetPresetId));
  if (!rulesJson) return;

  const rules: StoredRegexRule[] = JSON.parse(rulesJson);
  const filtered = rules.filter(r => r.id !== ruleId);
  localStorage.setItem(getRulesKey(targetPresetId), JSON.stringify(filtered));

  regexEngine.removeRule(ruleId);
}

export function getCurrentPresetId(): string | null {
  return localStorage.getItem(STORAGE_KEY_CURRENT_PRESET);
}

export function setCurrentPreset(presetId: string): void {
  localStorage.setItem(STORAGE_KEY_CURRENT_PRESET, presetId);
  syncRulesToEngine();
}

export function getPresets(): RegexPreset[] {
  const presetsJson = localStorage.getItem(STORAGE_KEY_REGEX_PRESETS);
  if (!presetsJson) return [];

  try {
    return JSON.parse(presetsJson);
  } catch {
    return [];
  }
}

export function createPreset(name: string): RegexPreset {
  const presets = getPresets();
  const newPreset: RegexPreset = {
    id: `regex_${Date.now()}`,
    name,
    rules: [],
  };
  presets.push(newPreset);
  localStorage.setItem(STORAGE_KEY_REGEX_PRESETS, JSON.stringify(presets));
  return newPreset;
}

export function deletePreset(presetId: string): void {
  const presets = getPresets();
  const filtered = presets.filter(p => p.id !== presetId);
  localStorage.setItem(STORAGE_KEY_REGEX_PRESETS, JSON.stringify(filtered));
  localStorage.removeItem(getRulesKey(presetId));

  if (getCurrentPresetId() === presetId) {
    localStorage.removeItem(STORAGE_KEY_CURRENT_PRESET);
  }
}

export function isRegexEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY_REGEX_ENABLED) !== 'false';
}

export function setRegexEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_REGEX_ENABLED, String(enabled));
}
