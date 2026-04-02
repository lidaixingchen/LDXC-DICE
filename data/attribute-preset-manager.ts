/**
 * 属性预设管理器
 *
 * 管理属性生成预设，包括内置预设（COC7、DND5e）和用户自定义预设
 */

import type { LevelPresetConfig } from './attribute-presets';
import { AIDM_ATTRIBUTE_PRESET } from './attribute-presets';

const STORAGE_KEY_PRESETS = 'acu_attribute_presets_v1';
const STORAGE_KEY_ACTIVE_PRESET = 'acu_active_attribute_preset_id';
const PRESET_FORMAT_VERSION = '1.7.0';

export interface AttributePresetConfig {
  name: string;
  formula: string;
  range: [number, number];
  modifier?: string;
}

export interface StoredAttributePreset {
  format: string;
  version: string;
  id: string;
  name: string;
  builtin: boolean;
  description: string;
  baseAttributes: AttributePresetConfig[];
  specialAttributes: AttributePresetConfig[];
  levelPresets?: Record<string, LevelPresetConfig>;
  createdAt?: string;
}

export const BUILTIN_ATTRIBUTE_PRESETS: StoredAttributePreset[] = [
  {
    format: 'acu_attr_preset_v1',
    version: PRESET_FORMAT_VERSION,
    id: 'coc7',
    name: '简化COC规则',
    builtin: true,
    description: '基于克苏鲁的呼唤第7版规则的属性预设。包含9条基本属性和18条特殊属性。',
    baseAttributes: [
      { name: '力量', formula: '3d6*5', range: [15, 90], modifier: '1d10-5' },
      { name: '体质', formula: '3d6*5', range: [15, 90], modifier: '1d10-5' },
      { name: '体型', formula: '2d6*5+30', range: [40, 90], modifier: '1d10-5' },
      { name: '敏捷', formula: '3d6*5', range: [15, 90], modifier: '1d10-5' },
      { name: '外貌', formula: '3d6*5', range: [15, 90], modifier: '1d10-5' },
      { name: '意志', formula: '3d6*5', range: [15, 90], modifier: '1d10-5' },
      { name: '幸运', formula: '3d6*5', range: [15, 90], modifier: '1d10-5' },
      { name: '智力', formula: '2d6*5+30', range: [40, 90], modifier: '1d10-5' },
      { name: '教育', formula: '2d6*5+30', range: [40, 90], modifier: '1d10-5' },
    ],
    specialAttributes: [
      { name: '侦查', formula: '10+5d20', range: [15, 95] },
      { name: '聆听', formula: '10+5d20', range: [15, 95] },
      { name: '心理学', formula: '10+5d20', range: [15, 95] },
      { name: '说服', formula: '5+4d20', range: [9, 85] },
      { name: '话术', formula: '5+4d20', range: [9, 85] },
      { name: '潜行', formula: '5+4d20', range: [9, 85] },
      { name: '格斗', formula: '5+4d20', range: [9, 85] },
      { name: '射击', formula: '5+4d20', range: [9, 85] },
      { name: '信用评级', formula: '5+4d20', range: [9, 85] },
      { name: '魅惑', formula: '5+3d20', range: [8, 65] },
      { name: '恐吓', formula: '5+3d20', range: [8, 65] },
      { name: '图书馆使用', formula: '5+3d20', range: [8, 65] },
      { name: '急救', formula: '5+3d20', range: [8, 65] },
      { name: '驾驶', formula: '5+3d20', range: [8, 65] },
      { name: '神秘学', formula: '1+2d20', range: [3, 41] },
      { name: '闪避', formula: '敏捷/2', range: [1, 99] },
      { name: 'SAN值', formula: '意志', range: [1, 99] },
      { name: '克苏鲁神话', formula: '1d5', range: [1, 5] },
    ],
  },
  {
    format: 'acu_attr_preset_v1',
    version: PRESET_FORMAT_VERSION,
    id: 'dnd5e',
    name: '简化DND规则',
    builtin: true,
    description:
      '基于龙与地下城第5版规则的属性预设。包含6条基本属性和19条技能/派生属性。技能使用长尾分布：多数人为0或负值，少数专家可达+10以上。',
    baseAttributes: [
      { name: '力量', formula: '4d6dl1', range: [3, 18], modifier: '1d4-2' },
      { name: '敏捷', formula: '4d6dl1', range: [3, 18], modifier: '1d4-2' },
      { name: '体质', formula: '4d6dl1', range: [3, 18], modifier: '1d4-2' },
      { name: '智力', formula: '4d6dl1', range: [3, 18], modifier: '1d4-2' },
      { name: '感知', formula: '4d6dl1', range: [3, 18], modifier: '1d4-2' },
      { name: '魅力', formula: '4d6dl1', range: [3, 18], modifier: '1d4-2' },
    ],
    specialAttributes: [
      { name: '运动', formula: '4d8kl1-3', range: [-2, 5] },
      { name: '杂技', formula: '4d8kl1-3', range: [-2, 5] },
      { name: '巧手', formula: '4d8kl1-3', range: [-2, 5] },
      { name: '隐匿', formula: '5d10kl1-4', range: [-3, 6] },
      { name: '奥秘', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '历史', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '调查', formula: '4d8kl1-3', range: [-2, 5] },
      { name: '自然', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '宗教', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '驯兽', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '洞悉', formula: '5d10kl1-4', range: [-3, 6] },
      { name: '医药', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '察觉', formula: '5d10kl1-4', range: [-3, 6] },
      { name: '求生', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '欺瞒', formula: '4d8kl1-3', range: [-2, 5] },
      { name: '威吓', formula: '4d8kl1-3', range: [-2, 5] },
      { name: '表演', formula: '3d6kl1-2', range: [-1, 4] },
      { name: '游说', formula: '4d8kl1-3', range: [-2, 5] },
      { name: '先攻', formula: 'floor((敏捷-10)/2)', range: [-4, 4] },
    ],
  },
  {
    format: 'acu_attr_preset_v1',
    version: PRESET_FORMAT_VERSION,
    id: 'aidm_npc',
    name: 'AIDM-NPC属性生成器',
    builtin: true,
    description: '根据世界等级生成对应等级的NPC属性。选择等级后自动调整属性范围和总属性点。',
    baseAttributes: AIDM_ATTRIBUTE_PRESET.baseAttributes.map(attr => ({
      name: attr.name,
      formula: attr.formula,
      range: attr.range,
    })),
    specialAttributes: AIDM_ATTRIBUTE_PRESET.specialAttributes.map(name => ({
      name,
      formula: '0',
      range: [0, 9999] as [number, number],
    })),
    levelPresets: AIDM_ATTRIBUTE_PRESET.levelPresets,
  },
];

