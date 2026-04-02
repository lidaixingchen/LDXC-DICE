import type { AdvancedDicePreset, DiceRollContext } from '@core/types';
import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue';
import { DiceSystem, createDiceSystem } from '../../../index';
import { eventBus } from '../event-bus';
import type {
  CheckOptions,
  CheckResult,
  ContestOptions,
  ContestResult,
  DicePanelState,
  PresetFormData,
} from '../types';

export { useCharacterData, useDropdownSuggestions } from './useCharacterData';
export type { AttributeButton, Character } from './useCharacterData';
export { useDashboard } from './useDashboard';
export { useMvu } from './useMvu';

let diceSystemInstance: DiceSystem | null = null;

export function useDiceSystem(): {
  system: ComputedRef<DiceSystem | null>;
  initialize: () => void;
  performCheck: (options: CheckOptions) => Promise<CheckResult | null>;
  performContest: (options: ContestOptions) => Promise<ContestResult | null>;
  roll: (formula: string) => { total: number; formula: string; breakdown: string };
  evaluatePresetBonus: (presetId: string, attrValue: number) => number;
} {
  const system = computed(() => diceSystemInstance);

  function initialize(): void {
    if (!diceSystemInstance) {
      diceSystemInstance = createDiceSystem({
        logLevel: 'info',
        autoRegisterPresets: true,
      });
    }
  }

  function evaluatePresetBonus(presetId: string, attrValue: number): number {
    if (!diceSystemInstance) initialize();
    const preset = diceSystemInstance!.getPreset(presetId);
    if (!preset || !preset.attribute?.computeModifier) return 0;
    
    return diceSystemInstance!.evaluateFormula(preset.attribute.computeModifier, { attr: attrValue });
  }

  async function performCheck(options: CheckOptions): Promise<CheckResult | null> {
    if (!diceSystemInstance) {
      initialize();
    }

    const preset = options.presetId
      ? diceSystemInstance!.getPreset(options.presetId)
      : diceSystemInstance!.getCurrentPreset();

    if (!preset) {
      console.error('[useDiceSystem] No preset available');
      return null;
    }

    const context: DiceRollContext = {
      characterName: '',
      attributeName: options.attribute ?? '',
      attributeValue: options.attributeValue ?? 10,
      dc: options.dc ?? 50,
      modifier: options.modifier ?? 0,
      customFields: options.customFields,
    };

    const result = await diceSystemInstance!.performCheck(preset.id!, context);
    if (!result) return null;

    const checkResult: CheckResult = {
      success: result.success,
      roll: result.roll.total,
      total: result.total,
      target: context.dc,
      margin: result.total - context.dc,
      criticalSuccess: result.matchedOutcome.id.includes('crit_success'),
      criticalFailure: result.matchedOutcome.id.includes('crit_failure'),
      outcome: result.matchedOutcome.name,
      message: result.output,
      diceType: preset.diceExpression,
      presetId: preset.id,
      attributeName: options.attribute,
      effects: result.effects,
    };

    eventBus.emit('check', checkResult);
    return checkResult;
  }

  function evaluateContestFormula(formula: string, context: Record<string, number>): number {
    if (!diceSystemInstance) {
      initialize();
    }

    if (!formula || formula.trim() === '') {
      return 0;
    }

    let expr = formula;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\$${key}\\b`, 'g');
      expr = expr.replace(regex, String(value));
    }

    expr = expr.replace(/\{([^}]+)\}/g, (_, name) => {
      const val = context[name] ?? 0;
      return String(val);
    });

    const normalized = expr
      .replace(/\bmax\s*\(/g, 'Math.max(')
      .replace(/\bmin\s*\(/g, 'Math.min(')
      .replace(/\bfloor\s*\(/g, 'Math.floor(')
      .replace(/\bceil\s*\(/g, 'Math.ceil(')
      .replace(/\bround\s*\(/g, 'Math.round(')
      .replace(/\babs\s*\(/g, 'Math.abs(')
      .replace(/\bpow\s*\(/g, 'Math.pow(');

    try {
      const fn = new Function('Math', `return (${normalized});`);
      const value = fn(Math);
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    } catch {
      // Fall back to core evaluator.
    }

    return diceSystemInstance!.evaluateFormula(formula, context);
  }

  function fillTemplate(template: string, context: Record<string, number | string>): string {
    let output = template;

    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\$${key}\\b`, 'g');
      output = output.replace(regex, String(value));
    }

    return output;
  }

  async function performContest(options: ContestOptions): Promise<ContestResult | null> {
    if (!diceSystemInstance) {
      initialize();
    }

    const preset = options.presetId
      ? diceSystemInstance!.getPreset(options.presetId)
      : diceSystemInstance!.getCurrentPreset();

    if (!preset) {
      console.error('[useDiceSystem] No preset available for contest');
      return null;
    }

    const playerName = options.playerName ?? '<user>';
    const opponentName = options.opponentName ?? 'Opponent';
    const playerAttrName = options.playerAttribute ?? '属性';
    const opponentAttrName = options.opponentAttribute ?? playerAttrName;

    const playerAttributeValue = options.playerAttributeValue ?? 10;
    const opponentAttributeValue = options.opponentAttributeValue ?? 10;
    const playerMod = options.playerModifier ?? 0;
    const opponentMod = options.opponentModifier ?? 0;
    const playerSkillMod = options.playerSkillMod ?? 0;
    const opponentSkillMod = options.opponentSkillMod ?? 0;

    const playerDice = options.playerDice || preset.diceExpression || '1d20';
    const opponentDice = options.opponentDice || preset.contestRule?.opponentDice || preset.diceExpression || '1d20';

    const playerRollResult = diceSystemInstance!.roll(playerDice);
    const opponentRollResult = diceSystemInstance!.roll(opponentDice);

    const attrFormula = preset.attribute?.computeModifier;
    const playerAttrMod = attrFormula ? evaluateContestFormula(attrFormula, { attr: playerAttributeValue }) : 0;
    const opponentAttrMod = attrFormula ? evaluateContestFormula(attrFormula, { attr: opponentAttributeValue }) : 0;

    const context: Record<string, number> = {
      roll: playerRollResult.total,
      playerRoll: playerRollResult.total,
      opponentRoll: opponentRollResult.total,
      playerAttr: playerAttributeValue,
      opponentAttr: opponentAttributeValue,
      attr: playerAttributeValue,
      dc: options.dc ?? 0,
      mod: playerMod,
      playerMod,
      opponentMod,
      playerSkillMod,
      opponentSkillMod,
      playerAttrMod,
      opponentAttrMod,
      playerTotal: playerRollResult.total + playerAttrMod + playerSkillMod + playerMod,
      opponentTotal: opponentRollResult.total + opponentAttrMod + opponentSkillMod + opponentMod,
      attrDiff: playerAttrMod + playerSkillMod - (opponentAttrMod + opponentSkillMod),
      advantageDice: Math.max(
        0,
        Math.floor((playerAttrMod + playerSkillMod - (opponentAttrMod + opponentSkillMod)) / 2),
      ),
    };

    if (options.customFields) {
      for (const [key, value] of Object.entries(options.customFields)) {
        if (typeof value === 'number') {
          context[key] = value;
        }
      }
    }

    if (preset.derivedVars) {
      for (const spec of preset.derivedVars) {
        context[spec.id] = evaluateContestFormula(spec.expr, context);
      }
    }

    const sortedOutcomes = [...preset.outcomes].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    let matchedOutcome =
      sortedOutcomes.find(outcome => {
        const cond = outcome.condition || '';
        if (!cond.trim()) return false;
        return diceSystemInstance!.evaluateCondition(cond, context);
      }) || null;

    if (!matchedOutcome) {
      matchedOutcome = {
        id: context.playerTotal >= context.opponentTotal ? 'contest_win' : 'contest_lose',
        name: context.playerTotal >= context.opponentTotal ? '胜利' : '失败',
        condition: '',
        isSuccess: context.playerTotal >= context.opponentTotal,
      };
    }

    const margin = context.playerTotal - context.opponentTotal;
    const success = matchedOutcome.isSuccess ?? margin >= 0;

    const templateContext: Record<string, number | string> = {
      ...context,
      result: matchedOutcome.name,
      initiator: playerName,
      opponent: opponentName,
      initAttrName: playerAttrName,
      oppAttrName: opponentAttrName,
      presetName: preset.name,
    };

    const template =
      preset.contestOutputTemplate ||
      preset.outputTemplate ||
      matchedOutcome.outputTemplate ||
      '🆚 对抗检定: $initiator vs $opponent，结果: $result';

    const message = fillTemplate(template, templateContext);

    const contestResult: ContestResult = {
      success,
      playerRoll: context.playerRoll,
      playerTotal: context.playerTotal,
      opponentRoll: context.opponentRoll,
      opponentTotal: context.opponentTotal,
      margin,
      message,
      outcome: matchedOutcome.name,
      presetId: preset.id,
      playerName,
      opponentName,
      playerAttribute: playerAttrName,
      opponentAttribute: opponentAttrName,
    };

    eventBus.emit('contest', contestResult);
    return contestResult;
  }

  function roll(formula: string): { total: number; formula: string; breakdown: string } {
    if (!diceSystemInstance) {
      initialize();
    }
    const result = diceSystemInstance!.roll(formula);
    return {
      total: result.total,
      formula: result.formula,
      breakdown: result.breakdown,
    };
  }

  return {
    system: readonly(system) as ComputedRef<DiceSystem | null>,
    initialize,
    performCheck,
    performContest,
    roll,
  };
}

