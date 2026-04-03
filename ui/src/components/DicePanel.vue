<script setup lang="ts">
import { computed, onMounted, provide, ref, watch, inject } from 'vue';
import { useCharacterData, useDiceSystem, useDiceHistory, useDropdownSuggestions, usePresets } from '../composables';
import type { AttributeButton } from '../composables/useCharacterData';
import type { CheckResult } from '../types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switchToOpposed'): void;
}>();

const { initialize: initDiceSystem, performCheck, roll } = useDiceSystem();
const { presets, currentPreset, loadPresets, selectPreset } = usePresets();
const { addCheckEntry, addContestEntry } = useDiceHistory();

const { characters, currentCharacter, attributeButtons, selectCharacter, getRandomAttribute, getAttributeValue } =
  useCharacterData();

const nameDropdown = useDropdownSuggestions<{ name: string }>();
const attrDropdown = useDropdownSuggestions<AttributeButton>();

type CheckMode = 'standard' | 'contest' | 'combat' | 'defense' | 'initiative' | 'escape';

const CHECK_MODES = [
  { id: 'standard', name: '标准检定', icon: 'fa-solid fa-dice-d20', description: '非战斗场景的技能检定' },
  { id: 'contest', name: '对抗检定', icon: 'fa-solid fa-people-arrows', description: '双方对抗比较' },
  { id: 'combat', name: '战斗检定', icon: 'fa-solid fa-hand-fist', description: '攻击检定与伤害计算' },
  { id: 'defense', name: '防守检定', icon: 'fa-solid fa-shield', description: '闪避与防御判定' },
  { id: 'initiative', name: '先攻检定', icon: 'fa-solid fa-bolt', description: '敏捷对抗决定行动顺序' },
  { id: 'escape', name: '逃跑检定', icon: 'fa-solid fa-person-running', description: '脱离战斗的检定' },
];

const isRolling = ref(false);
const lastResult = ref<CheckResult | null>(null);
const showResult = ref(false);

const checkMode = ref<CheckMode>('standard');
const showMoreModes = ref(false);
const initiatorName = ref('');
const attrName = ref('');
const attrValue = ref<number | string>('');
const targetValue = ref<number | string>('');
const modifier = ref<number | string>('');
const difficulty = ref('normal');
const customDiceExpr = ref('1d20');
const customJudgeMode = ref('>=');
const customTargetValue = ref<number | string>('');
const isCustomMode = ref(false);
const worldLevel = ref('F级');

const oppAttrName = ref('');
const oppAttr = ref<number | string>('');
const oppRoll = ref<number | string>('');
const envAdvantage = ref<number | string>('');
const envDisadvantage = ref<number | string>('');
const statusAdvantage = ref<number | string>('');
const statusDisadvantage = ref<number | string>('');

const attackType = ref<'物理' | '法术'>('物理');
const attackPower = ref<number | string>('');
const targetDefense = ref<number | string>('');
const charisma = ref<number | string>('');
const targetDodgeMod = ref<number | string>('');

const enemyAtkMod = ref<number | string>('');
const enemyAttackPower = ref<number | string>('');
const playerDefense = ref<number | string>('');

const oppAgility = ref<number | string>('');
const escapeType = ref<'solo' | 'surrounded' | 'obstacle'>('solo');
const escapeEnemyCount = ref<number | string>('1');
const escapeEnemyAgility = ref<number | string>('');
const escapeObstacleMod = ref<number | string>('0');

interface StatusEffect {
  id: number;
  name: string;
  type: 'buff' | 'debuff' | 'dot' | 'control' | 'shield';
  intensity: 'weak' | 'medium' | 'strong';
  value: number;
  remainingRounds: number;
  description: string;
}

interface CombatState {
  active: boolean;
  round: number;
  enemyName: string;
  enemyMaxHP: number;
  enemyCurrentHP: number;
  playerMaxHP: number;
  playerCurrentHP: number;
  playerShield: number;
}

let statusIdCounter = 0;
const activeStatuses = inject<any>('aidmStatuses');
const newStatusName = ref('');
const newStatusType = ref<'buff' | 'debuff' | 'dot' | 'control' | 'shield'>('debuff');
const newStatusIntensity = ref<'weak' | 'medium' | 'strong'>('medium');
const newStatusValue = ref<number | string>('1');
const newStatusRounds = ref<number | string>('3');

interface EquipmentSlot {
  name: string;
  physDmg: number;
  magicDmg: number;
  physDef: number;
  magicDef: number;
  hpBonus: number;
  dodgeBonus: number;
}

const equipment = ref<EquipmentSlot>({
  name: '',
  physDmg: 0,
  magicDmg: 0,
  physDef: 0,
  magicDef: 0,
  hpBonus: 0,
  dodgeBonus: 0,
});

const combat = inject<any>('aidmCombat');

function startCombat(): void {
  const levelConfig = WORLD_LEVEL_CONFIG[worldLevel.value];
  const baseHP = levelConfig.hpBase || 100;
  combat.value = {
    active: true,
    round: 1,
    enemyName: combat.value.enemyName || '未知敌人',
    enemyMaxHP: combat.value.enemyMaxHP || baseHP * 2,
    enemyCurrentHP: combat.value.enemyMaxHP || baseHP * 2,
    playerMaxHP: levelConfig.hpBase + (playerDefense.value !== '' ? Number(playerDefense.value) * 5 : 0) + equipment.value.hpBonus,
    playerCurrentHP: levelConfig.hpBase + (playerDefense.value !== '' ? Number(playerDefense.value) * 5 : 0) + equipment.value.hpBonus,
    playerShield: 0,
  };
}

function endCombat(): void {
  combat.value.active = false;
  combat.value.round = 1;
}

function nextRound(): void {
  if (!combat.value.active) return;
  combat.value.round++;
  decayStatuses();
  if (combat.value.round >= 6) {
    const erosionDamage = Math.max(1, Math.floor(combat.value.playerMaxHP * 0.05));
    combat.value.playerCurrentHP = Math.max(0, combat.value.playerCurrentHP - erosionDamage);
  }
}

function applyDamageToEnemy(damage: number): void {
  if (!combat.value.active) return;
  combat.value.enemyCurrentHP = Math.max(0, combat.value.enemyCurrentHP - damage);
}

function applyDamageToPlayer(damage: number): void {
  if (!combat.value.active) return;
  if (combat.value.playerShield > 0) {
    const absorbed = Math.min(combat.value.playerShield, damage);
    combat.value.playerShield -= absorbed;
    damage -= absorbed;
  }
  combat.value.playerCurrentHP = Math.max(0, combat.value.playerCurrentHP - damage);
}

const ATTR_MAPPING: Record<string, string[]> = {
  strength: ['力量', 'STR', 'Str', 'str', '力量值', '体力', '物理攻击力'],
  agility: ['敏捷', 'AGI', 'Agi', 'agi', '敏捷值', '速度', 'SPD', 'Spd', '闪避'],
  endurance: ['体质', 'END', 'End', 'end', '耐力', '耐力值', '体力上限', 'HP', 'Hp', 'hp', '生命值', '血量', '物防', '防御力'],
  intelligence: ['智力', 'INT', 'Int', 'int', '智力值', '智慧', '魔力', '法攻', '法术攻击力'],
  perception: ['感知', 'PER', 'Per', 'per', '感知值', '洞察', '察觉', '法防', '法术防御'],
  charisma: ['魅力', 'CHA', 'Cha', 'cha', '魅力值', '魅力属性', 'CHR', 'Chr', '暴击率'],
  attackPower: ['攻击力', '攻击', 'ATK', 'Atk', 'atk', '物攻', '物理攻击', '法攻', '法术攻击'],
  defense: ['防御力', '防御', 'DEF', 'Def', 'def', '物防', '物理防御', '法防', '法术防御', '护甲', '防御值'],
};

function findAttrValue(attrs: Record<string, number>, keys: string[]): number | null {
  for (const key of keys) {
    if (attrs[key] !== undefined) return attrs[key];
  }
  return null;
}

interface DerivedStats {
  physAtk: number;
  magicAtk: number;
  physDef: number;
  magicDef: number;
  hp: number;
  ddc: number;
  critRate: number;
}

function deriveCombatStats(attrs: Record<string, number>, level: string): DerivedStats {
  const str = findAttrValue(attrs, ATTR_MAPPING.strength) || 0;
  const agi = findAttrValue(attrs, ATTR_MAPPING.agility) || 0;
  const end = findAttrValue(attrs, ATTR_MAPPING.endurance) || 0;
  const intVal = findAttrValue(attrs, ATTR_MAPPING.intelligence) || 0;
  const per = findAttrValue(attrs, ATTR_MAPPING.perception) || 0;
  const cha = findAttrValue(attrs, ATTR_MAPPING.charisma) || 0;

  const hpBase = WORLD_LEVEL_CONFIG[level]?.hpBase || 25;

  return {
    physAtk: str + equipment.value.physDmg,
    magicAtk: intVal + equipment.value.magicDmg,
    physDef: end + equipment.value.physDef,
    magicDef: per + equipment.value.magicDef,
    hp: Math.max(1, end * 5 + hpBase + equipment.value.hpBonus),
    ddc: 10 + Math.max(computeAIDMAttrMod(agi), computeAIDMAttrMod(per)) + equipment.value.dodgeBonus,
    critRate: computeCritRate(cha),
  };
}

function autoFillFromCharacter(charName: string): void {
  const char = characters.value.find(c => c.name === charName);
  if (!char) return;

  const attrs = char.attributes;

  const atkPower = findAttrValue(attrs, ATTR_MAPPING.attackPower);
  if (atkPower !== null) attackPower.value = atkPower;

  const def = findAttrValue(attrs, ATTR_MAPPING.defense);
  if (def !== null) playerDefense.value = def;

  const cha = findAttrValue(attrs, ATTR_MAPPING.charisma);
  if (cha !== null) charisma.value = cha;

  const str = findAttrValue(attrs, ATTR_MAPPING.strength);
  if (str !== null && attrValue.value === '') attrValue.value = str;

  const agi = findAttrValue(attrs, ATTR_MAPPING.agility);
  if (agi !== null) oppAgility.value = String(agi);

  const end = findAttrValue(attrs, ATTR_MAPPING.endurance);
  if (end !== null && playerDefense.value === '') playerDefense.value = end;

  initiatorName.value = charName;
}

watch(currentCharacter, (newVal) => {
  if (newVal) {
    autoFillFromCharacter(newVal);
  }
});

watch(attrName, (newVal) => {
  if (currentCharacter.value && newVal) {
    const value = getAttributeValue(currentCharacter.value, newVal);
    if (value !== null) {
      attrValue.value = value;
    }
  }
});

interface WorldLevelConfig {
  baseDC: number;
  masteryBonus: number;
  hpBase: number;
  singleAttrMax: number;
  description: string;
}

const WORLD_LEVEL_CONFIG: Record<string, WorldLevelConfig> = {
  'F级': { baseDC: 10, masteryBonus: 0, hpBase: 25, singleAttrMax: 30, description: '普通武侠、现代国术' },
  'E级': { baseDC: 13, masteryBonus: 1, hpBase: 50, singleAttrMax: 45, description: '低武、现代异能' },
  'D级': { baseDC: 16, masteryBonus: 2, hpBase: 75, singleAttrMax: 60, description: '武侠、低等恐怖' },
  'C级': { baseDC: 19, masteryBonus: 3, hpBase: 100, singleAttrMax: 80, description: '低等修真、现代灭世' },
  'B级': { baseDC: 22, masteryBonus: 4, hpBase: 125, singleAttrMax: 100, description: '中等修真、奇幻' },
  'A级': { baseDC: 25, masteryBonus: 5, hpBase: 175, singleAttrMax: 125, description: '高等仙侠、星球战争' },
  'S级': { baseDC: 28, masteryBonus: 6, hpBase: 250, singleAttrMax: 150, description: '神话仙侠、克苏鲁' },
  'SS级': { baseDC: 31, masteryBonus: 6, hpBase: 350, singleAttrMax: 180, description: '多元宇宙、概念战争' },
  'SSS级': { baseDC: 34, masteryBonus: 8, hpBase: 500, singleAttrMax: 9999, description: '全能领域、超越者' },
};

