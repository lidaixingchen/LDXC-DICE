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
const successCriteria = ref('lte');
const customDiceExpr = ref('1d100');
const customJudgeMode = ref('<=');
const customTargetValue = ref<number | string>('');
const isCustomMode = ref(false);
const activeQuickPresetId = ref('__default__');

const QUICK_PRESETS = computed(() => {
  const list = presets.value.filter(p => p.visible !== false).map(p => ({ id: p.id!, name: p.name }));
  return [{ id: '__default__', name: 'COC' }, { id: '__custom__', name: '自定义' }, ...list];
});

const DIFFICULTY_OPTIONS = [
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
  { value: 'extreme', label: '极难' },
  { value: 'critical', label: '大成功' },
];

const SUCCESS_CRITERIA_OPTIONS = [
  { id: 'lte', name: '≤ (COC)' },
  { id: 'gte', name: '≥ (DND)' },
];

const JUDGE_MODE_OPTIONS = [
  { id: '>=', name: '>=' },
  { id: '<=', name: '<=' },
  { id: '>', name: '>' },
  { id: '<', name: '<' },
  { id: 'none', name: '无判定' },
];

const isDND = computed(() => successCriteria.value === 'gte');

function selectQuickPreset(id: string): void {
  activeQuickPresetId.value = id;
  isCustomMode.value = id === '__custom__';

  if (id === '__default__') {
    successCriteria.value = 'lte';
    customDiceExpr.value = '1d100';
  } else if (id === '__custom__') {
    customDiceExpr.value = '1d100';
  } else {
    selectPreset(id);
    const p = presets.value.find(x => x.id === id);
    if (p) {
      if (p.diceExpression === '1d20') {
        successCriteria.value = 'gte';
      } else if (p.diceExpression === '1d100') {
        successCriteria.value = 'lte';
      }
      customDiceExpr.value = p.diceExpression || '1d100';
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

function getDiceConfig() {
  try {
    const stored = localStorage.getItem('acu_dice_config');
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    critSuccessMax: 5,
    critFailMin: 96,
    difficultSuccessDiv: 2,
    hardSuccessDiv: 5,
  };
}

async function handleRoll(): Promise<void> {
  if (isRolling.value) return;
  isRolling.value = true;

  try {
    const diceCfg = getDiceConfig();

    if (isCustomMode.value) {
      const expr = customDiceExpr.value || '1d100';
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

    const formula = isDND.value ? '1d20' : '1d100';
    const mod = modifier.value !== '' ? Number(modifier.value) : 0;
    const attr = attrName.value || '自由检定';
    const diff = difficulty.value;

    const attrVal = attrValue.value !== '' ? Number(attrValue.value) : 0;
    let target = targetValue.value !== '' ? Number(targetValue.value) : 0;

    if (target === 0) {
      if (isDND.value) {
        target = 10;
      } else if (attrVal > 0) {
        target = attrVal;
      } else {
        target = 50;
      }
    }

    const result = roll(formula);
    const total = result.total + mod;

    const critSuccessMax = isDND.value ? 20 : diceCfg.critSuccessMax || 5;
    const critFailMin = isDND.value ? 1 : diceCfg.critFailMin || 96;
    const hardDiv = diceCfg.difficultSuccessDiv || 2;
    const extremeDiv = diceCfg.hardSuccessDiv || 5;

    let requiredTarget = target;
    let difficultyLabel = '';
    let difficultyDiv = 1;

    if (!isDND.value) {
      switch (diff) {
        case 'hard':
          requiredTarget = Math.floor(target / hardDiv);
          difficultyLabel = '困难';
          difficultyDiv = hardDiv;
          break;
        case 'extreme':
          requiredTarget = Math.floor(target / extremeDiv);
          difficultyLabel = '极难';
          difficultyDiv = extremeDiv;
          break;
        case 'critical':
          requiredTarget = critSuccessMax;
          difficultyLabel = '大成功';
          break;
      }
    }

    let isCritSuccess = false;
    let isCritFailure = false;
    let isSuccess = false;
    let outcomeText = '';

    if (isDND.value) {
      isCritSuccess = result.total >= 20;
      isCritFailure = result.total <= 1;
      isSuccess = total >= requiredTarget;
    } else {
      isCritSuccess = total <= critSuccessMax;
      isCritFailure = total >= critFailMin;
      isSuccess = total <= requiredTarget;
    }

    if (isCritSuccess) {
      outcomeText = '大成功！';
      isSuccess = true;
    } else if (isCritFailure) {
      outcomeText = '大失败！';
      isSuccess = false;
    } else if (isSuccess) {
      if (isDND.value) {
        outcomeText = '成功';
      } else if (diff === 'hard') {
        outcomeText = '困难成功';
      } else if (diff === 'extreme') {
        outcomeText = '极难成功';
      } else {
        const extremeTarget = Math.floor(target / extremeDiv);
        const hardTarget = Math.floor(target / hardDiv);
        if (total <= extremeTarget) {
          outcomeText = '极难成功';
        } else if (total <= hardTarget) {
          outcomeText = '困难成功';
        } else {
          outcomeText = '成功';
        }
      }
    } else {
      outcomeText = '失败';
    }

    let judgeExpr = '';
    const criteriaSymbol = isDND.value ? '≥' : '≤';
    if (isCritSuccess) {
      judgeExpr = isDND.value ? `${total}≥20` : `${total}≤${critSuccessMax}`;
    } else if (isCritFailure) {
      judgeExpr = isDND.value ? `${total}≤1` : `${total}≥${critFailMin}`;
    } else if (isDND.value) {
      judgeExpr = isSuccess
        ? `需${criteriaSymbol}${requiredTarget}，${total}≥${requiredTarget}`
        : `需${criteriaSymbol}${requiredTarget}，${total}<${requiredTarget}`;
    } else if (diff === 'critical') {
      judgeExpr = `需≤${critSuccessMax}，${total}>${critSuccessMax}`;
    } else if (diff !== 'normal') {
      judgeExpr = isSuccess
        ? `需≤${target}/${difficultyDiv}，${total}≤${requiredTarget}`
        : `需≤${target}/${difficultyDiv}，${total}>${requiredTarget}`;
    } else if (isSuccess) {
      const extremeTarget = Math.floor(target / extremeDiv);
      const hardTarget = Math.floor(target / hardDiv);
      if (total <= extremeTarget) {
        judgeExpr = `需≤${target}，${total}≤${target}/${extremeDiv}`;
      } else if (total <= hardTarget) {
        judgeExpr = `需≤${target}，${total}≤${target}/${hardDiv}`;
      } else {
        judgeExpr = `需≤${target}，${total}≤${target}`;
      }
    } else {
      judgeExpr = `需≤${target}，${total}>${target}`;
    }

    lastResult.value = {
      success: isSuccess,
      roll: result.total,
      total: total,
      target: target,
      margin: isDND.value ? total - requiredTarget : requiredTarget - total,
      criticalSuccess: isCritSuccess,
      criticalFailure: isCritFailure,
      outcome: outcomeText,
      message: `${formula} = ${result.breakdown}${mod !== 0 ? ` ${mod >= 0 ? '+' : ''}${mod}` : ''} = ${total}`,
      diceType: formula,
      presetId: activeQuickPresetId.value,
    };
    showResult.value = true;

    const initiator = initiatorName.value || '<user>';
    const metaContent = `元叙事：${initiator}发起了【${attr}】检定，掷出${total}，${judgeExpr}，【${outcomeText}】`;
    const content = `<meta:检定结果>\n${metaContent}\n</meta:检定结果>`;
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

    const currentText = textarea.val() || '';
    const newText = currentText ? `${currentText}\n${content}` : content;
    textarea.val(newText);
    textarea.trigger('input');

    const sendBtn = $('#send_but');
    if (sendBtn.length > 0) {
      sendBtn.trigger('click');
    }
  } catch (e) {
    console.warn('[DicePanel] 发送到输入框失败:', e);
  }
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

watch(successCriteria, val => {
  if (val === 'gte') {
    if (targetValue.value === '' && attrValue.value !== '') {
      targetValue.value = 10;
    }
  } else if (targetValue.value === '' && attrValue.value !== '') {
    targetValue.value = attrValue.value;
  }
});

onMounted(() => {
  initDiceSystem();
  loadPresets();
  selectQuickPreset('__default__');
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
          " title="随机技能
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
          <input v-model="attrValue" type="text" class="acu-dice-input" placeholder="留空=50" />
        </div>
        <div class="acu-dice-field">
          <div class="acu-dice-form-label">{{ isDND ? 'DC' : '目标值' }}</div>
          <input
            v-model="targetValue"
            type="text"
            class="acu-dice-input"
            :placeholder="isDND ? '留空=10' : '留空=属性值'"
          />
        </div>
      </div>

      <div v-if="!isCustomMode" class="acu-dice-form-row cols-3">
        <div>
          <div class="acu-dice-form-label centered">成功标准</div>
          <select v-model="successCriteria" class="acu-dice-select">
            <option v-for="opt in SUCCESS_CRITERIA_OPTIONS" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
        </div>
        <div v-if="!isDND">
          <div class="acu-dice-form-label centered">难度等级</div>
          <select v-model="difficulty" class="acu-dice-select">
            <option v-for="o in DIFFICULTY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <div class="acu-dice-form-label">修正值</div>
          <input v-model="modifier" type="text" class="acu-dice-input" placeholder="0" />
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
          <button class="acu-dice-retry-btn" @click.stop="showResult = false">
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