function compareVersion(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

export class AttributePresetManager {
  private cache: StoredAttributePreset[] | null = null;

  private save(presets: StoredAttributePreset[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
      this.cache = null;
    } catch (e) {
      console.warn('[AttributePresetManager] 保存预设失败:', e);
    }
  }

  private load(): StoredAttributePreset[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRESETS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[AttributePresetManager] 加载预设失败:', e);
    }
    return [];
  }

  getAllPresets(): StoredAttributePreset[] {
    const stored = this.load();
    let needsSave = false;

    stored.forEach(preset => {
      const presetVersion = preset.version || '0.0.0';
      if (compareVersion(presetVersion, PRESET_FORMAT_VERSION) < 0) {
        console.log(
          `[AttributePresetManager] 检测到预设 "${preset.name}" 版本较旧 (${presetVersion})，自动更新到 ${PRESET_FORMAT_VERSION}`,
        );
        preset.version = PRESET_FORMAT_VERSION;
        needsSave = true;
      }
    });

    if (needsSave) {
      this.save(stored);
    }

    if (!needsSave && this.cache) {
      return this.cache;
    }

    this.cache = [...BUILTIN_ATTRIBUTE_PRESETS, ...stored];
    return this.cache;
  }

  getActivePreset(): StoredAttributePreset | null {
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET);
    if (!activeId) return null;
    return this.getAllPresets().find(p => p.id === activeId) || null;
  }

  setActivePreset(id: string | null): boolean {
    try {
      const finalId = id === '' || id === undefined ? null : id;
      if (finalId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, finalId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_PRESET);
      }
      this.cache = null;
      console.log('[AttributePresetManager] 切换预设:', finalId);
      return true;
    } catch (err) {
      console.error('[AttributePresetManager] 设置预设失败:', err);
      return false;
    }
  }

  createPreset(preset: Partial<StoredAttributePreset>): StoredAttributePreset {
    const stored = this.load();
    const newPreset: StoredAttributePreset = {
      format: 'acu_attr_preset_v1',
      version: PRESET_FORMAT_VERSION,
      id: preset.id || 'custom_' + Date.now(),
      name: preset.name || '新预设',
      builtin: false,
      description: preset.description || '',
      baseAttributes: preset.baseAttributes || [],
      specialAttributes: preset.specialAttributes || [],
      levelPresets: preset.levelPresets,
      createdAt: new Date().toISOString(),
    };

    stored.push(newPreset);
    this.save(stored);
    console.log('[AttributePresetManager] 创建预设:', newPreset.name);
    return newPreset;
  }

  updatePreset(id: string, updates: Partial<StoredAttributePreset>): boolean {
    const stored = this.load();
    const index = stored.findIndex(p => p.id === id);
    if (index < 0) return false;

    stored[index] = { ...stored[index], ...updates, version: PRESET_FORMAT_VERSION };
    this.save(stored);
    console.log('[AttributePresetManager] 更新预设:', id);
    return true;
  }

  deletePreset(id: string): boolean {
    const stored = this.load();
    const filtered = stored.filter(p => p.id !== id);
    if (filtered.length === stored.length) return false;

    this.save(filtered);

    if (localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET) === id) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_PRESET);
    }

    console.log('[AttributePresetManager] 删除预设:', id);
    return true;
  }

  duplicatePreset(id: string): StoredAttributePreset | null {
    const source = this.getAllPresets().find(p => p.id === id);
    if (!source) return null;

    return this.createPreset({
      ...source,
      id: 'copy_' + Date.now(),
      name: source.name + ' (副本)',
      builtin: false,
    });
  }

  exportPreset(id: string): string | null {
    const preset = this.getAllPresets().find(p => p.id === id);
    if (!preset) return null;

    const { builtin, ...rest } = preset;
    const exported = {
      ...rest,
      format: 'acu_attr_preset_v1',
      version: PRESET_FORMAT_VERSION,
    };

    return JSON.stringify(exported, null, 2);
  }

  importPreset(jsonStr: string, autoUpdate = false): StoredAttributePreset | null {
    try {
      const data = JSON.parse(jsonStr);

      if (data.format !== 'acu_attr_preset_v1') {
        throw new Error('不支持的预设格式');
      }

      if (!data.name || !data.baseAttributes || !Array.isArray(data.baseAttributes)) {
        throw new Error('预设数据不完整');
      }

      const importedVersion = data.version || '0.0.0';
      const needsUpdate = compareVersion(importedVersion, PRESET_FORMAT_VERSION) < 0;

      const imported = this.createPreset({
        ...data,
        id: 'imported_' + Date.now(),
        version: autoUpdate && needsUpdate ? PRESET_FORMAT_VERSION : importedVersion,
      });

      if (imported && needsUpdate && !autoUpdate) {
        console.warn(
          `[AttributePresetManager] 导入的预设 "${imported.name}" 版本较旧 (${importedVersion})，建议更新到 ${PRESET_FORMAT_VERSION}`,
        );
      }

      return imported;
    } catch (e) {
      console.error('[AttributePresetManager] 导入失败:', e);
      return null;
    }
  }

  getPresetById(id: string): StoredAttributePreset | null {
    return this.getAllPresets().find(p => p.id === id) || null;
  }

  getBuiltinPresets(): StoredAttributePreset[] {
    return this.getAllPresets().filter(p => p.builtin);
  }

  getCustomPresets(): StoredAttributePreset[] {
    return this.getAllPresets().filter(p => !p.builtin);
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const attributePresetManager = new AttributePresetManager();