const WORLD_LEVELS = Object.keys(WORLD_LEVEL_CONFIG);

const DIFFICULTY_MOD: Record<string, number> = {
  normal: 0,
  hard: 3,
  extreme: 6,
};

function computeAIDMAttrMod(attr: number): number {
  if (attr <= 15) return 0;
  if (attr <= 25) return 1;
  if (attr <= 35) return 2;
  if (attr <= 45) return 3;
  if (attr <= 55) return 4;
  if (attr <= 65) return 5;
  if (attr <= 75) return 6;
  if (attr <= 85) return 7;
  if (attr <= 95) return 8;
  if (attr <= 105) return 9;
  if (attr <= 120) return 10;
  if (attr <= 140) return 11;
  if (attr <= 160) return 12;
  if (attr <= 185) return 13;
  if (attr <= 210) return 14;
  if (attr <= 240) return 15;
  if (attr <= 270) return 16;
  if (attr <= 305) return 17;
  if (attr <= 340) return 18;
  if (attr <= 380) return 19;
  return 19 + Math.floor((attr - 381) / 40);
}

function getMasteryBonus(_level: string): number {
  return 0;
}

function getSPV(level: string): number {
  const SPV_MAP: Record<string, number> = {
    'F级': 5, 'E级': 10, 'D级': 15, 'C级': 20,
    'B级': 25, 'A级': 35, 'S级': 50, 'SS级': 70, 'SSS级': 95,
  };
  return SPV_MAP[level] || 5;
}

function getBaseDC(level: string): number {
  return WORLD_LEVEL_CONFIG[level]?.baseDC ?? 10;
}

const QUICK_PRESETS = computed(() => {
  const list = presets.value.filter(p => p.visible !== false).map(p => ({ id: p.id!, name: p.name }));
  return [
    { id: '__custom__', name: '自定义' },
    ...list,
  ];
});

const DIFFICULTY_OPTIONS = [
  { value: 'normal', label: '常规 (+0)' },
  { value: 'hard', label: '困难 (+3)' },
  { value: 'extreme', label: '极难 (+6)' },
];

const JUDGE_MODE_OPTIONS = [
  { id: '>=', name: '>=' },
  { id: '<=', name: '<=' },
  { id: '>', name: '>' },
  { id: '<', name: '<' },
  { id: 'none', name: '无判定' },
];

const ATTACK_TYPE_OPTIONS = [
  { value: '物理', label: '物理攻击' },
  { value: '法术', label: '法术攻击' },
];

function selectCheckMode(mode: CheckMode): void {
  checkMode.value = mode;
  showResult.value = false;
  lastResult.value = null;
}

function selectQuickPreset(id: string): void {
  isCustomMode.value = id === '__custom__';
  if (id === '__custom__') {
    customDiceExpr.value = '1d20';
  } else {
    selectPreset(id);
    const p = presets.value.find(x => x.id === id);
    if (p) {
      customDiceExpr.value = p.diceExpression || '1d20';
    }
  }
}

function handleSelectCharacter(name: string): void {
  selectCharacter(name);
  autoFillFromCharacter(name);
  nameDropdown.close();
}

function handleSelectAttribute(attr: AttributeButton): void {
  attrName.value = attr.name;
  attrValue.value = attr.value;
  attrDropdown.close();
}

function handleSelectOpponentAttribute(attr: AttributeButton): void {
  oppAttrName.value = attr.name;
  oppAttr.value = attr.value;
  attrDropdown.close();
}

function randomSkill(): void {
  const attr = getRandomAttribute();
  if (attr) {
    attrName.value = attr.name;
    attrValue.value = attr.value;
  }
}

function computeDamageReduction(defense: number, attackPower: number): number {
  const ratio = defense / attackPower;
  if (ratio < 0.5) return 0;
  if (ratio < 0.8) return 0.2;
  if (ratio < 1) return 0.4;
  if (ratio < 1.5) return 0.6;
  return 0.8;
}

function computeCritRate(charismaVal: number): number {
  return Math.min(50, 5 + Math.floor(charismaVal / 2));
}

function isCritHit(rollValue: number, critRatePercent: number, didHit: boolean): boolean {
  if (!didHit) return false;
  const threshold = Math.floor(critRatePercent / 5);
  return rollValue <= threshold;
}

function rollWithAdvantage(formula: string, advantageCount: number, disadvantageCount: number): { total: number; breakdown: string; rolls: number[] } {
  const netAdv = advantageCount - disadvantageCount;
  
  if (netAdv === 0) {
    const result = roll(formula);
    return { total: result.total, breakdown: result.breakdown, rolls: [result.total] };
  }
  
  const rollCount = Math.min(Math.abs(netAdv) + 1, 5);
  const rolls: number[] = [];
  
  for (let i = 0; i < rollCount; i++) {
    const result = roll(formula);
    rolls.push(result.total);
  }
  
  let finalRoll: number;
  let breakdown: string;
  
  if (netAdv > 0) {
    finalRoll = Math.max(...rolls);
    breakdown = `优势(${rolls.join(', ')})取最高→${finalRoll}`;
  } else {
    finalRoll = Math.min(...rolls);
    breakdown = `劣势(${rolls.join(', ')})取最低→${finalRoll}`;
  }
  
  return { total: finalRoll, breakdown, rolls };
}

async function handleStandardCheck(): Promise<void> {
  const formula = '1d20';
  const mod = modifier.value !== '' ? Number(modifier.value) : 0;
  const attr = attrName.value || '自由检定';
  const diff = difficulty.value;
  const level = worldLevel.value;

  const attrVal = attrValue.value !== '' ? Number(attrValue.value) : 10;
  const attrMod = computeAIDMAttrMod(attrVal);
  const masteryBonus = getMasteryBonus(level);
  const baseDC = getBaseDC(level);
  const diffMod = DIFFICULTY_MOD[diff] || 0;
  const finalDC = baseDC + diffMod;

  let target = targetValue.value !== '' ? Number(targetValue.value) : finalDC;
  if (target === 0) target = finalDC;

  const result = roll(formula);
  const rollTotal = result.total;
  const finalValue = rollTotal + attrMod + masteryBonus + mod;

  let isCritSuccess = rollTotal === 20;
  let isCritFailure = rollTotal === 1;
  let isSuccess = finalValue >= target;
  let outcomeText = '';

  if (isCritSuccess) {
    outcomeText = '大成功！';
    isSuccess = true;
  } else if (isCritFailure) {
    outcomeText = '大失败！';
    isSuccess = false;
  } else if (isSuccess) {
    outcomeText = '成功';
  } else {
    outcomeText = '失败';
  }

  let hpPenalty = 0;
  const triggerPenalty = !isSuccess && !isCritFailure && Math.random() < 0.5;
  if (triggerPenalty) {
    hpPenalty = Math.max(1, Math.min(10, target - finalValue));
  }

  const judgeResult = isSuccess ? '≥' : '<';
  const diffLabel = diff === 'normal' ? '常规' : (diff === 'hard' ? '困难' : '极难');

  lastResult.value = {
    success: isSuccess,
    roll: rollTotal,
    total: finalValue,
    target: target,
    margin: finalValue - target,
    criticalSuccess: isCritSuccess,
    criticalFailure: isCritFailure,
    outcome: outcomeText,
    message: `D20(${rollTotal}) + 属性加成(${attrMod}) + 掌握加成(${masteryBonus})${mod !== 0 ? ` + 修正(${mod >= 0 ? '+' : ''}${mod})` : ''} = ${finalValue}`,
    diceType: formula,
    presetId: 'standard',
  };
  showResult.value = true;

  const initiator = initiatorName.value || '<user>';
  const content = `<meta:检定结果>
【AIDM标准检定】

🎲 判定过程：
・D20投骰：${rollTotal}
・属性加成：${attrMod}（${attr}: ${attrVal}）
・掌握加成：${masteryBonus}
・额外修正：${mod}
・最终值：${finalValue}

📊 DC对比：${finalValue} ${judgeResult} ${target}
（世界等级${level}，基础DC ${baseDC}，难度调整${diffLabel} ${diffMod > 0 ? '+' : ''}${diffMod}）
${isCritSuccess ? '✨ 大成功！' : (isCritFailure ? '💀 大失败！' : (isSuccess ? '✅ 成功！' : `❌ 失败${triggerPenalty ? `（⚠️ 触发失败惩罚，扣除 ${hpPenalty}% HP）` : ''}`))}
</meta:检定结果>`;
  await sendToTextarea(content);

  addCheckEntry(lastResult.value, { initiatorName: initiator });
}

async function handleInitiativeCheck(): Promise<void> {
  const formula = '1d20';
  const level = worldLevel.value;

  const myAgiVal = attrValue.value !== '' ? Number(attrValue.value) : 10;
  const myAgiMod = computeAIDMAttrMod(myAgiVal);
  const myMasteryBonus = getMasteryBonus(level);

  const oppAgiVal = oppAgility.value !== '' ? Number(oppAgility.value) : 10;
  const oppAgiMod = computeAIDMAttrMod(oppAgiVal);
  const oppMasteryBonus = getMasteryBonus(level);

  const myRollResult = roll(formula);
  const myRollTotal = myRollResult.total;
  const myTotal = myRollTotal + myAgiMod + myMasteryBonus;

  const oppRollResult = roll(formula);
  const oppRollTotal = oppRollResult.total;
  const oppTotal = oppRollTotal + oppAgiMod + oppMasteryBonus;

  const isFirst = myTotal > oppTotal;
  let outcomeText = '';

  if (myTotal > oppTotal) {
    outcomeText = '先手！';
  } else if (myTotal < oppTotal) {
    outcomeText = '后手！';
  } else {
    outcomeText = '同时行动！';
  }

  lastResult.value = {
    success: isFirst,
    roll: myRollTotal,
    total: myTotal,
    target: oppTotal,
    margin: myTotal - oppTotal,
    criticalSuccess: false,
    criticalFailure: false,
    outcome: outcomeText,
    message: `己方: D20(${myRollTotal}) + 敏捷(${myAgiMod}) + 掌握(${myMasteryBonus}) = ${myTotal} | 对方: D20(${oppRollTotal}) + 敏捷(${oppAgiMod}) + 掌握(${oppMasteryBonus}) = ${oppTotal}`,
    diceType: formula,
    presetId: 'initiative',
  };
  showResult.value = true;

  const content = `<meta:检定结果>
【AIDM先攻检定】

🎲 己方投骰：
・D20：${myRollTotal}
・敏捷属性加成：${myAgiMod}（敏捷${myAgiVal}）
・掌握加成：${myMasteryBonus}
・最终值：${myTotal}

🎲 对方投骰：
・D20：${oppRollTotal}
・敏捷属性加成：${oppAgiMod}（敏捷${oppAgiVal}）
・掌握加成：${oppMasteryBonus}
・最终值：${oppTotal}

⚡ 结果对比：${myTotal} vs ${oppTotal}
${myTotal > oppTotal ? '✅ 先手行动权！' : (myTotal < oppTotal ? '❌ 后手行动！' : '⚖️ 同时行动！')}
</meta:检定结果>`;
  await sendToTextarea(content);

  addContestEntry({
    success: isFirst,
    playerRoll: myRollTotal,
    playerTotal: myTotal,
    opponentRoll: oppRollTotal,
    opponentTotal: oppTotal,
    margin: myTotal - oppTotal,
    message: lastResult.value.message,
    outcome: outcomeText,
    playerName: initiatorName.value || '己方',
    opponentName: '对方',
    playerAttribute: '敏捷',
    opponentAttribute: '敏捷',
  });
}

