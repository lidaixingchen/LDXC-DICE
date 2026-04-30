<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useCharacterData, useDiceSystem, usePresets, useCombatState } from '../composables';
import type { CheckResult } from '../types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switchToNormal'): void;
}>();

const { initialize: initDiceSystem, roll } = useDiceSystem();
const { presets, loadPresets } = usePresets();
const { characters, attributeButtons, getAttributeValue } = useCharacterData();

const isRolling = ref(false);
const lastResult = ref<{ initiator: CheckResult; opponent: CheckResult; winner: string } | null>(null);
const showResult = ref(false);

const { initiatorName } = useCombatState();
const initiatorAttr = ref('');
const initiatorValue = ref<number | string>('');
const initiatorMod = ref<number | string>('');

const opponentName = ref('');
const opponentAttr = ref('');
const opponentValue = ref<number | string>('');
const opponentMod = ref<number | string>('');

const diceType = ref('1d100');
const successCriteria = ref('lte');
const activePresetId = ref('__default__');

const AVAILABLE_PRESETS = computed(() => {
  const list = presets.value.filter(p => p.visible !== false).map(p => ({ id: p.id!, name: p.name, dice: p.diceExpression || '1d100' }));
  return [
    { id: '__default__', name: 'COC', dice: '1d100' },
    { id: '__dnd__', name: 'DND', dice: '1d20' },
    ...list
  ];
});

function selectPreset(id: string) {
  activePresetId.value = id;
  const preset = AVAILABLE_PRESETS.value.find(p => p.id === id);
  if (preset) {
    diceType.value = preset.dice;
    successCriteria.value = preset.dice === '1d20' ? 'gte' : 'lte';
  }
}

function getDiceConfig() {
  try {
    const stored = localStorage.getItem('acu_dice_config');
    if (stored) return JSON.parse(stored);
  } catch {}
  return { critSuccessMax: 5, critFailMin: 96 };
}