const panelState: Ref<DicePanelState> = ref({
  visible: false,
  minimized: false,
  position: { x: 20, y: 20 },
  size: { width: 380, height: 500 },
  currentPresetId: 'aidm_standard_check',
  theme: 'dark',
});

export function usePanelState(): {
  state: Readonly<Ref<DicePanelState>>;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  minimize: () => void;
  restore: () => void;
  setPosition: (x: number, y: number) => void;
  setSize: (width: number, height: number) => void;
  setTheme: (theme: string) => void;
} {
  function show(): void {
    panelState.value.visible = true;
    eventBus.emit('panel_show');
  }

  function hide(): void {
    panelState.value.visible = false;
    eventBus.emit('panel_hide');
  }

  function toggle(): void {
    if (panelState.value.visible) {
      hide();
    } else {
      show();
    }
  }

  function minimize(): void {
    panelState.value.minimized = true;
  }

  function restore(): void {
    panelState.value.minimized = false;
  }

  function setPosition(x: number, y: number): void {
    panelState.value.position = { x, y };
  }

  function setSize(width: number, height: number): void {
    panelState.value.size = { width, height };
  }

  function setTheme(theme: string): void {
    panelState.value.theme = theme;
  }

  return {
    state: readonly(panelState),
    show,
    hide,
    toggle,
    minimize,
    restore,
    setPosition,
    setSize,
    setTheme,
  };
}