async function handleEscapeCheck(): Promise<void> {
  const formula = '1d20';
  const level = worldLevel.value;

  const myAgiVal = attrValue.value !== '' ? Number(attrValue.value) : 10;
  const myAgiMod = computeAIDMAttrMod(myAgiVal);
  const masteryBonus = getMasteryBonus(level);
  const mod = modifier.value !== '' ? Number(modifier.value) : 0;

  let escapeDC: number;
  let dcDescription: string;

  switch (escapeType.value) {
    case 'solo': {
      escapeDC = 10;
      dcDescription = `单对单逃跑，DC=10（基础）`;
      break;
    }
    case 'surrounded': {
      const enemyCount = escapeEnemyCount.value !== '' ? Number(escapeEnemyCount.value) : 1;
      const enemyAgi = escapeEnemyAgility.value !== '' ? Number(escapeEnemyAgility.value) : 0;
      const enemyAgiMod = computeAIDMAttrMod(enemyAgi);
      escapeDC = 10 + enemyAgiMod + enemyCount * 2;
      dcDescription = `被包围逃跑，DC=10+敌方敏捷(${enemyAgiMod})+敌人数量×2(${enemyCount * 2})=${escapeDC}`;
      break;
    }
    case 'obstacle': {
      const enemyAgi = escapeEnemyAgility.value !== '' ? Number(escapeEnemyAgility.value) : 0;
      const enemyAgiMod = computeAIDMAttrMod(enemyAgi);
      const obstacleMod = escapeObstacleMod.value !== '' ? Number(escapeObstacleMod.value) : 0;
      escapeDC = 10 + enemyAgiMod + obstacleMod;
      dcDescription = `有障碍物掩护逃跑，DC=10+敌方敏捷(${enemyAgiMod})+环境修正(${obstacleMod})=${escapeDC}`;
      break;
    }
  }

  const result = roll(formula);
  const rollTotal = result.total;
  const finalValue = rollTotal + myAgiMod + mod;

  const isSuccess = finalValue >= escapeDC;

  lastResult.value = {
    success: isSuccess,
    roll: rollTotal,
    total: finalValue,
    target: escapeDC,
    margin: finalValue - escapeDC,
    criticalSuccess: false,
    criticalFailure: false,
    outcome: isSuccess ? '逃跑成功！' : '逃跑失败，浪费一回合',
    message: `D20(${rollTotal}) + 敏捷(${myAgiMod})${mod !== 0 ? ` + 修正(${mod >= 0 ? '+' : ''}${mod})` : ''} = ${finalValue} vs DC ${escapeDC}`,
    diceType: formula,
    presetId: 'escape',
  };
  showResult.value = true;

  const typeLabel = escapeType.value === 'solo' ? '单对单' : (escapeType.value === 'surrounded' ? '被包围' : '有障碍');
  const content = `<meta:检定结果>
【AIDM逃跑检定 - ${typeLabel}】

🎲 判定过程：
・D20投骰：${rollTotal}
・敏捷属性加成：${myAgiMod}（敏捷${myAgiVal}）
・额外修正：${mod}
・最终值：${finalValue}

📊 DC对比：${finalValue} ${isSuccess ? '≥' : '<'} ${escapeDC}
（${dcDescription}）
${isSuccess ? '🏃 逃跑成功！脱离战斗！' : '🚫 逃跑失败！浪费一回合，敌人获得免费攻击机会'}
</meta:检定结果>`;
  await sendToTextarea(content);

  addCheckEntry(lastResult.value, { initiatorName: initiatorName.value || '<user>' });
}

function addStatus(): void {
  const name = newStatusName.value.trim();
  if (!name) return;

  statusIdCounter++;
  activeStatuses.value.push({
    id: statusIdCounter,
    name,
    type: newStatusType.value,
    intensity: newStatusIntensity.value,
    value: newStatusValue.value !== '' ? Number(newStatusValue.value) : 1,
    remainingRounds: newStatusRounds.value !== '' ? Number(newStatusRounds.value) : 3,
    description: '',
  });

  newStatusName.value = '';
  newStatusValue.value = '1';
  newStatusRounds.value = '3';
}

function removeStatus(id: number): void {
  activeStatuses.value = (activeStatuses.value as StatusEffect[]).filter((s: StatusEffect) => s.id !== id);
}

function decayStatuses(): void {
  activeStatuses.value = (activeStatuses.value as StatusEffect[])
    .map((s: StatusEffect) => ({ ...s, remainingRounds: s.remainingRounds - 1 }))
    .filter((s: StatusEffect) => s.remainingRounds > 0);
}

function clearAllStatuses(): void {
  activeStatuses.value = [];
}

function getStatusEnvModifier(): { advantage: number; disadvantage: number } {
  let advantage = 0;
  let disadvantage = 0;

  for (const s of activeStatuses.value) {
    if (s.type === 'buff') advantage += s.intensity === 'weak' ? 1 : (s.intensity === 'medium' ? 2 : 3);
    if (s.type === 'debuff') disadvantage += s.intensity === 'weak' ? 1 : (s.intensity === 'medium' ? 2 : 3);
  }

  return { advantage, disadvantage };
}

async function handleContestCheck(): Promise<void> {
  const formula = '1d20';
  const level = worldLevel.value;

  const myAttrVal = attrValue.value !== '' ? Number(attrValue.value) : 10;
  const myAttrMod = computeAIDMAttrMod(myAttrVal);
  const myMasteryBonus = getMasteryBonus(level);

  const oppAttrVal = oppAttr.value !== '' ? Number(oppAttr.value) : 10;
  const oppAttrMod = computeAIDMAttrMod(oppAttrVal);

  const oppRollVal = oppRoll.value !== '' ? Number(oppRoll.value) : 10;

  const envAdv = envAdvantage.value !== '' ? Number(envAdvantage.value) : 0;
  const envDis = envDisadvantage.value !== '' ? Number(envDisadvantage.value) : 0;
  const statAdv = statusAdvantage.value !== '' ? Number(statusAdvantage.value) : 0;
  const statDis = statusDisadvantage.value !== '' ? Number(statusDisadvantage.value) : 0;

  const attrDiff = myAttrMod - oppAttrMod;
  const attrAdvDice = attrDiff > 0 ? Math.min(3, attrDiff) : 0;
  const totalAdv = attrAdvDice + envAdv + statAdv;
  const totalDis = envDis + statDis;
  const netAdv = totalAdv - totalDis;

  const rollResult = rollWithAdvantage(formula, totalAdv, totalDis);
  const rollTotal = rollResult.total;
  
  const isCritSuccess = rollTotal === 20;
  const isCritFailure = rollTotal === 1;
  
  const myTotal = rollTotal + myAttrMod + myMasteryBonus;
  const oppTotal = oppRollVal + oppAttrMod;

  let isSuccess = myTotal > oppTotal;
  let outcomeText = '';

  if (isCritSuccess) {
    outcomeText = '大成功获胜！';
    isSuccess = true;
  } else if (isCritFailure) {
    outcomeText = '大失败落败！';
    isSuccess = false;
  } else if (myTotal > oppTotal) {
    outcomeText = '获胜！';
  } else if (myTotal < oppTotal) {
    outcomeText = '落败！';
    isSuccess = false;
  } else {
    outcomeText = '平局！';
    isSuccess = false;
  }

  lastResult.value = {
    success: isSuccess,
    roll: rollTotal,
    total: myTotal,
    target: oppTotal,
    margin: myTotal - oppTotal,
    criticalSuccess: isCritSuccess,
    criticalFailure: isCritFailure,
    outcome: outcomeText,
    message: `己方: ${rollResult.breakdown} + 属性(${myAttrMod}) + 掌握(${myMasteryBonus}) = ${myTotal} | 对方: D20(${oppRollVal}) + 属性(${oppAttrMod}) = ${oppTotal}`,
    diceType: formula,
    presetId: 'contest',
  };
  showResult.value = true;

  const initiator = initiatorName.value || '<user>';
  const advText = netAdv > 0 ? `优势(+${netAdv})` : (netAdv < 0 ? `劣势(${netAdv})` : '无调整');
  const content = `<meta:检定结果>
【AIDM对抗检定】

📊 属性对比：
・己方属性加成：${myAttrMod}（属性${myAttrVal}）
・对方属性加成：${oppAttrMod}（属性${oppAttrVal}）
・属性差：${attrDiff} → 属性优势骰：${attrAdvDice}个

🎲 骰子池计算：
・优势骰：${totalAdv}个（属性${attrAdvDice} + 环境${envAdv} + 状态${statAdv}）
・劣势骰：${totalDis}个（环境${envDis} + 状态${statDis}）
・净调整：${advText}

🎯 投骰结果：
・己方：${rollResult.breakdown} + 属性(${myAttrMod}) + 掌握(${myMasteryBonus}) = ${myTotal}
・对方：D20(${oppRollVal}) + 属性(${oppAttrMod}) = ${oppTotal}

${isCritSuccess ? '✨ 大成功！' : (isCritFailure ? '💀 大失败！' : (myTotal > oppTotal ? '✅ 获胜！' : (myTotal < oppTotal ? '❌ 落败！' : '⚖️ 平局！')))}
</meta:检定结果>`;
  await sendToTextarea(content);

  addContestEntry({
    success: isSuccess,
    playerRoll: rollTotal,
    playerTotal: myTotal,
    opponentRoll: oppRollVal,
    opponentTotal: oppTotal,
    margin: myTotal - oppTotal,
    message: lastResult.value.message,
    outcome: outcomeText,
    playerName: initiator,
    opponentName: '对方',
    playerAttribute: attrName.value || '属性',
    opponentAttribute: '属性',
  });
}