async function handleRoll(): Promise<void> {
  if (isRolling.value) return;
  isRolling.value = true;

  try {
    const diceCfg = getDiceConfig();
    const formula = diceType.value;
    const isDND = formula === '1d20';
    const diceFace = parseInt(formula.split('d')[1] || '100', 10);
    
    const iMod = initiatorMod.value !== '' ? Number(initiatorMod.value) : 0;
    const oMod = opponentMod.value !== '' ? Number(opponentMod.value) : 0;
    
    let iTarget = initiatorValue.value !== '' ? Number(initiatorValue.value) : 50;
    let oTarget = opponentValue.value !== '' ? Number(opponentValue.value) : 50;
    
    const iRoll = roll(formula);
    const oRoll = roll(formula);
    
    const iTotal = iRoll.total + iMod;
    const oTotal = oRoll.total + oMod;
    
    const critSuccessMax = isDND ? 20 : (diceCfg.critSuccessMax || (diceFace === 100 ? 5 : Math.max(1, Math.floor(diceFace * 0.05))));
    const critFailMin = isDND ? 1 : (diceCfg.critFailMin || (diceFace === 100 ? 96 : Math.floor(diceFace * 0.95) + 1));
    
    let iSuccess = isDND ? iTotal >= iTarget : iTotal <= iTarget;
    let oSuccess = isDND ? oTotal >= oTarget : oTotal <= oTarget;
    
    const iCritSuccess = isDND ? iRoll.total >= 20 : iTotal <= critSuccessMax;
    const iCritFailure = isDND ? iRoll.total <= 1 : iTotal >= critFailMin;
    const oCritSuccess = isDND ? oRoll.total >= 20 : oTotal <= critSuccessMax;
    const oCritFailure = isDND ? oRoll.total <= 1 : oTotal >= critFailMin;
    
    let iOutcome = '';
    let oOutcome = '';
    
    if (iCritSuccess) iOutcome = '大成功！';
    else if (iCritFailure) iOutcome = '大失败！';
    else if (iSuccess) iOutcome = '成功';
    else iOutcome = '失败';
    
    if (oCritSuccess) oOutcome = '大成功！';
    else if (oCritFailure) oOutcome = '大失败！';
    else if (oSuccess) oOutcome = '成功';
    else oOutcome = '失败';
    
    let winner = 'tie';
    if (iCritSuccess && !oCritSuccess) winner = 'initiator';
    else if (oCritSuccess && !iCritSuccess) winner = 'opponent';
    else if (iCritFailure && !oCritFailure) winner = 'opponent';
    else if (oCritFailure && !iCritFailure) winner = 'initiator';
    else if (iSuccess && !oSuccess) winner = 'initiator';
    else if (oSuccess && !iSuccess) winner = 'opponent';
    else {
      if (isDND) {
        winner = iTotal > oTotal ? 'initiator' : iTotal < oTotal ? 'opponent' : 'tie';
      } else {
        winner = iTotal < oTotal ? 'initiator' : iTotal > oTotal ? 'opponent' : 'tie';
      }
    }
    
    lastResult.value = {
      initiator: {
        success: iSuccess,
        roll: iRoll.total,
        total: iTotal,
        target: iTarget,
        margin: isDND ? iTotal - iTarget : iTarget - iTotal,
        criticalSuccess: iCritSuccess,
        criticalFailure: iCritFailure,
        outcome: iOutcome,
        message: `${formula} = ${iRoll.breakdown}${iMod !== 0 ? ` ${iMod >= 0 ? '+' : ''}${iMod}` : ''} = ${iTotal}`,
        diceType: formula,
        presetId: activePresetId.value,
      },
      opponent: {
        success: oSuccess,
        roll: oRoll.total,
        total: oTotal,
        target: oTarget,
        margin: isDND ? oTotal - oTarget : oTarget - oTotal,
        criticalSuccess: oCritSuccess,
        criticalFailure: oCritFailure,
        outcome: oOutcome,
        message: `${formula} = ${oRoll.breakdown}${oMod !== 0 ? ` ${oMod >= 0 ? '+' : ''}${oMod}` : ''} = ${oTotal}`,
        diceType: formula,
        presetId: activePresetId.value,
      },
      winner,
    };
    showResult.value = true;
    
    const winnerName = winner === 'initiator' ? (initiatorName.value || '发起方') : winner === 'opponent' ? (opponentName.value || '对抗方') : '平局';
    const content = `<meta:对抗检定>\n元叙事：${initiatorName.value || '<user>'}与${opponentName.value || '对手'}进行【${initiatorAttr.value || '检定'}】对抗，掷出${iTotal} vs ${oTotal}，【${winnerName}${winner === 'tie' ? '' : '获胜'}】\n</meta:对抗检定>`;
    await sendToTextarea(content);
  } catch (e) {
    console.error('[OpposedCheckPanel] 掷骰失败:', e);
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
    console.warn('[OpposedCheckPanel] 发送到输入框失败:', e);
  }
}

function showHistory() {
  window.dispatchEvent(new CustomEvent('acu-show-changes-panel'));
}

function openSettings() {
  window.dispatchEvent(new CustomEvent('acu-open-settings-section', { detail: { section: 'general' } }));
}

onMounted(() => {
  initDiceSystem();
  loadPresets();
});
</script>

