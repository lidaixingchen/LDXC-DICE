export interface RollResult {
  total: number;
  rawDice: number[];
  keptDice: number[];
  formula: string;
  breakdown: string;
  tags: string[];
}

export type FieldType = 'number' | 'text' | 'select' | 'toggle';

export interface CustomFieldConfig {
  id: string;
  type: FieldType;
  label?: string;
  placeholder?: string;
  defaultValue: number | string | boolean;
  hidden?: boolean;
  options?: Array<{ label: string; value: number | string }>;
  contestOverride?: Partial<CustomFieldConfig>;
}

export interface DerivedVarSpec {
  id: string;
  expr: string;
}

export interface DiceExprPatch {
  when?: string;
  op: 'append' | 'prepend' | 'replace';
  template: string;
}

export interface OutcomePolicyMinRank {
  kind: 'minRank';
  requiredRankVarId: string;
  unmetOutcomeId: string;
  keepActualOutcome?: boolean;
}

export interface OutcomePolicyConditional {
  kind: 'conditional';
  rules: Array<{
    when: string;
    overrideOutcomeId: string;
  }>;
}

export type OutcomePolicy = OutcomePolicyMinRank | OutcomePolicyConditional;

export interface OutcomeLevel {
  id: string;
  name: string;
  condition: string;
  priority?: number;
  rank?: number;
  outputTemplate?: string;
  effects?: Effect[];
  isSuccess?: boolean;
  color?: string;
  icon?: string;
}

export interface Effect {
  id: string;
  target: string;
  operation: 'add' | 'subtract' | 'set';
  value: string | number;
  condition?: string;
  initValue?: number;
  min?: number;
  max?: number;
}

export interface EffectResult {
  effectId: string;
  target: string;
  operation: string;
  oldValue: number;
  newValue: number;
  formulaText?: string;
  rolledValue?: number;
  success: boolean;
  error?: string;
  branchLabel?: string;
  level?: number;
  outputMessage?: string;
  triggerMatchCount?: number;
}

export interface SecondaryEffect {
  id: string;
  trigger: {
    type: 'threshold' | 'delta';
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    value: string;
  };
  effects?: Effect[];
  maxTriggerCount?: number;
  outputText?: string;
  randomTable?: {
    dice: string;
    entries: Record<number, string>;
  };
  randomTables?: Array<{
    name: string;
    dice: string;
    entries: Record<number, string>;
  }>;
  subCheck?: {
    attribute: string;
    attributeCandidates?: string[];
    label?: string;
    dice?: string;
    operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    success?: Partial<SecondaryEffect>;
    failure?: Partial<SecondaryEffect>;
  };
  callback?: string;
}

export interface EffectsConfig {
  triggerPatterns?: string[];
  allowedTargets?: string[];
}

export interface EffectConfirmUiConfig {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  showPreview?: boolean;
}

export interface ResourceBurner {
  id: string;
  resourceName: string;
  target: 'roll' | 'dc' | 'modifier';
  ratio: number;
  direction: 'increase' | 'decrease';
  suggestedAmount?: string;
  condition?: string;
  selector?: {
    namePatterns?: {
      include: string[];
      exclude: string[];
    };
  };
}

export interface PresetQuickAction {
  id: string;
  icon: string;
  label: string;
  action: 'roll' | 'custom';
  presetOverrides?: Record<string, unknown>;
}

export interface CurrentAttrAutoUpdate {
  enabled: boolean;
  targetField?: string;
}

export interface ContestRule {
  mode: 'opposed' | 'competitive';
  opponentSource?: 'custom' | 'attribute' | 'select';
  opponentAttribute?: string;
  opponentDice?: string;
  opponentMod?: string;
  tieOutcome?: string;
}

export interface FieldConfig {
  label?: string;
  placeholder?: string;
  defaultValue?: number | string;
  hidden?: boolean;
  key?: string;
  computeModifier?: string;
}

export interface AdvancedDicePreset {
  kind: 'advanced';
  id: string;
  name: string;
  description?: string;
  version: string;
  builtin?: boolean;
  diceExpression: string;
  attribute: FieldConfig & { key?: string };
  dc: FieldConfig;
  mod?: FieldConfig;
  skillMod?: FieldConfig;
  attrTargetMapping?: Record<string, string[]>;
  customFields?: CustomFieldConfig[];
  derivedVars?: DerivedVarSpec[];
  dicePatches?: DiceExprPatch[];
  outcomes: OutcomeLevel[];
  contestRule?: ContestRule;
  outputTemplate?: string;
  contestOutputTemplate?: string;
  outcomePolicy?: OutcomePolicy;
  effectsConfig?: EffectsConfig;
  effectConfirmUi?: EffectConfirmUiConfig;
  resourceBurners?: ResourceBurner[];
  quickActions?: PresetQuickAction[];
  currentAttrAutoUpdate?: CurrentAttrAutoUpdate;
  secondaryEffects?: SecondaryEffect[];
  secondaryMaxDepth?: number;
  secondaryTriggerMode?: 'first' | 'all';
  pushedRoll?: {
    enabled: boolean;
    pushableOutcomes?: string[];
    blockedOutcomes?: string[];
    excludePatterns?: string[];
    blockOnCritFailure?: boolean;
    outcomeLabels?: Record<string, string>;
  };
  errorHandling?: {
    undefinedVariable: 'zero' | 'error';
    parseError: 'fail' | 'warn';
  };
  visible?: boolean;
  order?: number;
}

export interface PendingEffectContext {
  runId: string;
  historyIndex: number;
  messageId?: string;
  expiresAt?: number;
  preset: AdvancedDicePreset;
  matchedOutcome: OutcomeLevel;
  context: {
    characterName: string;
    attributeName: string;
    attributeValue: number;
    roll: number;
    modifier: number;
    dc: number;
  };
  effectOverrides?: ComputedEffect[];
  branchReasonText?: string;
  timestamp: number;
}

export interface ComputedEffect {
  effectId: string;
  target: string;
  operation: 'add' | 'subtract' | 'set';
  value: number;
  condition?: string;
}

export interface DiceRollContext {
  characterName: string;
  attributeName: string;
  attributeValue: number;
  dc: number;
  modifier: number;
  skillMod?: number;
  customFields?: Record<string, number | string | boolean>;
  derivedVars?: Record<string, number>;
}

export interface DiceRollResult {
  roll: RollResult;
  context: DiceRollContext;
  matchedOutcome: OutcomeLevel;
  success: boolean;
  total: number;
  output: string;
  effects?: EffectResult[];
}

export interface TableData {
  name: string;
  content: (string | number | null)[][];
}

export interface DatabaseLockState {
  rows?: number[];
  rowKeys?: string[];
  cells?: string[];
}

export const PRESET_FORMAT_VERSION = '2.0.0';