async function handleCombatCheck(): Promise<void> {
  const formula = '1d20';
  const level = worldLevel.value;

  const attrVal = attrValue.value !== '' ? Number(attrValue.value) : 10;
  const attrMod = computeAIDMAttrMod(attrVal);
  const masteryBonus = getMasteryBonus(level);
  const mod = modifier.value !== '' ? Number(modifier.value) : 0;

  const baseDDC = getBaseDC(level);
  const dodgeMod = targetDodgeMod.value !== '' ? Number(targetDodgeMod.value) : 0;
  const finalDC = baseDDC + dodgeMod;

  const atkPower = attackPower.value !== '' ? Number(attackPower.value) : 10;
  const tgtDefense = targetDefense.value !== '' ? Number(targetDefense.value) : 5;
  const charismaVal = charisma.value !== '' ? Number(charisma.value) : 10;

  const critRate = computeCritRate(charismaVal);

  const result = roll(formula);
  const rollTotal = result.total;
  const finalValue = rollTotal + attrMod + masteryBonus + mod;

  const isHit = finalValue >= finalDC;
  const isCrit = isCritHit(rollTotal, critRate, isHit);

  const damageReduction = computeDamageReduction(tgtDefense, atkPower);
  const baseDamage = Math.max(1, Math.floor(atkPower * (1 - damageReduction)));
  const finalDamage = isCrit ? baseDamage * 2 : baseDamage;

  let outcomeText = '';
  let isSuccess = false;

  if (isCrit) {
    outcomeText = '⚡ 暴击命中！';
    isSuccess = true;
  } else if (isHit) {
    outcomeText = '命中！';
    isSuccess = true;
  } else {
    outcomeText = '未命中！';
  }

  const levelName = level.replace('级', '');
  const atkTypeLabel = attackType.value;

  lastResult.value = {
    success: isSuccess,
    roll: rollTotal,
    total: finalValue,
    target: finalDC,
    margin: finalValue - finalDC,
    criticalSuccess: isCrit,
    criticalFailure: false,
    outcome: outcomeText,
    message: `D20(${rollTotal}) + 属性(${attrMod}) + 掌握(${masteryBonus}) = ${finalValue} | ${atkTypeLabel}伤害: ${finalDamage}${isCrit ? ' (暴击x2)' : ''}`,
    diceType: formula,
    presetId: 'combat',
  };
  showResult.value = true;

  const initiator = initiatorName.value || '<user>';
  const content = `<meta:检定结果>
【AIDM战斗检定 - ${atkTypeLabel}】

🎲 判定过程：
・D20投骰：${rollTotal}
・属性加成：${attrMod}（${attrName.value || '属性'}: ${attrVal}）
・掌握加成：${masteryBonus}
・额外修正：${mod}
・最终值：${finalValue}

📊 DDC对比：${finalValue} ${isHit ? '≥' : '<'} ${finalDC}
（目标等级${levelName}级，基础DDC ${baseDDC}，闪避加值${dodgeMod}）
${isCrit ? '⚡ 暴击命中！' : (isHit ? '✅ 命中！' : '❌ 未命中！')}

⚔️ 伤害计算：
・攻击力：${atkPower}
・目标防御：${tgtDefense}
・伤害减免：${Math.round(damageReduction * 100)}%
・基础伤害：${baseDamage}
${isCrit ? '・暴击倍率：x2' : ''}
最终伤害：${finalDamage}${isCrit ? '（暴击）' : ''}
</meta:检定结果>`;
  await sendToTextarea(content);

  addCheckEntry(lastResult.value, { initiatorName: initiator });
}

async function handleDefenseCheck(): Promise<void> {
  const formula = '1d20';
  const level = worldLevel.value;

  const attrVal = attrValue.value !== '' ? Number(attrValue.value) : 10;
  const attrMod = computeAIDMAttrMod(attrVal);
  const masteryBonus = getMasteryBonus(level);
  const dodgeMod = modifier.value !== '' ? Number(modifier.value) : 0;

  const worldBaseDC = getBaseDC(level);
  const enemyAttrMod = enemyAtkMod.value !== '' ? Number(enemyAtkMod.value) : 0;
  const finalDC = worldBaseDC + enemyAttrMod + masteryBonus;

  const enemyAtkPower = enemyAttackPower.value !== '' ? Number(enemyAttackPower.value) : 10;
  const myDefense = playerDefense.value !== '' ? Number(playerDefense.value) : 5;

  const result = roll(formula);
  const rollTotal = result.total;
  const finalValue = rollTotal + attrMod + dodgeMod;

  const isDodge = finalValue >= finalDC;

  const damageReduction = computeDamageReduction(myDefense, enemyAtkPower);
  const baseDamage = Math.max(1, Math.floor(enemyAtkPower * (1 - damageReduction)));

  let outcomeText = '';
  let isSuccess = false;

  if (isDodge) {
    outcomeText = '闪避成功！';
    isSuccess = true;
  } else {
    outcomeText = '被击中！';
  }

  const levelName = level.replace('级', '');

  lastResult.value = {
    success: isSuccess,
    roll: rollTotal,
    total: finalValue,
    target: finalDC,
    margin: finalValue - finalDC,
    criticalSuccess: false,
    criticalFailure: false,
    outcome: outcomeText,
    message: `D20(${rollTotal}) + 属性(${attrMod})${dodgeMod !== 0 ? ` + 闪避(${dodgeMod})` : ''} = ${finalValue} | ${isDodge ? '闪避成功' : `承受伤害: ${baseDamage}`}`,
    diceType: formula,
    presetId: 'defense',
  };
  showResult.value = true;

  const initiator = initiatorName.value || '<user>';
  const content = `<meta:检定结果>
【AIDM防守检定】

🎲 判定过程：
・D20投骰：${rollTotal}
・敏捷/感知属性加成：${attrMod}
・掌握加成：已含于敌方DC中
・装备闪避加值：${dodgeMod}
・最终值：${finalValue}

📊 DC对比：${finalValue} ${isDodge ? '≥' : '<'} ${finalDC}
（敌方等级${levelName}级，基础DC ${worldBaseDC}，敌方属性加成${enemyAttrMod}，敌方掌握加成${masteryBonus}）
${isDodge ? '✅ 闪避成功！' : '❌ 被击中！'}

⚔️ 被击中伤害：
・敌方攻击力：${enemyAtkPower}
・我方防御：${myDefense}
・伤害减免：${Math.round(damageReduction * 100)}%
・承受伤害：${baseDamage}
</meta:检定结果>`;
  await sendToTextarea(content);

  addCheckEntry(lastResult.value, { initiatorName: initiator });
}

function quickRoll(type: 'normal' | 'advantage' | 'disadvantage'): void {
  if (isRolling.value) return;

  let modifierValue = 0;
  if (type === 'advantage') {
    modifierValue = 5;
  } else if (type === 'disadvantage') {
    modifierValue = -5;
  }

  const currentModifier = modifier.value !== '' ? Number(modifier.value) : 0;
  modifier.value = currentModifier + modifierValue;

  handleRoll();
}

async function handleRoll(): Promise<void> {
  if (isRolling.value) return;
  isRolling.value = true;

  try {
    if (isCustomMode.value) {
      const expr = customDiceExpr.value || '1d20';
      const result = roll(expr);
      const total = result.total;
      const judgeMode = customJudgeMode.value;
      const target = customTargetValue.value !== '' ? Number(customTargetValue.value) : null;

      let isSuccess = true;
      let outcomeText = `掷出 ${total}`;

      if (judgeMode !== 'none' && target !== null) {
        switch (judgeMode) {
          case '>=':
            isSuccess = total >= target;
            break;
          case '<=':
            isSuccess = total <= target;
            break;
          case '>':
            isSuccess = total > target;
            break;
          case '<':
            isSuccess = total < target;
            break;
        }
        outcomeText = isSuccess ? '成功' : '失败';
      }

      lastResult.value = {
        success: isSuccess,
        roll: total,
        total: total,
        target: target || 0,
        margin: target ? total - target : 0,
        criticalSuccess: false,
        criticalFailure: false,
        outcome: outcomeText,
        message: `${expr} = ${result.breakdown}`,
        diceType: expr,
        presetId: '__custom__',
      };
      showResult.value = true;

      const content = `<meta:检定结果>\n元叙事：${initiatorName.value || '<user>'}发起了自定义掷骰【${expr}】，掷出${total}${target !== null ? `，${judgeMode}${target}` : ''}，【${outcomeText}】\n</meta:检定结果>`;
      await sendToTextarea(content);
      return;
    }

    switch (checkMode.value) {
      case 'standard':
        await handleStandardCheck();
        break;
      case 'contest':
        await handleContestCheck();
        break;
      case 'combat':
        await handleCombatCheck();
        break;
      case 'defense':
        await handleDefenseCheck();
        break;
      case 'initiative':
        await handleInitiativeCheck();
        break;
      case 'escape':
        await handleEscapeCheck();
        break;
    }
  } catch (e) {
    console.error('[DicePanel] 掷骰失败:', e);
  } finally {
    isRolling.value = false;
  }
}

async function sendToTextarea(content: string) {
  try {
    let win: Window = window;
    try {
      while (win.parent && win.parent !== win) {
        win = win.parent;
      }
    } catch {}

    const $ = (win as any).jQuery;
    if (!$) return;

    const textarea = $('#send_textarea');
    if (textarea.length === 0) return;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

    if (nativeInputValueSetter) {
      const currentText = textarea.val() || '';
      const newText = currentText ? `${currentText}\n${content}` : content;
      nativeInputValueSetter.call(textarea[0], newText);
      textarea[0].dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const currentText = textarea.val() || '';
      const newText = currentText ? `${currentText}\n${content}` : content;
      textarea.val(newText);
      textarea.trigger('input');
    }

    textarea.focus();
  } catch (e) {
    console.warn('[DicePanel] 发送到输入框失败:', e);
  }
}

function handleRetry() {
  handleRoll();
}

function showHistory() {
  window.dispatchEvent(new CustomEvent('acu-show-dice-history'));
}

function switchToOpposed() {
  emit('switchToOpposed');
}

function openSettings() {
  window.dispatchEvent(new CustomEvent('acu-show-preset-manager'));
}

watch(worldLevel, () => {
  if (targetValue.value === '' || targetValue.value === String(getBaseDC('F级')) || 
      targetValue.value === String(getBaseDC('E级')) || targetValue.value === String(getBaseDC('D级')) ||
      targetValue.value === String(getBaseDC('C级')) || targetValue.value === String(getBaseDC('B级')) ||
      targetValue.value === String(getBaseDC('A级')) || targetValue.value === String(getBaseDC('S级')) ||
      targetValue.value === String(getBaseDC('SS级')) || targetValue.value === String(getBaseDC('SSS级'))) {
    targetValue.value = '';
  }
});

watch(difficulty, () => {
  if (targetValue.value === '') {
    targetValue.value = '';
  }
});

const SAVE_KEY = 'aidm_save_slots';

interface SaveSlot {
  id: number;
  timestamp: string;
  data: SaveData;
}

interface SaveData {
  playerName: string;
  level: string;
  attrs: Record<string, number>;
  combat: CombatState;
  equipment: EquipmentSlot;
  statuses: StatusEffect[];
  worldName: string;
  location: string;
}

const saveSlots = ref<SaveSlot[]>([]);
const exportText = ref('');
const importText = ref('');
const activeToolTab = ref('world');

function findSaveSlot(id: number): SaveSlot | undefined {
  return saveSlots.value.find(s => s.id === id);
}

function loadSaveSlots(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      saveSlots.value = JSON.parse(raw);
    } else {
      saveSlots.value = [];
    }
  } catch {
    saveSlots.value = [];
  }
}

function persistSaveSlots(): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveSlots.value));
}

function saveGame(slotId: number): void {
  if (saveSlots.value.length >= 3) {
    if (!confirm(`已有3个存档，覆盖存档位${slotId}？`)) return;
  }

  const charName = currentCharacter.value;
  const char = characters.value.find(c => c.name === charName);
  const attrs: Record<string, number> = {};
  if (char) {
    Object.entries(char.attributes).forEach(([k, v]) => { attrs[k] = v; });
  }

  const saveData: SaveData = {
    playerName: initiatorName.value || '冒险者',
    level: worldLevel.value,
    attrs,
    combat: { ...combat.value },
    equipment: { ...equipment.value },
    statuses: (activeStatuses.value as StatusEffect[]).map((s: StatusEffect) => ({ ...s })),
    worldName: combat.value.enemyName || '',
    location: '未知',
  };

  const existingIdx = saveSlots.value.findIndex(s => s.id === slotId);
  const slot: SaveSlot = {
    id: slotId,
    timestamp: new Date().toLocaleString(),
    data: saveData,
  };

  if (existingIdx >= 0) {
    saveSlots.value[existingIdx] = slot;
  } else {
    saveSlots.value.push(slot);
  }

  persistSaveSlots();
}

