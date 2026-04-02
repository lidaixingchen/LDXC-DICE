<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useCharacterData, useDiceSystem, useDropdownSuggestions, usePresets } from '../composables';
import type { AttributeButton } from '../composables/useCharacterData';
import type { CheckResult } from '../types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switchToOpposed'): void;
}>();

const { initialize: initDiceSystem, performCheck, roll } = useDiceSystem();
const { presets, currentPreset, loadPresets, selectPreset } = usePresets();

const { characters, currentCharacter, attributeButtons, selectCharacter, getRandomAttribute, getAttributeValue } =
  useCharacterData();

const nameDropdown = useDropdownSuggestions<{ name: string }>();
const attrDropdown = useDropdownSuggestions<AttributeButton>();

const isRolling = ref(false);
const lastResult = ref<CheckResult | null>(null);
const showResult = ref(false);

const initiatorName = ref('');
const attrName = ref('');
const attrValue = ref<number | string>('');
const targetValue = ref<number | string>('');
const modifier = ref<number | string>('');
const difficulty = ref('normal');
const successCriteria = ref('gte');
const customDiceExpr = ref('1d20');
const customJudgeMode = ref('>=');
const customTargetValue = ref<number | string>('');
const isCustomMode = ref(false);
const activeQuickPresetId = ref('aidm_standard');
const worldLevel = ref('F级');

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

function getMasteryBonus(level: string): number {
  return WORLD_LEVEL_CONFIG[level]?.masteryBonus ?? 0;
}

function getBaseDC(level: string): number {
  return WORLD_LEVEL_CONFIG[level]?.baseDC ?? 10;
}

const QUICK_PRESETS = computed(() => {
  const list = presets.value.filter(p => p.visible !== false).map(p => ({ id: p.id!, name: p.name }));
  return [
    { id: 'aidm_standard', name: 'AIDM标准' },
    { id: '__custom__', name: '自定义' },
    ...list,
  ];
});

const DIFFICULTY_OPTIONS = [
  { value: 'normal', label: '常规 (+0)' },
  { value: 'hard', label: '困难 (+3)' },
  { value: 'extreme', label: '极难 (+6)' },
];

const SUCCESS_CRITERIA_OPTIONS = [
  { id: 'gte', name: '≥ (AIDM)' },
  { id: 'lte', name: '≤ (COC)' },
];

const JUDGE_MODE_OPTIONS = [
  { id: '>=', name: '>=' },
  { id: '<=', name: '<=' },
  { id: '>', name: '>' },
  { id: '<', name: '<' },
  { id: 'none', name: '无判定' },
];

const isAIDM = computed(() => activeQuickPresetId.value === 'aidm_standard');
const isDND = computed(() => successCriteria.value === 'gte');

function selectQuickPreset(id: string): void {
  activeQuickPresetId.value = id;
  isCustomMode.value = id === '__custom__';

  if (id === 'aidm_standard') {
    successCriteria.value = 'gte';
    customDiceExpr.value = '1d20';
  } else if (id === '__custom__') {
    customDiceExpr.value = '1d20';
  } else {
    selectPreset(id);
    const p = presets.value.find(x => x.id === id);
    if (p) {
      if (p.diceExpression === '1d20') {
        successCriteria.value = 'gte';
      } else if (p.diceExpression === '1d100') {
        successCriteria.value = 'lte';
      }
      customDiceExpr.value = p.diceExpression || '1d20';
    }
  }
}

function handleSelectCharacter(name: string): void {
  selectCharacter(name);
  initiatorName.value = name;
  nameDropdown.close();
}

function handleSelectAttribute(attr: AttributeButton): void {
  attrName.value = attr.name;
  attrValue.value = attr.value;
  if (!isDND.value) {
    targetValue.value = attr.value;
  }
  attrDropdown.close();
}

