<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useCharacterData, useDiceSystem, useDiceHistory, useDropdownSuggestions, usePresets } from '../composables';
import {
  useCombatState,
  useStandardCheck,
  useContestCheck,
  useCombatCheck,
  useDefenseCheck,
  useInitiativeCheck,
  useEscapeCheck,
  useStatusEffects,
  useEquipment,
  sendToTextarea,
} from '../composables';
import {
  CombatCalculationService,
  WorldConfigService,
  CharacterDataService,
  SaveService,
  WorldGenerationService,
} from '../services';
import type { SkillData, ItemData, StatusEffect, CombatState, EquipmentSlot, SaveSlot } from '../services';
import type { AttributeButton } from '../composables/useCharacterData';
import type { CheckResult } from '../types';
import { settingsManager } from '@data/settings-manager';

import DicePanelHeader from './DicePanel/DicePanelHeader.vue';
import ModeSelector from './DicePanel/ModeSelector.vue';
import type { CheckMode } from './DicePanel/ModeSelector.vue';
import StandardCheckPanel from './DicePanel/StandardCheckPanel.vue';
import ContestCheckPanel from './DicePanel/ContestCheckPanel.vue';
import CombatCheckPanel from './DicePanel/CombatCheckPanel.vue';
import DefenseCheckPanel from './DicePanel/DefenseCheckPanel.vue';
import InitiativeCheckPanel from './DicePanel/InitiativeCheckPanel.vue';
import EscapeCheckPanel from './DicePanel/EscapeCheckPanel.vue';
import CombatManager from './DicePanel/CombatManager.vue';
import StatusPanel from './DicePanel/StatusPanel.vue';
import ToolsPanel from './DicePanel/ToolsPanel.vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switchToOpposed'): void;
}>();

const legacySettings = computed(() => settingsManager.getLegacySettings());
const shouldHideResult = computed(() => legacySettings.value.hideDiceResultFromUser);

const { initialize: initDiceSystem, roll } = useDiceSystem();
const { presets, currentPreset, loadPresets, selectPreset } = usePresets();
const { addCheckEntry, addContestEntry } = useDiceHistory();
const { characters, currentCharacter, attributeButtons, selectCharacter, getRandomAttribute, getAttributeValue } = useCharacterData();

const {
  combat,
  activeSkills,
  usableItems,
  startCombat,
  endCombat,
  nextRound,
  applyDamageToEnemy,
  applyDamageToPlayer,
  formatCombatStatusContent,
  formatPlayerAttackContent,
  formatEnemyAttackContent,
} = useCombatState();

const { activeStatuses, addStatus, removeStatus, decayStatuses, clearAllStatuses, getStatusEnvModifier } = useStatusEffects();
const { equipment } = useEquipment();

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
const envAdvantage = ref<number | string>('');
const envDisadvantage = ref<number | string>('');
const statusAdvantage = ref<number | string>('');
const statusDisadvantage = ref<number | string>('');

const attackType = ref<'物理' | '法术'>('物理');
const attackPower = ref<number | string>('');
const targetDDC = ref<number | string>('');
const targetDefense = ref<number | string>('');
const selectedTarget = ref<string>('');
const selectedDefenseTarget = ref<string>('');

const charisma = ref<number | string>('');
const agilityValue = ref<number | string>('');
const perceptionValue = ref<number | string>('');
const dodgeBonus = ref<number | string>('');
const enemyAttackDC = ref<number | string>('');
const enemyAttackPower = ref<number | string>('');
const playerDefense = ref<number | string>('');

const oppAgility = ref<number | string>('');
const escapeType = ref<'solo' | 'surrounded' | 'obstacle'>('solo');
const escapeEnemyCount = ref<number | string>('1');
const escapeEnemyAgility = ref<number | string>('');
const escapeObstacleMod = ref<number | string>('0');

const newStatusName = ref('');
const newStatusType = ref<StatusEffect['type']>('debuff');
const newStatusIntensity = ref<StatusEffect['intensity']>('medium');
const newStatusValue = ref<number | string>('1');
const newStatusRounds = ref<number | string>('3');