<template>
  <div class="acu-opposed-panel">
    <div class="acu-dice-panel-header">
      <div class="acu-dice-panel-title"><i class="fa-solid fa-people-arrows"></i> 对抗检定</div>
      <div class="acu-dice-panel-actions">
        <button title="切换到普通检定" @click="emit('switchToNormal')"><i class="fa-solid fa-dice-d20"></i></button>
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
            v-for="p in AVAILABLE_PRESETS"
            :key="p.id"
            class="acu-dice-quick-preset-btn"
            :class="{ active: activePresetId === p.id }"
            @click="selectPreset(p.id)"
          >
            {{ p.name }}
          </button>
        </div>
      </div>

      <div class="acu-opposed-side">
        <div class="acu-dice-section-title">
          <span><i class="fa-solid fa-user"></i> 发起方</span>
        </div>
        <div class="acu-dice-form-row cols-2">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input v-model="initiatorName" type="text" class="acu-dice-input" placeholder="<user>" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">属性名</div>
            <input v-model="initiatorAttr" type="text" class="acu-dice-input" placeholder="检定属性" />
          </div>
        </div>
        <div class="acu-dice-form-row cols-2">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">属性值</div>
            <input v-model="initiatorValue" type="text" class="acu-dice-input" placeholder="50" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">修正值</div>
            <input v-model="initiatorMod" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>
      </div>

      <div class="acu-opposed-side">
        <div class="acu-dice-section-title">
          <span><i class="fa-solid fa-user"></i> 对抗方</span>
        </div>
        <div class="acu-dice-form-row cols-2">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">名字</div>
            <input v-model="opponentName" type="text" class="acu-dice-input" placeholder="对手" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">属性名</div>
            <input v-model="opponentAttr" type="text" class="acu-dice-input" placeholder="检定属性" />
          </div>
        </div>
        <div class="acu-dice-form-row cols-2">
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">属性值</div>
            <input v-model="opponentValue" type="text" class="acu-dice-input" placeholder="50" />
          </div>
          <div class="acu-dice-field">
            <div class="acu-dice-form-label">修正值</div>
            <input v-model="opponentMod" type="text" class="acu-dice-input" placeholder="0" />
          </div>
        </div>
      </div>

      <div v-if="showResult && lastResult" class="acu-opposed-result">
        <div class="acu-result-side" :class="{ winner: lastResult.winner === 'initiator' }">
          <div class="acu-result-name">{{ initiatorName || '发起方' }}</div>
          <div class="acu-result-value" :class="{ success: lastResult.initiator.success, failure: !lastResult.initiator.success }">
            {{ lastResult.initiator.total }}
          </div>
          <div class="acu-result-outcome" :class="{ success: lastResult.initiator.success, failure: !lastResult.initiator.success }">
            {{ lastResult.initiator.outcome }}
          </div>
        </div>
        <div class="acu-result-vs">VS</div>
        <div class="acu-result-side" :class="{ winner: lastResult.winner === 'opponent' }">
          <div class="acu-result-name">{{ opponentName || '对抗方' }}</div>
          <div class="acu-result-value" :class="{ success: lastResult.opponent.success, failure: !lastResult.opponent.success }">
            {{ lastResult.opponent.total }}
          </div>
          <div class="acu-result-outcome" :class="{ success: lastResult.opponent.success, failure: !lastResult.opponent.success }">
            {{ lastResult.opponent.outcome }}
          </div>
        </div>
      </div>

      <button class="acu-dice-roll-btn" :disabled="isRolling" @click="handleRoll">
        <template v-if="showResult && lastResult">
          <span class="acu-winner-text">{{ lastResult.winner === 'tie' ? '平局！' : (lastResult.winner === 'initiator' ? (initiatorName || '发起方') : (opponentName || '对抗方')) + ' 获胜！' }}</span>
          <span class="acu-dice-retry-btn" @click.stop="showResult = false" role="button" tabindex="0">
            <i class="fa-solid fa-rotate-right"></i>
          </span>
        </template>
        <template v-else>
          <i class="fa-solid fa-dice" :class="{ 'fa-spin': isRolling }"></i>
          <span>{{ isRolling ? '掷骰中...' : '开始对抗！' }}</span>
        </template>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-opposed-panel {
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

.acu-opposed-side {
  padding: 8px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
}

.acu-dice-form-row {
  display: grid;
  gap: 8px;

  &.cols-2 {
    grid-template-columns: 1fr 1fr;
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
}

.acu-dice-input {
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

.acu-opposed-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
}

.acu-result-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s;

  &.winner {
    background: var(--acu-accent-light);
    border: 2px solid var(--acu-accent);
    transform: scale(1.05);
  }
}

.acu-result-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--acu-text-sub);
}

.acu-result-value {
  font-size: 28px;
  font-weight: 900;

  &.success {
    color: var(--acu-success);
  }
  &.failure {
    color: var(--acu-danger);
  }
}

.acu-result-outcome {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
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

.acu-result-vs {
  font-size: 18px;
  font-weight: 900;
  color: var(--acu-accent);
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

.acu-winner-text {
  font-size: 16px;
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
