import { settingsManager } from '@data/settings-manager';

export interface CrazyModeConfig {
  enabled: boolean;
  crazyLevel: number;
  playerWeight: number;
  inSceneNpcWeight: number;
  offSceneNpcWeight: number;
}

export interface CrazyParticipant {
  name: string;
  attrs: { name: string; value: number }[];
  isPlayer: boolean;
  inScene: boolean;
  weight: number;
  level?: string;
}

export interface CrazyRollResult {
  participantName: string;
  attrName: string;
  attrValue: number;
  rollType: 'normal' | 'contest';
  roll: number;
  total?: number;
  dc?: number;
  result: string;
  formula: string;
  presetName?: string;
}

const DEFAULT_CONFIG: CrazyModeConfig = {
  enabled: false,
  crazyLevel: 50,
  playerWeight: 80,
  inSceneNpcWeight: 15,
  offSceneNpcWeight: 5,
};

export function getCrazyModeConfig(): CrazyModeConfig {
  const legacy = settingsManager.getLegacySettings();
  return {
    enabled: legacy.crazyMode ?? DEFAULT_CONFIG.enabled,
    crazyLevel: legacy.crazyLevel ?? DEFAULT_CONFIG.crazyLevel,
    playerWeight: legacy.playerWeight ?? DEFAULT_CONFIG.playerWeight,
    inSceneNpcWeight: legacy.inSceneNpcWeight ?? DEFAULT_CONFIG.inSceneNpcWeight,
    offSceneNpcWeight: legacy.offSceneNpcWeight ?? DEFAULT_CONFIG.offSceneNpcWeight,
  };
}

export function shouldTriggerCrazyMode(): boolean {
  const config = getCrazyModeConfig();
  if (!config.enabled) return false;
  const roll = Math.random() * 100;
  return roll < config.crazyLevel;
}

export function selectCrazyRollType(crazyLevel: number): 'normal' | 'contest' {
  if (crazyLevel < 50) return 'normal';
  const contestChance = crazyLevel <= 75 ? 0.3 : 0.5;
  return Math.random() < contestChance ? 'contest' : 'normal';
}

function weightedRandomSelect<T extends { weight: number }>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight || 1;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

export interface AttributeData {
  name: string;
  value: number;
}

export interface TableDataProvider {
  getPlayerData(): { name: string; attrs: AttributeData[] } | null;
  getNpcData(): { name: string; attrs: AttributeData[]; inScene: boolean }[];
}

let tableDataProvider: TableDataProvider | null = null;

export function setTableDataProvider(provider: TableDataProvider): void {
  tableDataProvider = provider;
}

export function selectCrazyParticipant(): CrazyParticipant | null {
  const config = getCrazyModeConfig();
  const candidates: CrazyParticipant[] = [];

  if (tableDataProvider) {
    const playerData = tableDataProvider.getPlayerData();
    if (playerData) {
      candidates.push({
        name: playerData.name,
        attrs: playerData.attrs,
        isPlayer: true,
        inScene: true,
        weight: config.playerWeight,
      });
    }

    const npcData = tableDataProvider.getNpcData();
    for (const npc of npcData) {
      candidates.push({
        name: npc.name,
        attrs: npc.attrs,
        isPlayer: false,
        inScene: npc.inScene,
        weight: npc.inScene ? config.inSceneNpcWeight : config.offSceneNpcWeight,
      });
    }
  }

  if (candidates.length === 0) return null;
  return weightedRandomSelect(candidates);
}

export function selectCrazyAttribute(participant: CrazyParticipant): AttributeData {
  if (!participant) return { name: '幸运', value: 50 };

  if (participant.attrs && participant.attrs.length > 0) {
    const randomAttr = participant.attrs[Math.floor(Math.random() * participant.attrs.length)];
    return { name: randomAttr.name, value: randomAttr.value };
  }

  return { name: '幸运', value: 50 };
}

function rollDice(formula: string): number {
  const match = formula.match(/(\d+)[dD](\d+)/);
  if (!match) return Math.floor(Math.random() * 20) + 1;

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);

  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

function computeAttrMod(attrValue: number): number {
  if (attrValue >= 18) return 4;
  if (attrValue >= 16) return 3;
  if (attrValue >= 14) return 2;
  if (attrValue >= 12) return 1;
  if (attrValue >= 8) return 0;
  if (attrValue >= 6) return -1;
  if (attrValue >= 4) return -2;
  return -3;
}

function getMasteryBonus(level: string | undefined): number {
  if (!level) return 0;
  const levelMap: Record<string, number> = {
    F级: 0,
    E级: 1,
    D级: 2,
    C级: 3,
    B级: 4,
    A级: 5,
    S级: 6,
    SS级: 7,
    SSS级: 8,
  };
  return levelMap[level] ?? 0;
}

function judgeResult(roll: number, target: number, isD20: boolean): string {
  if (isD20) {
    if (roll === 20) return '大成功';
    if (roll === 1) return '大失败';
    return roll >= target ? '成功' : '失败';
  } else {
    if (roll <= 5) return '大成功';
    if (roll >= 96) return '大失败';
    return roll <= target ? '成功' : '失败';
  }
}

export function generateCrazyRoll(): CrazyRollResult | null {
  const config = getCrazyModeConfig();
  if (!config.enabled) return null;

  const rollType = selectCrazyRollType(config.crazyLevel);
  const participant = selectCrazyParticipant();

  if (!participant) return null;

  const attr = selectCrazyAttribute(participant);
  const formula = '1d20';
  const roll = rollDice(formula);
  const attrMod = computeAttrMod(attr.value);
  const masteryBonus = getMasteryBonus(participant.level);
  const total = roll + attrMod + masteryBonus;
  const dc = attr.value || 10;

  const result = judgeResult(roll, dc, true);

  return {
    participantName: participant.name,
    attrName: attr.name,
    attrValue: attr.value,
    rollType,
    roll,
    total,
    dc,
    result,
    formula,
    presetName: 'AIDM标准检定',
  };
}

export function formatCrazyRollResult(rollResult: CrazyRollResult): string {
  const { participantName, attrName, roll, total, dc, result, formula, presetName } = rollResult;
  const attrMod = Math.floor((rollResult.attrValue - 10) / 2);
  const attrModStr = attrMod >= 0 ? `+${attrMod}` : `${attrMod}`;

  return `<meta:检定结果>
元叙事：${participantName}发起了【${attrName}】检定(${presetName})，${formula}=${roll}，调整值${attrModStr}，总计${total}，DC${dc}，【${result}】
</meta:检定结果>`;
}

export function generateCrazyRollText(): string | null {
  const rollResult = generateCrazyRoll();
  if (!rollResult) return null;
  return formatCrazyRollResult(rollResult);
}

let lastTriggerTime = 0;
const TRIGGER_COOLDOWN = 300;

export function tryTriggerCrazyMode(): string | null {
  const now = Date.now();
  if (now - lastTriggerTime < TRIGGER_COOLDOWN) return null;
  lastTriggerTime = now;

  if (!shouldTriggerCrazyMode()) return null;

  return generateCrazyRollText();
}