const saveSlots = ref<SaveSlot[]>([]);
const exportText = ref('');
const importText = ref('');
const activeToolTab = ref('world');
const skillGenLevel = ref<string>('C级');

const npcList = computed(() => {
  return characters.value.filter(c => c.name !== '主角' && c.name !== currentCharacter.value);
});

const QUICK_PRESETS = computed(() => {
  const list = presets.value.filter(p => p.visible !== false).map(p => ({ id: p.id!, name: p.name }));
  return [{ id: '__custom__', name: '自定义' }, ...list];
});

const critRate = computed(() => {
  const cha = charisma.value !== '' ? Number(charisma.value) : 10;
  return CombatCalculationService.computeCritRate(cha);
});

provide('aidmInitiatorName', initiatorName);
provide('aidmWorldLevel', worldLevel);
provide('aidmEquipment', equipment);
provide('aidmCurrentCharacter', currentCharacter);

function fillPlayerAttributes(): void {
  const filled = CharacterDataService.fillPlayerAttributes(
    characters.value,
    currentCharacter.value,
    {
      attrValue: String(attrValue.value),
      charisma: String(charisma.value),
      attackPower: String(attackPower.value),
      agilityValue: String(agilityValue.value),
      perceptionValue: String(perceptionValue.value),
      playerDefense: String(playerDefense.value),
    },
  );
  if (filled.attrValue !== String(attrValue.value)) attrValue.value = filled.attrValue;
  if (filled.charisma !== String(charisma.value)) charisma.value = filled.charisma;
  if (filled.attackPower !== String(attackPower.value)) attackPower.value = filled.attackPower;
  if (filled.agilityValue !== String(agilityValue.value)) agilityValue.value = filled.agilityValue;
  if (filled.perceptionValue !== String(perceptionValue.value)) perceptionValue.value = filled.perceptionValue;
  if (filled.playerDefense !== String(playerDefense.value)) playerDefense.value = filled.playerDefense;
}

function selectCombatTarget(name: string): void {
  selectedTarget.value = name;
  const result = CharacterDataService.selectCombatTarget(characters.value, name, attackType.value);
  if (result.targetDDC) targetDDC.value = result.targetDDC;
  if (result.targetDefense) targetDefense.value = result.targetDefense;
}

function selectDefenseTarget(name: string): void {
  selectedDefenseTarget.value = name;
  const result = CharacterDataService.selectDefenseTarget(characters.value, name, currentCharacter.value, worldLevel.value);
  if (result.enemyAttackDc) enemyAttackDC.value = result.enemyAttackDc;
  if (result.enemyAttackPower) enemyAttackPower.value = result.enemyAttackPower;
  if (result.agilityValue) agilityValue.value = result.agilityValue;
  if (result.perceptionValue) perceptionValue.value = result.perceptionValue;
  if (result.playerDefense) playerDefense.value = result.playerDefense;
}

watch(attackType, () => {
  if (selectedTarget.value) selectCombatTarget(selectedTarget.value);
});

watch(currentCharacter, (newVal) => {
  if (newVal) {
    const filled = CharacterDataService.autoFillFromCharacter(characters.value, newVal);
    if (filled.attackPower) attackPower.value = filled.attackPower;
    if (filled.playerDefense) playerDefense.value = filled.playerDefense;
    if (filled.charisma) charisma.value = filled.charisma;
    if (filled.attrValue) attrValue.value = filled.attrValue;
    if (filled.oppAgility) oppAgility.value = filled.oppAgility;
    initiatorName.value = filled.initiatorName;
  }
});

watch(attrName, (newVal) => {
  if (currentCharacter.value && newVal) {
    const value = getAttributeValue(currentCharacter.value, newVal);
    if (value !== null) attrValue.value = value;
  }
});