function loadGame(slotId: number): boolean {
  const slot = saveSlots.value.find(s => s.id === slotId);
  if (!slot) return false;

  const d = slot.data;
  initiatorName.value = d.playerName;
  worldLevel.value = d.level;
  combat.value = { ...d.combat };
  equipment.value = { ...d.equipment };
  activeStatuses.value = d.statuses.map(s => ({ ...s }));

  return true;
}

function exportSave(): void {
  const spv = getSPV(worldLevel.value);
  const charName = currentCharacter.value;
  const char = characters.value.find(c => c.name === charName);
  const stats = char
    ? deriveCombatStats(char.attributes, worldLevel.value)
    : { physAtk: 0, magicAtk: 0, physDef: 0, magicDef: 0, hp: 0, ddc: 10, critRate: 10 };

  exportText.value = `═════════════════════════════════
【轮回者存档】
═════════════════════════════════

【角色信息】
名称：${initiatorName.value || '冒险者'}
等级：${worldLevel.value}

【战斗属性】
HP：${combat.value.playerCurrentHP}/${combat.value.playerMaxHP}
护盾：${combat.value.playerShield}
物攻：${stats.physAtk + equipment.value.physDmg} | 法攻：${stats.magicAtk + equipment.value.magicDmg}
物防：${stats.physDef + equipment.value.physDef} | 法防：${stats.magicDef + equipment.value.magicDef}
DDC：${stats.ddc} | 暴击率：${stats.critRate}%

${(activeStatuses.value as StatusEffect[]).length > 0 ? `【状态效果】\n${(activeStatuses.value as StatusEffect[]).map((s: StatusEffect) => `・${s.name}(${s.type}) ${s.intensity} 剩余${s.remainingRounds}回合`).join('\n')}` : ''}

${combat.value.active ? `【战斗中】第${combat.value.round}回合 | 敌人:${combat.value.enemyName} HP:${combat.value.enemyCurrentHP}/${combat.value.enemyMaxHP}` : ''}
═════════════════════════════════`;
}

function importSave(): boolean {
  const text = importText.value.trim();
  if (!text.includes('轮回者存档')) {
    alert('存档格式无效：未检测到存档标识');
    return false;
  }
  alert('存档导入成功！（演示模式：请手动恢复各项数值）');
  return true;
}

const WORLD_TYPES = ['恐怖', '科幻', '奇幻', '武侠', '仙侠', '末世', '其他'];
const WORLD_TIER_ROLL_MAP: [number, string][] = [
  [14, '同等级'], [16, '低1级'], [18, '高1级'], [19, '低2级'], [20, '高2级'],
];

interface GeneratedWorld {
  name: string;
  tier: string;
  type: string;
  difficulty: number;
  description: string;
}

const generatedWorlds = ref<GeneratedWorld[]>([]);

function generateWorlds(): void {
  const count = roll('1d3+2').total;
  const worlds: GeneratedWorld[] = [];

  for (let i = 0; i < count; i++) {
    const tierRoll = roll('1d20').total;
    let tierOffset = '同等级';
    for (const [threshold, label] of WORLD_TIER_ROLL_MAP) {
      if (tierRoll <= threshold) { tierOffset = label; break; }
    }

    const type = WORLD_TYPES[Math.floor(Math.random() * WORLD_TYPES.length)];
    const difficulty = Math.ceil(Math.random() * 5);

    const descriptions: Record<string, string[]> = {
      恐怖: ['生化危机爆发', '诅咒之地', '寂静岭迷雾', '丧尸围城'],
      科幻: ['赛博朋克都市', '星际殖民地', '时间裂缝', 'AI叛乱'],
      奇幻: ['魔法学院', '龙之巢穴', '精灵森林', '地下城迷宫'],
      武侠: ['江湖门派纷争', '武林大会', '秘境寻宝', '魔教崛起'],
      仙侠: ['修仙宗门', '天劫降临', '仙界试炼', '妖兽横行'],
      末世: ['废土求生', '辐射废墟', '变异生物巢穴', '资源争夺战'],
      其他: ['异世界穿越', '梦境维度', '虚空裂隙', '元素领域'],
    };

    const descPool = descriptions[type] || descriptions['其他'];
    worlds.push({
      name: `${type}世界-${i + 1}`,
      tier: tierOffset,
      type,
      difficulty,
      description: descPool[Math.floor(Math.random() * descPool.length)],
    });
  }

  generatedWorlds.value = worlds;
}

const ACTIVE_SKILL_POOL = [
  { name: '物伤增幅', effect: '造成物理伤害时额外附加固定伤害' },
  { name: '法伤增幅', effect: '造成法术伤害时额外附加固定伤害' },
  { name: '体质治疗', effect: '恢复固定HP' },
  { name: '智力治疗', effect: '恢复固定HP（智力修正）' },
  { name: '力量吸血', effect: '物理伤害时恢复HP' },
  { name: '智力吸血', effect: '法术伤害时恢复HP' },
  { name: '生命护盾', effect: '获得固定护盾值' },
];

const PASSIVE_SKILL_POOL = [
  { name: '属性增强', effect: '固定增加某属性' },
  { name: '物理伤害', effect: '固定增加物理伤害值' },
  { name: '法术伤害', effect: '固定增加法术伤害值' },
  { name: '物理防御', effect: '固定增加物理防御' },
  { name: '法术防御', effect: '固定增加法术防御' },
  { name: 'HP加成', effect: '固定增加最大HP' },
];

interface GeneratedSkill {
  name: string;
  type: '主动' | '被动';
  effect: string;
  spvValue: number;
}

const generatedSkills = ref<GeneratedSkill[]>([]);
const skillGenLevel = ref<string>('C级');

function generateSkills(): void {
  const spv = getSPV(skillGenLevel.value);
  const skills: GeneratedSkill[] = [];
  const isCombat = Math.random() < 0.75;

  if (isCombat) {
    const activeCount = roll('1d2+1').total;
    for (let i = 0; i < activeCount; i++) {
      const entry = ACTIVE_SKILL_POOL[Math.floor(Math.random() * ACTIVE_SKILL_POOL.length)];
      skills.push({ ...entry, type: '主动', spvValue: Math.floor(spv * (Math.random() * 0.5 + 0.8)) });
    }

    const passiveCount = roll('1d2').total;
    for (let i = 0; i < passiveCount; i++) {
      const entry = PASSIVE_SKILL_POOL[Math.floor(Math.random() * PASSIVE_SKILL_POOL.length)];
      skills.push({ ...entry, type: '被动', spvValue: Math.floor(spv * (Math.random() * 0.3 + 0.3)) });
    }
  } else {
    skills.push({
      name: ['开锁精通', '快速阅读', '驯兽术', '伪装潜行'][Math.floor(Math.random() * 4)],
      type: '主动',
      effect: '特殊辅助技能',
      spvValue: Math.floor(spv * 0.8),
    });
  }

  generatedSkills.value = skills;
}

provide('aidmInitiatorName', initiatorName);
provide('aidmWorldLevel', worldLevel);
provide('aidmEquipment', equipment);
provide('aidmCurrentCharacter', currentCharacter);

loadSaveSlots();

onMounted(() => {
  initDiceSystem();
  loadPresets();
});
</script>

