import type { AdvancedDicePreset } from '@core/types';

export interface AcuDiceAPI {
  version: string;
  roll(formula: string): { total: number; formula: string; breakdown: string };
  check(options: CheckOptions): Promise<CheckResult>;
  contest(options: ContestOptions): Promise<ContestResult>;
  on(event: AcuDiceEvent, handler: EventHandler): void;
  off(event: AcuDiceEvent, handler: EventHandler): void;
  getPresets(): AdvancedDicePreset[];
  getCurrentPreset(): AdvancedDicePreset | null;
  setCurrentPreset(id: string): boolean;
  showPanel(): void;
  hidePanel(): void;
  togglePanel(): void;
}

export interface CheckOptions {
  presetId?: string;
  attribute?: string;
  attributeValue?: number;
  dc?: number;
  modifier?: number;
  customFields?: Record<string, number | string | boolean>;
}

export interface ContestOptions {
  presetId?: string;
  playerName?: string;
  opponentName?: string;
  playerAttribute?: string;
  playerAttributeValue?: number;
  playerModifier?: number;
  playerSkillMod?: number;
  playerDice?: string;
  opponentAttribute?: string;
  opponentAttributeValue?: number;
  opponentModifier?: number;
  opponentSkillMod?: number;
  opponentDice?: string;
  dc?: number;
  customFields?: Record<string, number | string | boolean>;
}

export interface CheckResult {
  success: boolean;
  roll: number;
  total: number;
  target: number;
  margin: number;
  criticalSuccess: boolean;
  criticalFailure: boolean;
  criticalHit?: boolean;
  outcome: string;
  message: string;
  diceType: string;
  presetId: string;
  attributeName?: string;
  effects?: EffectResult[];
}

export interface ContestResult {
  success: boolean;
  playerRoll: number;
  playerTotal: number;
  opponentRoll: number;
  opponentTotal: number;
  margin: number;
  message: string;
  outcome?: string;
  presetId?: string;
  playerName?: string;
  opponentName?: string;
  playerAttribute?: string;
  opponentAttribute?: string;
}

export interface EffectResult {
  effectId: string;
  target: string;
  operation: string;
  oldValue: number;
  newValue: number;
  success: boolean;
  error?: string;
}

export type AcuDiceEvent = 'check' | 'contest' | 'effect_run' | 'ready' | 'panel_show' | 'panel_hide';
export type EventHandler = (data: any) => void;

export interface DicePanelState {
  visible: boolean;
  minimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  currentPresetId: string;
  theme: string;
}

export interface PresetFormData {
  attributeValue: number;
  dc: number;
  modifier: number;
  customFields: Record<string, number | string | boolean>;
}

export interface CheckHistoryEntry {
  historyType: 'check';
  timestamp: number;
  success: boolean;
  roll: number;
  total: number;
  target: number;
  outcome: string;
  message: string;
  diceType: string;
  attributeName?: string;
  initiatorName?: string;
  effectStatus?: string;
  detailLines?: string[];
  effectTrace?: string[];
  detailId?: string;
  effectRunId?: string;
}

export interface ContestHistoryEntry {
  historyType: 'contest';
  timestamp: number;
  success: boolean;
  playerRoll: number;
  playerTotal: number;
  opponentRoll: number;
  opponentTotal: number;
  margin: number;
  message: string;
  outcome?: string;
  playerName?: string;
  opponentName?: string;
  playerAttribute?: string;
  opponentAttribute?: string;
  left?: { name?: string; roll?: number; total?: number };
  right?: { name?: string; roll?: number; total?: number };
  winner?: string;
  effectStatus?: string;
  detailLines?: string[];
  effectTrace?: string[];
  detailId?: string;
  effectRunId?: string;
}

export type HistoryEntry = CheckHistoryEntry | ContestHistoryEntry;