watch(worldLevel, () => {
  if (targetValue.value === '' || Object.values(WorldConfigService.CONFIG).some(c => targetValue.value === String(c.baseDC))) {
    targetValue.value = '';
  }
});

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
    if (p) customDiceExpr.value = p.diceExpression || '1d20';
  }
}

function handleSelectCharacter(name: string): void {
  selectCharacter(name);
  const filled = CharacterDataService.autoFillFromCharacter(characters.value, name);
  if (filled.attackPower) attackPower.value = filled.attackPower;
  if (filled.playerDefense) playerDefense.value = filled.playerDefense;
  if (filled.charisma) charisma.value = filled.charisma;
  if (filled.attrValue) attrValue.value = filled.attrValue;
  if (filled.oppAgility) oppAgility.value = filled.oppAgility;
  initiatorName.value = filled.initiatorName;
}

function handleSelectAttribute(attr: AttributeButton): void {
  attrName.value = attr.name;
  attrValue.value = attr.value;
}

function randomSkill(): void {
  const attr = getRandomAttribute();
  if (attr) {
    attrName.value = attr.name;
    attrValue.value = attr.value;
  }
}

function quickRoll(type: 'normal' | 'advantage' | 'disadvantage'): void {
  if (isRolling.value) return;
  let modifierValue = 0;
  if (type === 'advantage') modifierValue = 5;
  else if (type === 'disadvantage') modifierValue = -5;
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
          case '>=': isSuccess = total >= target; break;
          case '<=': isSuccess = total <= target; break;
          case '>': isSuccess = total > target; break;
          case '<': isSuccess = total < target; break;
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
      showResult.value = !shouldHideResult.value;

      const content = `<meta:检定结果>\n元叙事：${initiatorName.value || '<user>'}发起了自定义掷骰【${expr}】，掷出${total}${target !== null ? `，${judgeMode}${target}` : ''}，【${outcomeText}】\n</meta:检定结果>`;
      await sendToTextarea(content);
      return;
    }

    switch (checkMode.value) {
      case 'standard': {
        const { executeStandardCheck } = useStandardCheck();
        const result = await executeStandardCheck({
          attrValue: attrValue.value,
          attrName: attrName.value,
          modifier: modifier.value,
          difficulty: difficulty.value,
          level: worldLevel.value,
          targetValue: targetValue.value,
          charisma: charisma.value,
          initiatorName: initiatorName.value,
          shouldHideResult: shouldHideResult.value,
        });
        if (result) { lastResult.value = result; showResult.value = !shouldHideResult.value; }
        break;
      }
      case 'contest': {
        const { executeContestCheck } = useContestCheck();
        const result = await executeContestCheck({
          myAttrValue: attrValue.value,
          oppAttrValue: oppAttr.value,
          envAdvantage: envAdvantage.value,
          envDisadvantage: envDisadvantage.value,
          statusAdvantage: statusAdvantage.value,
          statusDisadvantage: statusDisadvantage.value,
          level: worldLevel.value,
          attrName: attrName.value,
          initiatorName: initiatorName.value,
          shouldHideResult: shouldHideResult.value,
        });
        if (result) { lastResult.value = result; showResult.value = !shouldHideResult.value; }
        break;
      }
      case 'combat': {
        const { executeCombatCheck } = useCombatCheck();
        const result = await executeCombatCheck({
          attrValue: attrValue.value,
          attackType: attackType.value,
          attackPower: attackPower.value,
          targetDefense: targetDefense.value,
          targetDDC: targetDDC.value,
          charisma: charisma.value,
          modifier: modifier.value,
          level: worldLevel.value,
          selectedTarget: selectedTarget.value,
          shouldHideResult: shouldHideResult.value,
          combat,
          applyDamageToEnemy,
          formatPlayerAttackContent,
        });
        if (result) { lastResult.value = result; showResult.value = !shouldHideResult.value; }
        break;
      }
      case 'defense': {
        const { executeDefenseCheck } = useDefenseCheck();
        const result = await executeDefenseCheck({
          agilityValue: agilityValue.value,
          perceptionValue: perceptionValue.value,
          dodgeBonus: dodgeBonus.value,
          enemyAttackDC: enemyAttackDC.value,
          enemyAttackPower: enemyAttackPower.value,
          playerDefense: playerDefense.value,
          level: worldLevel.value,
          attackerName: selectedDefenseTarget.value || '敌人',
          shouldHideResult: shouldHideResult.value,
          combat,
          applyDamageToPlayer,
          formatEnemyAttackContent,
        });
        if (result) { lastResult.value = result; showResult.value = !shouldHideResult.value; }
        break;
      }
      case 'initiative': {
        const { executeInitiativeCheck } = useInitiativeCheck();
        const result = await executeInitiativeCheck({
          myAgility: attrValue.value,
          oppAgility: oppAgility.value,
          level: worldLevel.value,
          shouldHideResult: shouldHideResult.value,
        });
        if (result) { lastResult.value = result; showResult.value = !shouldHideResult.value; }
        break;
      }
      case 'escape': {
        const { executeEscapeCheck } = useEscapeCheck();
        const result = await executeEscapeCheck({
          agilityValue: attrValue.value,
          modifier: modifier.value,
          escapeType: escapeType.value,
          escapeEnemyAgility: escapeEnemyAgility.value,
          escapeEnemyCount: escapeEnemyCount.value,
          escapeObstacleMod: escapeObstacleMod.value,
          level: worldLevel.value,
          shouldHideResult: shouldHideResult.value,
        });
        if (result) { lastResult.value = result; showResult.value = !shouldHideResult.value; }
        break;
      }
    }
  } catch (e) {
    console.error('[DicePanel] 掷骰失败:', e);
  } finally {
    isRolling.value = false;
  }
}