<template>
  <div class="acu-dice-panel">
    <div class="acu-dice-panel-header">
      <div class="acu-dice-panel-title">
        <i :class="CHECK_MODES.find(m => m.id === checkMode)?.icon || 'fa-solid fa-dice-d20'"></i>
        {{ CHECK_MODES.find(m => m.id === checkMode)?.name || '检定' }}
      </div>
      <div class="acu-dice-panel-actions">
        <button title="历史记录" @click="showHistory"><i class="fa-solid fa-history"></i></button>
        <button title="系统设置" @click="openSettings"><i class="fa-solid fa-cog"></i></button>
        <button @click="emit('close')"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-dice-panel-body">
      <div class="acu-mode-selector">
        <div class="acu-primary-modes">
          <button
            v-for="m in CHECK_MODES.slice(0, 3)"
            :key="m.id"
            class="acu-mode-btn"
            :class="{ active: checkMode === m.id }"
            :title="m.description"
            @click="selectCheckMode(m.id as CheckMode)"
          >
            <i :class="m.icon"></i>
            <span>{{ m.name }}</span>
          </button>
        </div>
        <div class="acu-more-modes">
          <button 
            class="acu-mode-btn more" 
            :class="{ active: ['defense', 'initiative', 'escape'].includes(checkMode) }"
            @click="showMoreModes = !showMoreModes"
          >
            <span>更多</span>
            <i :class="showMoreModes ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
          </button>
          <div v-if="showMoreModes" class="acu-mode-dropdown">
            <button
              v-for="m in CHECK_MODES.slice(3)"
              :key="m.id"
              class="acu-mode-dropdown-item"
              :class="{ active: checkMode === m.id }"
              :title="m.description"
              @click="selectCheckMode(m.id as CheckMode); showMoreModes = false"
            >
              <i :class="m.icon"></i>
              <span>{{ m.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="acu-dual-column">
        <div class="acu-quick-panel">
          <div class="acu-section-card">
            <div class="acu-card-header">
              <span class="acu-card-title"><i class="fa-solid fa-globe"></i> 世界设定</span>
            </div>
            <div v-if="!isCustomMode" class="acu-dice-form-row cols-1">
              <div class="acu-dice-field">
                <div class="acu-dice-form-label">世界等级</div>
                <select v-model="worldLevel" class="acu-dice-select">
                  <option v-for="level in WORLD_LEVELS" :key="level" :value="level">
                    {{ level }} (DC {{ WORLD_LEVEL_CONFIG[level].baseDC }})
                  </option>
                </select>
              </div>
              <div class="acu-dice-field">
                <div class="acu-dice-form-label">难度</div>
                <select v-model="difficulty" class="acu-dice-select">
                  <option v-for="d in DIFFICULTY_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}</option>
                </select>
              </div>
            </div>
            <div class="acu-quick-actions">
              <button class="acu-quick-action-btn" title="普通检定" @click="quickRoll('normal')">
                <i class="fa-solid fa-dice"></i>
                <span>普通</span>
              </button>
              <button class="acu-quick-action-btn advantage" title="优势检定" @click="quickRoll('advantage')">
                <i class="fa-solid fa-arrow-up"></i>
                <span>优势</span>
              </button>
              <button class="acu-quick-action-btn disadvantage" title="劣势检定" @click="quickRoll('disadvantage')">
                <i class="fa-solid fa-arrow-down"></i>
                <span>劣势</span>
              </button>
            </div>
          </div>

          <div class="acu-section-card">
            <div class="acu-card-header">
              <span class="acu-card-title"><i class="fa-solid fa-users"></i> 角色快捷</span>
            </div>
            <div class="acu-dice-char-buttons">
              <button
                v-for="c in characters.slice(0, 6)"
                :key="c.name"
                class="acu-dice-char-btn"
                :class="{ active: currentCharacter === c.name }"
                @click="handleSelectCharacter(c.name)"
              >
                {{ c.name.length > 4 ? c.name.slice(0, 4) + '..' : c.name }}
              </button>
              <div v-if="characters.length === 0" class="acu-dice-empty-hint">无角色数据</div>
            </div>
          </div>

          <div v-if="attributeButtons.length > 0 && !isCustomMode" class="acu-section-card">
            <div class="acu-card-header">
              <span class="acu-card-title"><i class="fa-solid fa-chart-bar"></i> 属性快捷</span>
            </div>
            <div class="acu-dice-quick-compact">
              <button
                v-for="a in attributeButtons.slice(0, 6)"
                :key="a.name"
                class="acu-stat-chip"
                :class="{ active: attrName === a.name }"
                @click="handleSelectAttribute(a)"
              >
                <span class="label">{{ a.name }}</span>
                <span class="val">{{ a.value }}</span>
                <span class="mod">{{ computeAIDMAttrMod(a.value) >= 0 ? '+' : '' }}{{ computeAIDMAttrMod(a.value) }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="acu-config-panel">
          <div v-if="checkMode === 'standard' && !isCustomMode" class="acu-section-card">
            <div class="acu-card-header">
              <span class="acu-card-title"><i class="fa-solid fa-dice-d20"></i> 检定配置</span>
            </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input v-model="initiatorName" type="text" class="acu-dice-input" placeholder="<user>" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>属性名</span>
              <button class="acu-random-skill-btn" title="随机技能" @click="randomSkill">
                <i class="fa-solid fa-dice"></i>
              </button>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="attrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="自由检定"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">属性值</div>
            <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">目标DC</div>
            <input
              v-model="targetValue"
              type="text"
              class="acu-dice-input"
              :placeholder="`留空=${getBaseDC(worldLevel) + (DIFFICULTY_MOD[difficulty] || 0)}`"
            />
          </div>
          <div>
            <div class="acu-dice-form-label centered">难度调整</div>
            <select v-model="difficulty" class="acu-dice-select">
              <option v-for="o in DIFFICULTY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <div class="acu-dice-form-label">修正值</div>
            <input v-model="modifier" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>

        <div class="acu-calc-preview">
          <div class="acu-calc-formula">
            <span class="acu-calc-dice">1d20</span>
            <span class="acu-calc-plus">+</span>
            <span class="acu-calc-mod">{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}</span>
            <span class="acu-calc-plus">+</span>
            <span class="acu-calc-mastery">{{ getMasteryBonus(worldLevel) }}</span>
            <span v-if="modifier !== '' && Number(modifier) !== 0">
              <span class="acu-calc-plus">{{ Number(modifier) >= 0 ? '+' : '' }}</span>
              <span class="acu-calc-bonus">{{ modifier }}</span>
            </span>
            <span class="acu-calc-vs">vs</span>
            <span class="acu-calc-dc">DC {{ targetValue !== '' ? targetValue : getBaseDC(worldLevel) + (DIFFICULTY_MOD[difficulty] || 0) }}</span>
          </div>
          <div class="acu-calc-hint">
            <span v-if="attrName">{{ attrName }}</span>
            <span v-else>自由检定</span>
            <span class="acu-calc-sep">|</span>
            <span>{{ difficulty }}难度</span>
          </div>
        </div>

        <div class="acu-info-cards">
          <div class="acu-info-card">
            <div class="label">属性加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
              {{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">掌握加成</div>
            <div class="value positive">+{{ getMasteryBonus(worldLevel) }}</div>
          </div>
          <div class="acu-info-card">
            <div class="label">最终DC</div>
            <div class="value">{{ getBaseDC(worldLevel) + (DIFFICULTY_MOD[difficulty] || 0) }}</div>
          </div>
        </div>
          </div>
        </div>
      </div>

      <div v-if="checkMode === 'contest' && !isCustomMode" class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-dice-d20"></i> 对抗检定</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input v-model="initiatorName" type="text" class="acu-dice-input" placeholder="<user>" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>己方属性名</span>
              <button class="acu-random-skill-btn" title="随机技能" @click="randomSkill">
                <i class="fa-solid fa-dice"></i>
              </button>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="attrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="自由检定"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">己方属性值</div>
            <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>对方属性名</span>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="oppAttrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="对方属性"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectOpponentAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">对方属性值</div>
            <input v-model="oppAttr" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">对方投骰值</div>
            <input v-model="oppRoll" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-dice-section-title" style="margin-top: 8px;">
          <span><i class="fa-solid fa-plus-minus"></i> 优势/劣势调整</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div>
            <div class="acu-dice-form-label">环境优势</div>
            <input v-model="envAdvantage" type="text" class="acu-dice-input" placeholder="0" />
          </div>
          <div>
            <div class="acu-dice-form-label">环境劣势</div>
            <input v-model="envDisadvantage" type="text" class="acu-dice-input" placeholder="0" />
          </div>
          <div>
            <div class="acu-dice-form-label">状态优势</div>
            <input v-model="statusAdvantage" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div>
            <div class="acu-dice-form-label">状态劣势</div>
            <input v-model="statusDisadvantage" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>

        <div class="acu-info-cards">
          <div class="acu-info-card">
            <div class="label">己方加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
              {{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">对方加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(oppAttr !== '' ? Number(oppAttr) : 10) > 0 }">
              {{ computeAIDMAttrMod(oppAttr !== '' ? Number(oppAttr) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(oppAttr !== '' ? Number(oppAttr) : 10) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="checkMode === 'combat' && !isCustomMode" class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-sword"></i> 战斗检定</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input v-model="initiatorName" type="text" class="acu-dice-input" placeholder="<user>" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>攻击属性名</span>
              <button class="acu-random-skill-btn" title="随机技能" @click="randomSkill">
                <i class="fa-solid fa-dice"></i>
              </button>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="attrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="力量/敏捷"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">攻击属性值</div>
            <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">攻击类型</div>
            <select v-model="attackType" class="acu-dice-select">
              <option v-for="o in ATTACK_TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div>
            <div class="acu-dice-form-label">攻击力</div>
            <input v-model="attackPower" type="text" class="acu-dice-input" placeholder="10" />
          </div>
          <div>
            <div class="acu-dice-form-label">目标防御</div>
            <input v-model="targetDefense" type="text" class="acu-dice-input" placeholder="5" />
          </div>
        </div>

        <div class="acu-dice-form-row cols-3">
          <div>
            <div class="acu-dice-form-label">魅力值</div>
            <input v-model="charisma" type="text" class="acu-dice-input" placeholder="10" />
          </div>
          <div>
            <div class="acu-dice-form-label">修正值</div>
            <input v-model="modifier" type="text" class="acu-dice-input" placeholder="0" />
          </div>
          <div>
            <div class="acu-dice-form-label">目标闪避加值</div>
            <input v-model="targetDodgeMod" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>

        <div class="acu-info-cards">
          <div class="acu-info-card">
            <div class="label">属性加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
              {{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">暴击率</div>
            <div class="value positive">{{ computeCritRate(charisma !== '' ? Number(charisma) : 10) }}%</div>
          </div>
          <div class="acu-info-card">
            <div class="label">目标DDC</div>
            <div class="value">{{ getBaseDC(worldLevel) + (targetDodgeMod !== '' ? Number(targetDodgeMod) : 0) }}</div>
          </div>
        </div>
      </div>

      <div v-if="checkMode === 'defense' && !isCustomMode" class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-shield-halved"></i> 防御检定</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>闪避属性名</span>
              <button class="acu-random-skill-btn" title="随机技能" @click="randomSkill">
                <i class="fa-solid fa-dice"></i>
              </button>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="attrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="敏捷/感知"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">闪避属性值</div>
            <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="敏捷/感知取高" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">闪避加值</div>
            <input v-model="modifier" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>

        <div class="acu-dice-form-row cols-3">
          <div>
            <div class="acu-dice-form-label">敌方攻击修正</div>
            <input v-model="enemyAtkMod" type="text" class="acu-dice-input" placeholder="0" />
          </div>
          <div>
            <div class="acu-dice-form-label">敌方攻击力</div>
            <input v-model="enemyAttackPower" type="text" class="acu-dice-input" placeholder="10" />
          </div>
          <div>
            <div class="acu-dice-form-label">我方防御</div>
            <input v-model="playerDefense" type="text" class="acu-dice-input" placeholder="5" />
          </div>
        </div>

        <div class="acu-info-cards">
          <div class="acu-info-card">
            <div class="label">属性加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
              {{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">掌握加成</div>
            <div class="value positive">+{{ getMasteryBonus(worldLevel) }}</div>
          </div>
          <div class="acu-info-card">
            <div class="label">闪避DC</div>
            <div class="value">{{ getBaseDC(worldLevel) + (enemyAtkMod !== '' ? Number(enemyAtkMod) : 0) }}</div>
          </div>
        </div>
      </div>

      <div v-if="checkMode === 'initiative' && !isCustomMode" class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-bolt"></i> 先攻检定</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input v-model="initiatorName" type="text" class="acu-dice-input" placeholder="<user>" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>己方敏捷属性</span>
              <button class="acu-random-skill-btn" title="随机技能" @click="randomSkill">
                <i class="fa-solid fa-dice"></i>
              </button>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="attrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="敏捷"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">己方敏捷值</div>
            <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>对方敏捷属性</span>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="oppAttrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="敏捷"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectOpponentAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">对方敏捷值</div>
            <input v-model="oppAgility" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-info-cards">
          <div class="acu-info-card">
            <div class="label">己方敏捷加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
              {{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">对方敏捷加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(oppAgility !== '' ? Number(oppAgility) : 10) > 0 }">
              {{ computeAIDMAttrMod(oppAgility !== '' ? Number(oppAgility) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(oppAgility !== '' ? Number(oppAgility) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">双方敏捷差</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > computeAIDMAttrMod(oppAgility !== '' ? Number(oppAgility) : 10), negative: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) < computeAIDMAttrMod(oppAgility !== '' ? Number(oppAgility) : 10) }">
              {{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) - computeAIDMAttrMod(oppAgility !== '' ? Number(oppAgility) : 10) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="checkMode === 'escape' && !isCustomMode" class="acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-person-running"></i> 逃跑检定</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input v-model="initiatorName" type="text" class="acu-dice-input" placeholder="<user>" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">
              <span>敏捷属性名</span>
              <button class="acu-random-skill-btn" title="随机技能" @click="randomSkill">
                <i class="fa-solid fa-dice"></i>
              </button>
            </div>
            <div class="acu-dice-input-wrapper">
              <input 
                v-model="attrName" 
                type="text" 
                class="acu-dice-input" 
                placeholder="敏捷"
                @focus="attrDropdown.update(attributeButtons)"
                @blur="attrDropdown.close()"
              />
              <div v-if="attrDropdown.isOpen.value" class="acu-dropdown-suggestions">
                <div 
                  v-for="a in attrDropdown.suggestions.value" 
                  :key="a.name"
                  class="acu-dropdown-item"
                  @mousedown.prevent="handleSelectAttribute(a)"
                >
                  <span class="acu-dropdown-label">{{ a.name }}</span>
                  <span class="acu-dropdown-value">{{ a.value }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">己方敏捷值</div>
            <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="留空=10" />
          </div>
        </div>

        <div class="acu-dice-form-row cols-3">
          <div>
            <div class="acu-dice-form-label centered">逃跑场景</div>
            <select v-model="escapeType" class="acu-dice-select">
              <option value="solo">单对单</option>
              <option value="surrounded">被包围</option>
              <option value="obstacle">有障碍物掩护</option>
            </select>
          </div>
          <div>
            <div class="acu-dice-form-label">修正值</div>
            <input v-model="modifier" type="text" class="acu-dice-input" placeholder="0" />
          </div>
          <div v-if="escapeType !== 'solo'">
            <div class="acu-dice-form-label">敌方敏捷</div>
            <input v-model="escapeEnemyAgility" type="text" class="acu-dice-input" placeholder="0（影响DC）" />
          </div>
        </div>

        <div v-if="escapeType !== 'solo'" class="acu-dice-form-row cols-3">
          <div class="acu-dice-field" v-if="escapeType === 'surrounded'">
            <div class="acu-dice-form-label">敌人数量</div>
            <input v-model="escapeEnemyCount" type="text" class="acu-dice-input" placeholder="1" />
          </div>
          <div class="acu-dice-field" v-if="escapeType === 'obstacle'">
            <div class="acu-dice-form-label">环境修正</div>
            <input v-model="escapeObstacleMod" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>

        <div class="acu-info-cards">
          <div class="acu-info-card">
            <div class="label">敏捷加成</div>
            <div class="value" :class="{ positive: computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 }">
              {{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) > 0 ? '+' : '' }}{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}
            </div>
          </div>
          <div class="acu-info-card">
            <div class="label">场景DC</div>
            <div class="value">{{
              escapeType === 'solo'
                ? 10
                : (escapeType === 'surrounded'
                  ? (10 + (escapeEnemyAgility !== '' ? computeAIDMAttrMod(Number(escapeEnemyAgility)) : 0) + (escapeEnemyCount !== '' ? Number(escapeEnemyCount) * 2 : 2))
                  : (10 + (escapeEnemyAgility !== '' ? computeAIDMAttrMod(Number(escapeEnemyAgility)) : 0) + (escapeObstacleMod !== '' ? Number(escapeObstacleMod) : 0)))
            }}</div>
          </div>
        </div>
      </div>

      <div class="acu-equipment-panel acu-section-card" v-if="!isCustomMode && (checkMode === 'combat' || checkMode === 'defense')">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-shield-halved"></i> 装备</span>
        </div>
        <div class="acu-dice-form-row cols-4">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">物伤加成</div>
            <input v-model.number="equipment.physDmg" type="number" class="acu-dice-input" placeholder="0" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">法伤加成</div>
            <input v-model.number="equipment.magicDmg" type="number" class="acu-dice-input" placeholder="0" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">物防加成</div>
            <input v-model.number="equipment.physDef" type="number" class="acu-dice-input" placeholder="0" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">法防加成</div>
            <input v-model.number="equipment.magicDef" type="number" class="acu-dice-input" placeholder="0" />
          </div>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">HP加成</div>
            <input v-model.number="equipment.hpBonus" type="number" class="acu-dice-input" placeholder="0" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">闪避加值</div>
            <input v-model.number="equipment.dodgeBonus" type="number" class="acu-dice-input" placeholder="0" />
          </div>
        </div>
      </div>

      <div class="acu-combat-manager acu-section-card" v-if="!isCustomMode && (checkMode === 'combat' || checkMode === 'defense' || checkMode === 'initiative')">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-swords"></i> 战斗管理器</span>
          <template v-if="!combat.active">
            <button class="acu-tiny-btn accent" @click="startCombat" title="开始战斗">⚔️ 开始</button>
          </template>
          <template v-else>
            <span class="acu-combat-round-badge">第{{ combat.round }}回合</span>
            <button class="acu-tiny-btn" @click="nextRound" title="下一回合">⏭️ 下一回合</button>
            <button class="acu-tiny-btn danger" @click="endCombat" title="结束战斗">🏳️ 结束</button>
          </template>
        </div>

        <template v-if="combat.active">
          <div class="acu-combat-bars">
            <div class="acu-combat-bar-group">
              <div class="acu-combat-bar-label">👤 {{ initiatorName || '玩家' }}</div>
              <div class="acu-hp-bar">
                <div class="acu-hp-fill player" :style="{ width: (combat.playerCurrentHP / combat.playerMaxHP * 100) + '%' }"></div>
              </div>
              <span class="acu-hp-text">{{ combat.playerCurrentHP }}/{{ combat.playerMaxHP }}
                <span v-if="combat.playerShield > 0" class="acu-shield-text"> 🛡️{{ combat.playerShield }}</span>
              </span>
            </div>
            <div class="acu-combat-bar-group">
              <div class="acu-combat-bar-label">👹 {{ combat.enemyName || '敌人' }}</div>
              <div class="acu-hp-bar enemy">
                <div class="acu-hp-fill enemy" :style="{ width: (combat.enemyCurrentHP / combat.enemyMaxHP * 100) + '%' }"></div>
              </div>
              <span class="acu-hp-text">{{ combat.enemyCurrentHP }}/{{ combat.enemyMaxHP }}</span>
            </div>
          </div>

          <div class="acu-combat-enemy-setup" style="margin-top:4px;">
            <div class="acu-dice-form-row cols-2">
              <div class="acu-dice-field">
                <div class="acu-dice-form-label">敌人名称</div>
                <input v-model="combat.enemyName" type="text" class="acu-dice-input" placeholder="敌人名称" />
              </div>
              <div class="acu-dice-field">
                <div class="acu-dice-form-label">敌人最大HP</div>
                <input v-model.number="combat.enemyMaxHP" type="number" class="acu-dice-input" placeholder="100" />
              </div>
            </div>
          </div>

          <div v-if="combat.round >= 6" class="acu-env-erosion">
            ⚠️ 环境侵蚀生效！每回合承受 {{ Math.floor(combat.playerMaxHP * 0.05) }} 点真实伤害
          </div>
        </template>
        <div v-else class="acu-empty-hint">点击「开始」进入战斗模式追踪回合与HP</div>
      </div>

      <div v-if="isCustomMode" class="acu-dice-custom-area acu-section-card">
        <div class="acu-card-header">
          <span class="acu-card-title"><i class="fa-solid fa-wand-magic-sparkles"></i> 自定义骰子</span>
        </div>
        <div class="acu-dice-form-row cols-3">
          <div>
            <div class="acu-dice-form-label">骰子语法</div>
            <input v-model="customDiceExpr" type="text" class="acu-dice-input" placeholder="1d100" />
          </div>
          <div>
            <div class="acu-dice-form-label">成功条件</div>
            <select v-model="customJudgeMode" class="acu-dice-select">
              <option v-for="opt in JUDGE_MODE_OPTIONS" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
            </select>
          </div>
          <div>
            <div class="acu-dice-form-label">目标值</div>
            <input v-model="customTargetValue" type="text" class="acu-dice-input" placeholder="留空=无判定" />
          </div>
        </div>
      </div>

      <button class="acu-dice-roll-btn" :disabled="isRolling" @click="handleRoll">
        <template v-if="showResult && lastResult">
          <span class="acu-dice-result-value" :class="{ success: lastResult.success, failure: !lastResult.success }">{{
            lastResult.total
          }}</span>
          <span class="acu-dice-result-badge" :class="{ success: lastResult.success, failure: !lastResult.success }">{{
            lastResult.outcome
          }}</span>
          <button class="acu-dice-retry-btn" title="重新投骰" @click.stop="handleRetry">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
        </template>
        <template v-else>
          <i class="fa-solid fa-dice" :class="{ 'fa-spin': isRolling }"></i>
          <span>{{ isRolling ? '掷骰中...' : '掷骰！' }}</span>
        </template>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-dice-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.acu-dice-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
}

.acu-dice-panel-title {
  font-weight: 800;
  color: var(--acu-text-main);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    color: var(--acu-accent);
  }
}

.acu-dice-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;

  button {
    background: none;
    border: none;
    color: var(--acu-text-sub);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    transition: all 0.2s;

    &:hover {
      color: var(--acu-accent);
    }
  }
}

.acu-dice-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
}

.acu-mode-selector {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.acu-primary-modes {
  display: flex;
  flex: 1;
  gap: 4px;
}

.acu-mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-sub);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  i {
    font-size: 14px;
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  &:hover {
    border-color: var(--acu-accent);
    color: var(--acu-accent);
  }

  &.active {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }

  &.more {
    flex: 0 0 auto;
    min-width: 60px;
    flex-direction: row;
    gap: 4px;
    padding: 8px 10px;

    i {
      font-size: 10px;
    }
  }
}

.acu-more-modes {
  position: relative;
}

.acu-mode-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 120px;
  overflow: hidden;
}

.acu-mode-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--acu-text-main);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;

  i {
    font-size: 14px;
    color: var(--acu-text-sub);
  }

  &:hover {
    background: var(--acu-accent-light);
    color: var(--acu-accent);

    i {
      color: var(--acu-accent);
    }
  }

  &.active {
    background: var(--acu-accent);
    color: white;

    i {
      color: white;
    }
  }
}

.acu-dice-quick-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-dice-section-title {
  font-size: 10px;
  font-weight: 900;
  color: var(--acu-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.acu-dice-quick-presets {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.acu-dice-quick-preset-btn {
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-btn);
  color: var(--acu-text-main);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--acu-accent);
  }

  &.active {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }
}

.acu-dice-char-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.acu-dice-char-btn {
  padding: 3px 10px;
  border-radius: 100px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--acu-accent);
  }

  &.active {
    border-color: var(--acu-accent);
    color: var(--acu-accent);
    background: var(--acu-accent-light);
  }
}

.acu-dice-empty-hint {
  font-size: 11px;
  color: var(--acu-text-sub);
  opacity: 0.6;
}

.acu-dice-form-row {
  display: grid;
  gap: 8px;

  &.cols-1 {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  &.cols-2 {
    grid-template-columns: 1fr 1fr;
  }
  &.cols-3 {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

.acu-dice-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.acu-dice-form-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--acu-text-sub);
  display: flex;
  justify-content: space-between;
  align-items: center;

  &.centered {
    justify-content: center;
  }
}

.acu-dice-input,
.acu-dice-select {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: var(--acu-accent);
  }
}

.acu-random-skill-btn {
  background: transparent;
  border: none;
  color: var(--acu-accent);
  cursor: pointer;
  padding: 0;
  font-size: 11px;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
}

.acu-dice-custom-area {
  margin-top: 4px;
  padding: 8px;
  background: var(--acu-bg-panel);
  border: 1px dashed var(--acu-border);
  border-radius: 6px;
}

.acu-dice-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--acu-accent-light);
  border-radius: 6px;
  border: 1px solid var(--acu-accent);
  margin-top: 2px;
}

.acu-dice-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.acu-dice-info-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--acu-text-sub);
}

.acu-dice-info-value {
  font-size: 12px;
  font-weight: 800;
  color: var(--acu-accent);
}

.acu-dice-quick-compact {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.acu-stat-chip {
  background: linear-gradient(135deg, var(--acu-bg-header), var(--acu-bg-panel));
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: transparent;
    transition: background 0.2s ease;
  }

  .label {
    font-size: 10px;
    font-weight: 600;
    color: var(--acu-text-sub);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    margin-bottom: 2px;
  }

  .val {
    font-size: 14px;
    font-weight: 900;
    color: var(--acu-accent);
  }

  .mod {
    font-size: 9px;
    font-weight: 700;
    color: var(--acu-success);
    margin-top: 1px;
  }

  &:hover {
    border-color: var(--acu-accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

    &::before {
      background: var(--acu-accent);
    }
  }

  &.active {
    background: linear-gradient(135deg, var(--acu-accent), color-mix(in srgb, var(--acu-accent) 80%, black));
    border-color: var(--acu-accent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    &::before {
      background: white;
    }

    .label,
    .val,
    .mod {
      color: white;
    }
  }
}

.acu-quick-label {
  font-size: 10px;
  color: var(--acu-text-sub);
  margin-bottom: 2px;
  font-weight: 500;
}

.acu-dice-roll-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--acu-accent), color-mix(in srgb, var(--acu-accent) 85%, black));
  color: white;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

    &::before {
      left: 100%;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  i {
    font-size: 18px;

    &.fa-spin {
      animation: spin 0.8s linear infinite;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse-success {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
}

@keyframes pulse-failure {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
}

.acu-dice-result-value {
  font-size: 22px;
  font-weight: 900;

  &.success {
    color: #2ecc71;
    text-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
  }
  &.failure {
    color: #e74c3c;
    text-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
  }
}

.acu-dice-result-badge {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.success {
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    color: white;
    box-shadow: 0 2px 8px rgba(46, 204, 113, 0.4);
  }

  &.failure {
    background: linear-gradient(135deg, #c0392b, #e74c3c);
    color: white;
    box-shadow: 0 2px 8px rgba(231, 76, 60, 0.4);
  }
}

.acu-dice-retry-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

.acu-tiny-btn {
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-sub);
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    border-color: var(--acu-accent);
    color: var(--acu-accent);
  }

  &.danger:hover {
    border-color: #e74c3c;
    color: #e74c3c;
  }
}

.acu-status-panel {
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  padding: 8px;

  .acu-section-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    color: var(--acu-text-sub);
    margin-bottom: 6px;
  }
}

.acu-status-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.acu-status-item {
  padding: 5px 8px;
  border-radius: 4px;
  border-left: 3px solid;
  font-size: 10px;

  &.status-buff { border-color: #27ae60; background: rgba(39, 174, 96, 0.08); }
  &.status-debuff { border-color: #e74c3c; background: rgba(231, 76, 60, 0.08); }
  &.status-dot { border-color: #f39c12; background: rgba(243, 156, 18, 0.08); }
  &.status-control { border-color: #9b59b6; background: rgba(155, 89, 182, 0.08); }
  &.status-shield { border-color: #3498db; background: rgba(52, 152, 219, 0.08); }
}

.acu-status-header {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.acu-status-name {
  font-weight: 700;
  color: var(--acu-text-main);
}

.acu-status-badge {
  font-size: 9px;
  padding: 0 4px;
  border-radius: 3px;

  &.weak { background: #95a5a6; color: white; }
  &.medium { background: #f39c12; color: white; }
  &.strong { background: #e74c3c; color: white; }
}

.acu-status-type {
  font-size: 9px;
  color: var(--acu-text-sub);
}

.acu-status-remove {
  margin-left: auto;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--acu-text-sub);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { color: #e74c3c; background: rgba(231, 76, 60, 0.15); }
}

.acu-status-detail {
  font-size: 9px;
  color: var(--acu-text-sub);
  margin-top: 2px;
  padding-left: 4px;
}

.acu-status-add {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px dashed var(--acu-border);

  .cols-5 {
    grid-template-columns: 1fr 70px 60px 50px 45px;
    gap: 3px;
  }

  .accent {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);

    &:hover { opacity: 0.85; }
  }
}

.acu-equipment-panel {
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  padding: 8px;
  margin-top: 4px;

  .cols-4 { grid-template-columns: repeat(4, 1fr); gap: 4px; }

  .cols-3 { grid-template-columns: repeat(3, 1fr); gap: 4px; }
}

.acu-combat-manager {
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  padding: 8px;
  margin-top: 4px;

  .acu-combat-round-badge {
    font-size: 11px;
    font-weight: 700;
    color: #f39c12;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(243, 156, 18, 0.15);
  }
}

.acu-combat-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.acu-combat-bar-group {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .acu-combat-bar-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--acu-text-main);
  }
}

.acu-hp-bar {
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(231, 76, 60, 0.2);
  position: relative;

  &.enemy { background: rgba(231, 76, 60, 0.15); }
}

.acu-hp-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;

  &.player { background: linear-gradient(90deg, #27ae60, #2ecc71); }
  &.enemy { background: linear-gradient(90deg, #c0392b, #e74c3c); }
}

.acu-hp-text {
  font-size: 9px;
  color: var(--acu-text-sub);
}

.acu-shield-text {
  color: #3498db;
  font-weight: 700;
}

.acu-env-erosion {
  margin-top: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  color: #e67e22;
  background: rgba(230, 126, 34, 0.1);
  border: 1px dashed rgba(230, 126, 34, 0.3);
}

.acu-tools-section {
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  padding: 6px;
  margin-top: 4px;
}

.acu-tools-tabs {
  display: flex;
  gap: 3px;
  margin-bottom: 6px;
}

.acu-tool-tab {
  flex: 1;
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-sub);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 11px; }

  &:hover { border-color: var(--acu-accent); color: var(--acu-accent); }
  &.active { background: var(--acu-accent); color: white; border-color: var(--acu-accent); }
}

.acu-tool-content {
  min-height: 40px;
}

.acu-world-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-world-item {
  padding: 5px 8px;
  border-radius: 5px;
  border-left: 3px solid #9b59b6;
  background: rgba(155, 89, 182, 0.06);
}

.acu-world-header {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 10px;
}

.acu-world-name { font-weight: 700; color: var(--acu-text-main); }

.acu-world-tier {
  font-size: 8px; padding: 1px 4px; border-radius: 3px;
  background: #95a5a6; color: white;
  &.high { background: #27ae60; }
  &.low { background: #e74c3c; }
}

.acu-world-type {
  font-size: 8px; padding: 1px 4px; border-radius: 3px;
  background: rgba(52, 152, 219, 0.2); color: #3498db;
}

.acu-world-diff { font-size: 9px; letter-spacing: -1px; }

.acu-world-desc {
  font-size: 9px; color: var(--acu-text-sub); margin-top: 2px;
  padding-left: 4px;
}

.acu-skill-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}

.acu-skill-item {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 9px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;

  &.active-skill {
    border-left: 3px solid #e67e22;
    background: rgba(230, 126, 34, 0.06);
  }

  &.passive-skill {
    border-left: 3px solid #3498db;
    background: rgba(52, 152, 219, 0.06);
  }
}

.acu-skill-badge {
  font-size: 7px; padding: 1px 4px; border-radius: 3px;
  font-weight: 700;

  .active-skill & { background: #e67e22; color: white; }
  .passive-skill & { background: #3498db; color: white; }
}

.acu-skill-name { font-weight: 700; color: var(--acu-text-main); }

.acu-skill-effect { color: var(--acu-text-sub); font-size: 8px; }

.acu-dice-input-wrapper {
  position: relative;
  width: 100%;
}

.acu-dropdown-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 2px;
}

.acu-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background: var(--acu-accent-light);
  }
}

.acu-dropdown-label {
  font-size: 12px;
  color: var(--acu-text-main);
  font-weight: 500;
}

.acu-dropdown-value {
  font-size: 11px;
  color: var(--acu-accent);
  font-weight: 600;
}

.acu-section-card {
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.acu-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--acu-accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--acu-border);

  i {
    margin-right: 4px;
  }
}

.acu-card-title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.acu-info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.acu-calc-preview {
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.08), rgba(155, 89, 182, 0.08));
  border: 1px solid rgba(52, 152, 219, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.acu-calc-formula {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 700;
}

.acu-calc-dice {
  color: #3498db;
  background: rgba(52, 152, 219, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.acu-calc-plus {
  color: var(--acu-text-sub);
  font-weight: 400;
}

.acu-calc-mod {
  color: var(--acu-success);
  background: rgba(46, 204, 113, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.acu-calc-mastery {
  color: #9b59b6;
  background: rgba(155, 89, 182, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.acu-calc-bonus {
  color: #f39c12;
  background: rgba(243, 156, 18, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.acu-calc-vs {
  color: var(--acu-text-sub);
  font-weight: 400;
  margin: 0 8px;
  font-style: italic;
}

.acu-calc-dc {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.acu-calc-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-calc-sep {
  color: var(--acu-border);
}

.acu-quick-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--acu-border);
}

.acu-quick-action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-sub);
  font-size: 9px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  i {
    font-size: 14px;
  }

  &:hover {
    border-color: var(--acu-accent);
    color: var(--acu-accent);
    transform: translateY(-1px);
  }

  &.advantage {
    &:hover {
      border-color: #27ae60;
      color: #27ae60;
      background: rgba(46, 204, 113, 0.1);
    }
  }

  &.disadvantage {
    &:hover {
      border-color: #e74c3c;
      color: #e74c3c;
      background: rgba(231, 76, 60, 0.1);
    }
  }
}

.acu-info-card {
  background: linear-gradient(135deg, var(--acu-bg-header), var(--acu-bg-panel));
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  padding: 8px 6px;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--acu-accent);
    transform: translateY(-1px);
  }

  .label {
    font-size: 9px;
    color: var(--acu-text-sub);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }

  .value {
    font-size: 16px;
    font-weight: 900;
    color: var(--acu-accent);

    &.positive {
      color: var(--acu-success);
    }

    &.negative {
      color: var(--acu-danger);
    }
  }
}

.acu-dual-column {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.acu-quick-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.acu-config-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.acu-config-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--acu-border);

  &:last-child {
    border-bottom: none;
  }
}

.acu-config-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--acu-text-sub);
  min-width: 60px;
}

.acu-config-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--acu-text-main);
}

@media (max-width: 768px) {
  .acu-dual-column {
    grid-template-columns: 1fr;
  }

  .acu-mode-selector {
    flex-wrap: wrap;
  }

  .acu-primary-modes {
    flex: 1 1 auto;
    min-width: 0;
  }

  .acu-mode-btn {
    padding: 6px 4px;
    font-size: 9px;

    i {
      font-size: 12px;
    }
  }

  .acu-info-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .acu-dice-form-row.cols-3 {
    grid-template-columns: repeat(2, 1fr);
  }

  .acu-dice-roll-btn {
    height: 44px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .acu-dice-panel-header {
    padding: 6px 10px;
  }

  .acu-dice-panel-title {
    font-size: 12px;
  }

  .acu-dice-panel-body {
    padding: 8px;
    gap: 6px;
  }

  .acu-mode-selector {
    flex-direction: column;
    gap: 6px;
  }

  .acu-primary-modes {
    flex-direction: row;
  }

  .acu-more-modes {
    width: 100%;
  }

  .acu-mode-btn.more {
    width: 100%;
    justify-content: center;
  }

  .acu-mode-dropdown {
    position: static;
    margin-top: 4px;
    width: 100%;
  }

  .acu-section-card {
    padding: 8px;
  }

  .acu-card-header {
    font-size: 10px;
    margin-bottom: 6px;
    padding-bottom: 4px;
  }

  .acu-info-cards {
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  .acu-info-card {
    padding: 6px 4px;

    .label {
      font-size: 8px;
    }

    .value {
      font-size: 14px;
    }
  }

  .acu-dice-form-row {
    gap: 6px;

    &.cols-2,
    &.cols-3 {
      grid-template-columns: 1fr;
    }
  }

  .acu-dice-input,
  .acu-dice-select {
    height: 26px;
    font-size: 11px;
  }

  .acu-dice-form-label {
    font-size: 10px;
  }

  .acu-dice-quick-compact {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
  }

  .acu-stat-chip {
    padding: 6px 4px;

    .label {
      font-size: 9px;
    }

    .val {
      font-size: 12px;
    }

    .mod {
      font-size: 8px;
    }
  }

  .acu-dice-roll-btn {
    height: 40px;
    font-size: 13px;
    border-radius: 10px;
  }

  .acu-dice-result-value {
    font-size: 18px;
  }

  .acu-dice-result-badge {
    font-size: 10px;
    padding: 2px 8px;
  }

  .acu-dice-char-buttons {
    gap: 3px;
  }

  .acu-dice-char-btn {
    padding: 2px 8px;
    font-size: 10px;
  }
}
</style>
