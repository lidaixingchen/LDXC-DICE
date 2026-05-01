import type { MapInteraction, MapInteractionAction, MapInteractionTrigger } from '../map/types';
import { storageSyncBus } from '../utils/storage-sync';
import { interactionEngine } from '../map/interaction-engine';

const INTERACTION_PRESETS_KEY = 'acu_interaction_presets';

export interface InteractionPreset {
  id: string;
  name: string;
  description?: string;
  rules: MapInteraction[];
  createdAt: number;
  updatedAt: number;
}

export type InteractionTriggerType = 'token' | 'region' | 'grid' | 'custom';
export type InteractionActionType = 'dice_roll' | 'message' | 'effect' | 'move_token' | 'change_layer' | 'custom';

export interface InteractionTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: InteractionTriggerType;
  actionType: InteractionActionType;
  triggerTemplate: Partial<MapInteractionTrigger>;
  actionTemplate: Partial<MapInteractionAction>;
}

export const INTERACTION_TEMPLATES: InteractionTemplate[] = [
  {
    id: 'token_click_roll',
    name: '令牌点击掷骰',
    description: '点击令牌时触发骰子检定',
    triggerType: 'token',
    actionType: 'dice_roll',
    triggerTemplate: {
      type: 'token',
    },
    actionTemplate: {
      type: 'dice_roll',
      data: {
        presetId: 'aidm_standard_check',
      },
    },
  },
  {
    id: 'region_enter_message',
    name: '区域进入提示',
    description: '进入区域时显示消息',
    triggerType: 'region',
    actionType: 'message',
    triggerTemplate: {
      type: 'region',
    },
    actionTemplate: {
      type: 'message',
      data: {
        text: '进入了新区域',
        type: 'info',
      },
    },
  },
  {
    id: 'grid_cell_effect',
    name: '格子效果',
    description: '进入特定格子时触发效果',
    triggerType: 'grid',
    actionType: 'effect',
    triggerTemplate: {
      type: 'grid',
    },
    actionTemplate: {
      type: 'effect',
      data: {
        effectType: 'damage',
        target: 'current',
        value: 10,
      },
    },
  },
  {
    id: 'custom_condition',
    name: '自定义条件',
    description: '使用自定义条件触发动作',
    triggerType: 'custom',
    actionType: 'custom',
    triggerTemplate: {
      type: 'custom',
      condition: 'context.token.attributes.hp < 10',
    },
    actionTemplate: {
      type: 'message',
      data: {
        text: 'HP过低！',
        type: 'warning',
      },
    },
  },
];

export class InteractionRuleManager {
  private presets: Map<string, InteractionPreset> = new Map();
  private currentPresetId: string | null = null;

  constructor() {
    this.loadFromStorage();
    storageSyncBus.register(INTERACTION_PRESETS_KEY, () => {
      this.loadFromStorage();
    });
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(INTERACTION_PRESETS_KEY);
      if (stored) {
        const presets = JSON.parse(stored) as InteractionPreset[];
        for (const preset of presets) {
          this.presets.set(preset.id, preset);
        }
      }
    } catch (e) {
      console.warn('[InteractionRuleManager] 加载预设失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const presets = Array.from(this.presets.values());
      localStorage.setItem(INTERACTION_PRESETS_KEY, JSON.stringify(presets));
    } catch (e) {
      console.warn('[InteractionRuleManager] 保存预设失败:', e);
    }
  }

  createPreset(name: string, description?: string): InteractionPreset {
    const preset: InteractionPreset = {
      id: `interaction_preset_${Date.now()}`,
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

  updatePreset(id: string, updates: Partial<InteractionPreset>): boolean {
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
      this.saveToStorage();
    }
    return result;
  }

  getPreset(id: string): InteractionPreset | null {
    return this.presets.get(id) || null;
  }

  getAllPresets(): InteractionPreset[] {
    return Array.from(this.presets.values());
  }

  setCurrentPreset(id: string): boolean {
    if (!this.presets.has(id)) return false;
    this.currentPresetId = id;
    return true;
  }

  getCurrentPreset(): InteractionPreset | null {
    if (!this.currentPresetId) return null;
    return this.presets.get(this.currentPresetId) || null;
  }

  addRuleToPreset(presetId: string, rule: Omit<MapInteraction, 'id'>): MapInteraction | null {
    const preset = this.presets.get(presetId);
    if (!preset) return null;

    const newRule = interactionEngine.addRule(rule);
    preset.rules.push(newRule);
    preset.updatedAt = Date.now();
    this.saveToStorage();

    return newRule;
  }

  updateRuleInPreset(presetId: string, ruleId: string, updates: Partial<MapInteraction>): boolean {
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

    return interactionEngine.updateRule(ruleId, updates);
  }

  removeRuleFromPreset(presetId: string, ruleId: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) return false;

    preset.rules = preset.rules.filter(r => r.id !== ruleId);
    preset.updatedAt = Date.now();
    this.saveToStorage();

    return interactionEngine.removeRule(ruleId);
  }

  createRuleFromTemplate(templateId: string, overrides?: {
    trigger?: Partial<MapInteractionTrigger>;
    action?: Partial<MapInteractionAction>;
  }): Omit<MapInteraction, 'id'> | null {
    const template = INTERACTION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;

    const trigger: MapInteractionTrigger = {
      ...template.triggerTemplate,
      ...overrides?.trigger,
    } as MapInteractionTrigger;

    const action: MapInteractionAction = {
      ...template.actionTemplate,
      ...overrides?.action,
    } as MapInteractionAction;

    return {
      type: template.triggerType as any,
      trigger,
      actions: [action],
      enabled: true,
      priority: 50,
    };
  }

  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) return null;
    return JSON.stringify(preset, null, 2);
  }

  importPreset(json: string): { success: boolean; preset: InteractionPreset | null; error?: string } {
    try {
      const data = JSON.parse(json);

      if (!data.name || !Array.isArray(data.rules)) {
        return { success: false, preset: null, error: '无效的预设格式' };
      }

      const preset: InteractionPreset = {
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

  duplicatePreset(id: string, newName?: string): InteractionPreset | null {
    const original = this.presets.get(id);
    if (!original) return null;

    const duplicate: InteractionPreset = {
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

export const interactionRuleManager = new InteractionRuleManager();