async function useNormalAttack(): Promise<void> {
  checkMode.value = 'combat';
  fillPlayerAttributes();
  await handleRoll();
}

async function useSkill(skill: SkillData): Promise<void> {
  const isDamageSkill = skill.description.includes('伤害') || skill.description.includes('攻击') || skill.description.includes('打击') || skill.description.includes('斩击');

  if (isDamageSkill && combat.value.active) {
    checkMode.value = 'combat';
    fillPlayerAttributes();
    await handleRoll();
  } else {
    let statusContent = '';
    if (combat.value.active) {
      statusContent = `\n\n📊 当前状态：\n・👤 玩家：HP ${combat.value.playerCurrentHP}/${combat.value.playerMaxHP}${combat.value.playerShield > 0 ? ` 🛡️${combat.value.playerShield}` : ''}\n・👹 ${combat.value.enemyName}：HP ${combat.value.enemyCurrentHP}/${combat.value.enemyMaxHP}`;
    }
    const content = `<meta:战斗行动>\n【使用技能 - ${skill.name}】\n\n📜 技能效果：${skill.description}\n📊 数值加成：${skill.value}\n⏱️ 冷却回合：${skill.cooldown}\n\n玩家使用了「${skill.name}」！${statusContent}\n</meta:战斗行动>`;
    await sendToTextarea(content);
  }
}

async function useItem(item: ItemData): Promise<void> {
  item.quantity = Math.max(0, item.quantity - 1);
  let statusContent = '';
  if (combat.value.active) {
    statusContent = `\n\n📊 当前状态：\n・👤 玩家：HP ${combat.value.playerCurrentHP}/${combat.value.playerMaxHP}${combat.value.playerShield > 0 ? ` 🛡️${combat.value.playerShield}` : ''}\n・👹 ${combat.value.enemyName}：HP ${combat.value.enemyCurrentHP}/${combat.value.enemyMaxHP}`;
  }
  const content = `<meta:战斗行动>\n【使用道具 - ${item.name}】\n\n📜 道具效果：${item.description}\n📦 剩余数量：${item.quantity}\n\n玩家使用了「${item.name}」！${statusContent}\n</meta:战斗行动>`;
  await sendToTextarea(content);
}

async function sendCombatStatus(): Promise<void> {
  const content = formatCombatStatusContent(initiatorName.value);
  if (content) await sendToTextarea(content);
}