function randomSkill(): void {
  const attr = getRandomAttribute();
  if (attr) {
    attrName.value = attr.name;
    attrValue.value = attr.value;
    if (!isDND.value) {
      targetValue.value = attr.value;
    }
  }
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

    if (target === 0) {
      target = finalDC;
    }

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

    const judgeResult = isSuccess ? '≥' : '<';
    const judgeExpr = isSuccess
      ? `${finalValue}${judgeResult}${target}`
      : `${finalValue}${judgeResult}${target}`;

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
      presetId: activeQuickPresetId.value,
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
${isCritSuccess ? '✨ 大成功！' : (isCritFailure ? '💀 大失败！' : (isSuccess ? '✅ 成功！' : '❌ 失败'))}
</meta:检定结果>`;
    await sendToTextarea(content);
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
  window.dispatchEvent(new CustomEvent('acu-show-changes-panel'));
}

function switchToOpposed() {
  emit('switchToOpposed');
}

function openSettings() {
  window.dispatchEvent(new CustomEvent('acu-open-settings-section', { detail: { section: 'general' } }));
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

onMounted(() => {
  initDiceSystem();
  loadPresets();
  selectQuickPreset('aidm_standard');
});
</script>

<template>
  <div class="acu-dice-panel">
    <div class="acu-dice-panel-header">
      <div class="acu-dice-panel-title"><i class="fa-solid fa-dice-d20"></i> 普通检定</div>
      <div class="acu-dice-panel-actions">
        <button title="切换到对抗检定" @click="switchToOpposed"><i class="fa-solid fa-people-arrows"></i></button>
        <button title="历史记录" @click="showHistory"><i class="fa-solid fa-history"></i></button>
        <button title="系统设置" @click="openSettings"><i class="fa-solid fa-cog"></i></button>
        <button @click="emit('close')"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-dice-panel-body">
      <div class="acu-dice-quick-section">
        <div class="acu-dice-section-title">
          <span><i class="fa-solid fa-sliders"></i> 检定规则</span>
        </div>
        <div class="acu-dice-quick-presets">
          <button
            v-for="p in QUICK_PRESETS"
            :key="p.id"
            class="acu-dice-quick-preset-btn"
            :class="{ active: activeQuickPresetId === p.id }"
            @click="selectQuickPreset(p.id)"
          >
            {{ p.name }}
          </button>
        </div>
      </div>

      <div class="acu-dice-quick-section">
        <div class="acu-dice-section-title">
          <span><i class="fa-solid fa-user"></i> 快捷选择</span>
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

      <div class="acu-dice-form-row cols-2">
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
          <input v-model="attrName" type="text" class="acu-dice-input" placeholder="自由检定" />
        </div>
      </div>

      <div class="acu-dice-form-row cols-2">
        <div class="acu-dice-field">
          <div class="acu-dice-form-label">属性值</div>
          <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="留空=10" />
        </div>
        <div class="acu-dice-field">
          <div class="acu-dice-form-label">目标DC</div>
          <input
            v-model="targetValue"
            type="text"
            class="acu-dice-input"
            :placeholder="`留空=${getBaseDC(worldLevel) + (DIFFICULTY_MOD[difficulty] || 0)}`"
          />
        </div>
      </div>

      <div v-if="!isCustomMode" class="acu-dice-form-row cols-3">
        <div>
          <div class="acu-dice-form-label centered">世界等级</div>
          <select v-model="worldLevel" class="acu-dice-select">
            <option v-for="level in WORLD_LEVELS" :key="level" :value="level">
              {{ level }} (DC {{ WORLD_LEVEL_CONFIG[level].baseDC }})
            </option>
          </select>
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

      <div v-if="isAIDM && !isCustomMode" class="acu-dice-info-bar">
        <div class="acu-dice-info-item">
          <span class="acu-dice-info-label">属性加成:</span>
          <span class="acu-dice-info-value">{{ computeAIDMAttrMod(attrValue !== '' ? Number(attrValue) : 10) }}</span>
        </div>
        <div class="acu-dice-info-item">
          <span class="acu-dice-info-label">掌握加成:</span>
          <span class="acu-dice-info-value">{{ getMasteryBonus(worldLevel) }}</span>
        </div>
        <div class="acu-dice-info-item">
          <span class="acu-dice-info-label">最终DC:</span>
          <span class="acu-dice-info-value">{{ getBaseDC(worldLevel) + (DIFFICULTY_MOD[difficulty] || 0) }}</span>
        </div>
      </div>

      <div v-if="isCustomMode" class="acu-dice-custom-area">
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

      <div v-if="attributeButtons.length > 0 && !isCustomMode" class="acu-dice-quick-compact">
        <button
          v-for="a in attributeButtons.slice(0, 12)"
          :key="a.name"
          class="acu-stat-chip"
          :class="{ active: attrName === a.name }"
          @click="handleSelectAttribute(a)"
        >
          <span class="label">{{ a.name }}</span>
          <span class="val">{{ a.value }}</span>
        </button>
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
  gap: 4px;

  button {
    background: transparent;
    border: none;
    color: var(--acu-text-sub);
    cursor: pointer;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;

    &:hover {
      background: var(--acu-accent-light);
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
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.acu-stat-chip {
  background: var(--acu-bg-header);
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  padding: 4px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s;

  .label {
    font-size: 9px;
    color: var(--acu-text-sub);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .val {
    font-size: 12px;
    font-weight: 800;
    color: var(--acu-accent);
  }

  &:hover {
    border-color: var(--acu-accent);
  }

  &.active {
    background: var(--acu-accent);
    border-color: var(--acu-accent);

    .label,
    .val {
      color: white;
    }
  }
}

.acu-dice-roll-btn {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: var(--acu-accent);
  color: white;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  box-shadow: 0 4px 12px var(--acu-accent-light);
  transition: all 0.15s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px var(--acu-accent-light);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.acu-dice-result-value {
  font-size: 20px;
  font-weight: 900;

  &.success {
    color: var(--acu-success);
  }
  &.failure {
    color: var(--acu-danger);
  }
}

.acu-dice-result-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;

  &.success {
    background: var(--acu-success);
    color: white;
  }

  &.failure {
    background: var(--acu-danger);
    color: white;
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
</style>
