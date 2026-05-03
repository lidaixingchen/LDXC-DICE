<script setup lang="ts">
import { computed } from 'vue';
import type { CheckResult } from '../types';

const props = defineProps<{
  result: CheckResult;
}>();

const resultClass = computed(() => {
  if (props.result.criticalSuccess) return 'acu-result-crit-success';
  if (props.result.criticalFailure) return 'acu-result-crit-failure';
  if (props.result.success) return 'acu-result-success';
  return 'acu-result-failure';
});

const resultIcon = computed(() => {
  if (props.result.criticalSuccess) return '🌟';
  if (props.result.criticalFailure) return '💀';
  if (props.result.success) return '✓';
  return '✗';
});

const marginText = computed(() => {
  const margin = props.result.margin;
  if (margin > 0) return `超出 ${margin}`;
  if (margin < 0) return `不足 ${Math.abs(margin)}`;
  return '刚好达标';
});
</script>

<template>
  <div class="acu-roll-result acu-glass-depth acu-animate-scale-in" :class="resultClass">
    <div class="acu-result-header">
      <div class="acu-result-badge">{{ resultIcon }}</div>
      <div class="acu-result-info">
        <div class="acu-result-outcome">{{ result.outcome }}</div>
        <div class="acu-result-msg">{{ result.message }}</div>
      </div>
    </div>

    <div class="acu-result-data">
      <div class="acu-data-item">
        <span class="label">投骰基础</span>
        <span class="val">{{ result.roll }}</span>
      </div>
      <div class="acu-data-item highlight">
        <span class="label">最终总计</span>
        <span class="val">{{ result.total }}</span>
      </div>
      <div class="acu-data-item">
        <span class="label">目标阈值</span>
        <span class="val">{{ result.target }}</span>
      </div>
      <div class="acu-data-item">
        <span class="label">判定余量</span>
        <span class="val" :class="result.margin >= 0 ? 'acu-text-success' : 'acu-text-danger'">
          {{ result.margin > 0 ? '+' : '' }}{{ result.margin }}
        </span>
      </div>
    </div>

    <div v-if="result.effects?.length" class="acu-result-effects">
      <div class="acu-effects-title">触发效果</div>
      <div v-for="eff in result.effects" :key="eff.effectId" class="acu-eff-chip">
        <i class="fa-solid" :class="eff.success ? 'fa-check-circle acu-text-success' : 'fa-times-circle acu-text-danger'"></i>
        <span class="eff-target">{{ eff.target }}</span>
        <span class="eff-delta" :class="eff.newValue > eff.oldValue ? 'up' : 'down'">
          {{ eff.oldValue }} <i class="fa-solid fa-arrow-right-long"></i> {{ eff.newValue }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-roll-result {
  margin-top: 12px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--acu-border);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.acu-result-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.acu-result-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--acu-bg-header);
  box-shadow: var(--acu-shadow-sm);
}

.acu-result-info {
  .acu-result-outcome { font-size: 18px; font-weight: 800; letter-spacing: 0.05em; }
  .acu-result-msg { font-size: 11px; color: var(--acu-text-sub); opacity: 0.8; }
}

.acu-result-data {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: var(--acu-bg-header);
  padding: 10px;
  border-radius: 12px;
}

.acu-data-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  .label { font-size: 9px; color: var(--acu-text-sub); font-weight: 600; }
  .val { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
  &.highlight .val { color: var(--acu-accent); font-size: 15px; }
}

.acu-result-effects {
  border-top: 1px dashed var(--acu-border);
  padding-top: 12px;
}

.acu-effects-title { font-size: 10px; font-weight: 700; color: var(--acu-text-sub); margin-bottom: 8px; }

.acu-eff-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--acu-bg-header);
  border-radius: 8px;
  margin-bottom: 4px;
  font-size: 11px;
  .eff-target { font-weight: 600; flex: 1; }
  .eff-delta { 
    font-family: var(--acu-font-family-mono, monospace);
    &.up { color: var(--acu-success); }
    &.down { color: var(--acu-danger); }
  }
}

/* 状态着色 */
.acu-result-success {
  border-color: var(--acu-success);
  .acu-result-badge { background: rgba(var(--acu-success-rgb), 0.2); color: var(--acu-success); }
  .acu-result-outcome { color: var(--acu-success); }
}

.acu-result-failure {
  border-color: var(--acu-danger);
  .acu-result-badge { background: rgba(var(--acu-danger-rgb), 0.2); color: var(--acu-danger); }
  .acu-result-outcome { color: var(--acu-danger); }
}

.acu-result-crit-success {
  border-color: var(--acu-warning);
  background: linear-gradient(135deg, rgba(var(--acu-accent-rgb), 0.1), rgba(var(--acu-warning-rgb), 0.1));
  .acu-result-badge { background: var(--acu-warning); color: var(--acu-button-text-on-accent, #000); box-shadow: 0 0 15px var(--acu-warning); }
  .acu-result-outcome { color: var(--acu-warning); text-shadow: 0 0 8px rgba(var(--acu-warning-rgb), 0.5); }
}

.acu-result-crit-failure {
  border-color: var(--acu-error-text, #ff0000);
  background: rgba(var(--acu-danger-rgb, 255, 0, 0), 0.05);
  .acu-result-badge { background: var(--acu-error-text, #ff0000); color: var(--acu-button-text-on-accent, #fff); animation: acu-shake 0.5s infinite; }
  .acu-result-outcome { color: var(--acu-error-text, #ff0000); }
}

@keyframes acu-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

@media (max-width: 500px) {
  .acu-result-data { grid-template-columns: repeat(2, 1fr); }
}
</style>