function handleStartCombat(): void {
  startCombat(
    worldLevel.value,
    selectedTarget.value,
    characters.value,
    playerDefense.value !== '' ? Number(playerDefense.value) : 0,
    equipment.value,
  );
}

function handleNextRound(): void {
  nextRound(decayStatuses);
}

function handleAddStatus(): void {
  addStatus(
    newStatusName.value.trim(),
    newStatusType.value,
    newStatusIntensity.value,
    newStatusValue.value !== '' ? Number(newStatusValue.value) : 1,
    newStatusRounds.value !== '' ? Number(newStatusRounds.value) : 3,
  );
  newStatusName.value = '';
  newStatusValue.value = '1';
  newStatusRounds.value = '3';
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

function handleSaveGame(slotId: number): void {
  const charName = currentCharacter.value;
  const char = characters.value.find(c => c.name === charName);
  const attrs: Record<string, number> = {};
  if (char) Object.entries(char.attributes).forEach(([k, v]) => { attrs[k] = v; });

  saveSlots.value = SaveService.saveGame(slotId, saveSlots.value, {
    playerName: initiatorName.value || '冒险者',
    level: worldLevel.value,
    attrs,
    combat: { ...combat.value },
    equipment: { ...equipment.value },
    statuses: activeStatuses.value.map(s => ({ ...s })),
    worldName: combat.value.enemyName || '',
    location: '未知',
  });
}

function handleLoadGame(slotId: number): void {
  const data = SaveService.loadGame(saveSlots.value, slotId);
  if (!data) return;
  initiatorName.value = data.playerName;
  worldLevel.value = data.level;
  combat.value = { ...data.combat };
  equipment.value = { ...data.equipment };
  activeStatuses.value = data.statuses.map(s => ({ ...s }));
}

function handleExportSave(): void {
  const charName = currentCharacter.value;
  const char = characters.value.find(c => c.name === charName);
  const stats = char
    ? CombatCalculationService.deriveCombatStats(char.attributes, worldLevel.value, equipment.value)
    : { physAtk: 0, magicAtk: 0, physDef: 0, magicDef: 0, hp: 0, ddc: 10, critRate: 10 };

  exportText.value = SaveService.exportSaveText(
    initiatorName.value || '冒险者',
    worldLevel.value,
    combat.value,
    equipment.value,
    activeStatuses.value,
    stats,
  );
}

function handleImportSave(): void {
  if (!SaveService.importSave(importText.value)) {
    alert('存档格式无效：未检测到存档标识');
  } else {
    alert('存档导入成功！（演示模式：请手动恢复各项数值）');
  }
}

function handleGenerateWorlds(): void {
  // ToolsPanel will handle this via WorldGenerationService
}

function handleGenerateSkills(): void {
  // ToolsPanel will handle this via WorldGenerationService
}

loadSaveSlots();

function loadSaveSlots(): void {
  saveSlots.value = SaveService.loadSaveSlots();
}

onMounted(() => {
  initDiceSystem();
  loadPresets();
});
</script>

<template>
  <div class="acu-dice-panel">
    <DicePanelHeader
      :current-mode="checkMode"
      @close="emit('close')"
      @show-history="showHistory"
      @open-settings="openSettings"
    />

    <div class="acu-dice-panel-body">
      <ModeSelector
        v-model:current-mode="checkMode"
        v-model:show-more-modes="showMoreModes"
      />

      <StandardCheckPanel
        v-if="checkMode === 'standard' && !isCustomMode"
        :world-level="worldLevel"
        :difficulty="difficulty"
        :initiator-name="initiatorName"
        :attr-name="attrName"
        :attr-value="attrValue"
        :target-value="targetValue"
        :modifier="modifier"
        :charisma="charisma"
        :attribute-buttons="attributeButtons"
        :characters="characters"
        :current-character="currentCharacter"
        @update:world-level="worldLevel = $event"
        @update:difficulty="difficulty = $event"
        @update:initiator-name="initiatorName = $event"
        @update:attr-name="attrName = $event"
        @update:attr-value="attrValue = $event"
        @update:target-value="targetValue = $event"
        @update:modifier="modifier = $event"
        @update:charisma="charisma = $event"
        @select-character="handleSelectCharacter"
        @select-attribute="handleSelectAttribute"
        @random-skill="randomSkill"
        @quick-roll="quickRoll"
      />

      <ContestCheckPanel
        v-if="checkMode === 'contest' && !isCustomMode"
        :world-level="worldLevel"
        :initiator-name="initiatorName"
        :attr-name="attrName"
        :attr-value="attrValue"
        :opp-attr="oppAttr"
        :env-advantage="envAdvantage"
        :env-disadvantage="envDisadvantage"
        :status-advantage="statusAdvantage"
        :status-disadvantage="statusDisadvantage"
        :attribute-buttons="attributeButtons"
        @update:initiator-name="initiatorName = $event"
        @update:attr-name="attrName = $event"
        @update:attr-value="attrValue = $event"
        @update:opp-attr="oppAttr = $event"
        @update:env-advantage="envAdvantage = $event"
        @update:env-disadvantage="envDisadvantage = $event"
        @update:status-advantage="statusAdvantage = $event"
        @update:status-disadvantage="statusDisadvantage = $event"
        @select-attribute="handleSelectAttribute"
        @random-skill="randomSkill"
      />

      <CombatCheckPanel
        v-if="checkMode === 'combat' && !isCustomMode"
        :world-level="worldLevel"
        :attack-type="attackType"
        :attr-value="attrValue"
        :attack-power="attackPower"
        :target-ddc="targetDDC"
        :target-defense="targetDefense"
        :charisma="charisma"
        :modifier="modifier"
        :selected-target="selectedTarget"
        :npc-list="npcList"
        @update:attack-type="attackType = $event"
        @update:attr-value="attrValue = $event"
        @update:attack-power="attackPower = $event"
        @update:target-ddc="targetDDC = $event"
        @update:target-defense="targetDefense = $event"
        @update:charisma="charisma = $event"
        @update:modifier="modifier = $event"
        @select-combat-target="selectCombatTarget"
      />

      <DefenseCheckPanel
        v-if="checkMode === 'defense' && !isCustomMode"
        :world-level="worldLevel"
        :agility-value="agilityValue"
        :perception-value="perceptionValue"
        :dodge-bonus="dodgeBonus"
        :enemy-attack-dc="enemyAttackDC"
        :enemy-attack-power="enemyAttackPower"
        :player-defense="playerDefense"
        :selected-defense-target="selectedDefenseTarget"
        :npc-list="npcList"
        @update:agility-value="agilityValue = $event"
        @update:perception-value="perceptionValue = $event"
        @update:dodge-bonus="dodgeBonus = $event"
        @update:enemy-attack-dc="enemyAttackDC = $event"
        @update:enemy-attack-power="enemyAttackPower = $event"
        @update:player-defense="playerDefense = $event"
        @select-defense-target="selectDefenseTarget"
      />

      <InitiativeCheckPanel
        v-if="checkMode === 'initiative' && !isCustomMode"
        :world-level="worldLevel"
        :attr-value="attrValue"
        :opp-agility="oppAgility"
        @update:attr-value="attrValue = $event"
        @update:opp-agility="oppAgility = $event"
      />

      <EscapeCheckPanel
        v-if="checkMode === 'escape' && !isCustomMode"
        :world-level="worldLevel"
        :attr-value="attrValue"
        :modifier="modifier"
        :escape-type="escapeType"
        :escape-enemy-agility="escapeEnemyAgility"
        :escape-enemy-count="escapeEnemyCount"
        :escape-obstacle-mod="escapeObstacleMod"
        @update:attr-value="attrValue = $event"
        @update:modifier="modifier = $event"
        @update:escape-type="escapeType = $event"
        @update:escape-enemy-agility="escapeEnemyAgility = $event"
        @update:escape-enemy-count="escapeEnemyCount = $event"
        @update:escape-obstacle-mod="escapeObstacleMod = $event"
      />

      <CombatManager
        v-if="!isCustomMode && (checkMode === 'combat' || checkMode === 'defense' || checkMode === 'initiative')"
        :combat="combat"
        :active-skills="activeSkills"
        :usable-items="usableItems"
        :initiator-name="initiatorName"
        :world-level="worldLevel"
        :player-defense="playerDefense !== '' ? Number(playerDefense) : 0"
        :equipment="equipment"
        :selected-target="selectedTarget"
        :characters="characters"
        @start-combat="handleStartCombat"
        @end-combat="endCombat"
        @next-round="handleNextRound"
        @send-combat-status="sendCombatStatus"
        @use-normal-attack="useNormalAttack"
        @use-skill="useSkill"
        @use-item="useItem"
      />

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
              <option value=">=">>=</option>
              <option value="<="><=</option>
              <option value=">">></option>
              <option value="<"><</option>
              <option value="none">无判定</option>
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
          <span class="acu-dice-result-value" :class="{ success: lastResult.success, failure: !lastResult.success }">{{ lastResult.total }}</span>
          <span class="acu-dice-result-badge" :class="{ success: lastResult.success, failure: !lastResult.success }">{{ lastResult.outcome }}</span>
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

.acu-dice-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
}