const presets: Ref<AdvancedDicePreset[]> = ref([]);
const currentPreset: Ref<AdvancedDicePreset | null> = ref(null);

export function usePresets(): {
  presets: Readonly<Ref<AdvancedDicePreset[]>>;
  currentPreset: Readonly<Ref<AdvancedDicePreset | null>>;
  loadPresets: () => void;
  selectPreset: (id: string) => void;
  getPresetById: (id: string) => AdvancedDicePreset | undefined;
} {
  function loadPresets(): void {
    if (!diceSystemInstance) {
      diceSystemInstance = createDiceSystem();
    }
    presets.value = diceSystemInstance.getAllPresets();
    currentPreset.value = diceSystemInstance.getCurrentPreset();
  }

  function selectPreset(id: string): void {
    if (!diceSystemInstance) return;
    const preset = diceSystemInstance.getPreset(id);
    if (preset) {
      diceSystemInstance.setCurrentPreset(id);
      currentPreset.value = preset;
      panelState.value.currentPresetId = id;
    }
  }

  function getPresetById(id: string): AdvancedDicePreset | undefined {
    return presets.value.find(p => p.id === id);
  }

  return {
    presets: readonly(presets) as unknown as Readonly<Ref<AdvancedDicePreset[]>>,
    currentPreset: readonly(currentPreset) as unknown as Readonly<Ref<AdvancedDicePreset | null>>,
    loadPresets,
    selectPreset,
    getPresetById,
  };
}

const formData: Ref<PresetFormData> = ref({
  attributeValue: 10,
  dc: 50,
  modifier: 0,
  customFields: {},
});

export function useFormData(): {
  data: Readonly<Ref<PresetFormData>>;
  updateField: (field: keyof PresetFormData, value: unknown) => void;
  updateCustomField: (id: string, value: number | string | boolean) => void;
  reset: () => void;
} {
  function updateField(field: keyof PresetFormData, value: unknown): void {
    (formData.value as unknown as Record<string, unknown>)[field] = value;
  }

  function updateCustomField(id: string, value: number | string | boolean): void {
    formData.value.customFields[id] = value;
  }

  function reset(): void {
    formData.value = {
      attributeValue: 10,
      dc: 50,
      modifier: 0,
      customFields: {},
    };
  }

  return {
    data: readonly(formData),
    updateField,
    updateCustomField,
    reset,
  };
}