.acu-section-card {
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 6px;
}

.acu-card-header {
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
  font-size: 10px; font-weight: 700; color: var(--acu-accent);
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--acu-border);
}

.acu-card-title { display: flex; align-items: center; gap: 4px; }

.acu-dice-form-row {
  display: grid; gap: 8px;
  &.cols-2 { grid-template-columns: 1fr 1fr; }
  &.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
}

.acu-dice-field { display: flex; flex-direction: column; gap: 2px; }
.acu-dice-form-label { font-size: 11px; font-weight: 700; color: var(--acu-text-sub); display: flex; justify-content: space-between; align-items: center; }

.acu-dice-input,
.acu-dice-select {
  width: 100%; height: 28px; padding: 0 8px; border-radius: 4px;
  border: 1px solid var(--acu-border); background: var(--acu-bg-header);
  color: var(--acu-text-main); font-size: 12px; outline: none; transition: border-color 0.15s;
  &:focus { border-color: var(--acu-accent); }
}

.acu-dice-custom-area {
  margin-top: 4px; padding: 8px;
  background: var(--acu-bg-panel); border: 1px dashed var(--acu-border); border-radius: 6px;
}

.acu-dice-roll-btn {
  width: 100%; height: 40px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, var(--acu-accent), color-mix(in srgb, var(--acu-accent) 85%, black));
  color: white; font-weight: 800; font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); transition: all 0.2s ease;
  position: relative; overflow: hidden;
  &::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s ease; }
  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); &::before { left: 100%; } }
  &:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
  &:disabled { opacity: 0.7; cursor: not-allowed; }
  i { font-size: 18px; &.fa-spin { animation: spin 0.8s linear infinite; } }
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.acu-dice-result-value {
  font-size: 22px; font-weight: 900;
  &.success { color: #2ecc71; text-shadow: 0 0 10px rgba(46, 204, 113, 0.5); }
  &.failure { color: #e74c3c; text-shadow: 0 0 10px rgba(231, 76, 60, 0.5); }
}

.acu-dice-result-badge {
  padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  &.success { background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; box-shadow: 0 2px 8px rgba(46, 204, 113, 0.4); }
  &.failure { background: linear-gradient(135deg, #c0392b, #e74c3c); color: white; box-shadow: 0 2px 8px rgba(231, 76, 60, 0.4); }
}

.acu-dice-retry-btn {
  background: rgba(255, 255, 255, 0.2); border: none; color: white;
  width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center; margin-left: 8px;
  &:hover { background: rgba(255, 255, 255, 0.3); }
}
</style>
