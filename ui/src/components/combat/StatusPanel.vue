<script setup lang="ts">
import type { StatusEffect } from '../../services';

defineProps<{
  statuses: StatusEffect[];
  newStatusName: string;
  newStatusType: StatusEffect['type'];
  newStatusIntensity: StatusEffect['intensity'];
  newStatusValue: number | string;
  newStatusRounds: number | string;
}>();

const emit = defineEmits<{
  (e: 'update:newStatusName', value: string): void;
  (e: 'update:newStatusType', value: StatusEffect['type']): void;
  (e: 'update:newStatusIntensity', value: StatusEffect['intensity']): void;
  (e: 'update:newStatusValue', value: number | string): void;
  (e: 'update:newStatusRounds', value: number | string): void;
  (e: 'addStatus'): void;
  (e: 'removeStatus', id: number): void;
  (e: 'clearAllStatuses'): void;
}>();
</script>

<template>
  <div class="acu-status-panel">
    <div class="acu-section-title">
      <i class="fa-solid fa-sparkles"></i>
      <span>状态效果</span>
      <button v-if="statuses.length > 0" class="acu-tiny-btn danger" @click="emit('clearAllStatuses')">清除全部</button>
    </div>
    <div v-if="statuses.length > 0" class="acu-status-list">
      <div
        v-for="s in statuses"
        :key="s.id"
        class="acu-status-item"
        :class="[`status-${s.type}`, `intensity-${s.intensity}`]"
      >
        <div class="acu-status-header">
          <span class="acu-status-name">{{ s.name }}</span>
          <span class="acu-status-badge" :class="s.intensity">{{ s.intensity }}</span>
          <span class="acu-status-type">{{ s.type }}</span>
          <button class="acu-status-remove" @click="emit('removeStatus', s.id)">×</button>
        </div>
        <div class="acu-status-detail">
          <span>值: {{ s.value }}</span>
          <span class="acu-rounds-info">剩余: {{ s.remainingRounds }}回合</span>
        </div>
        <div v-if="typeof s.remainingRounds === 'number' && s.remainingRounds > 0" class="acu-rounds-bar">
          <div class="acu-rounds-fill" :class="`rounds-${s.remainingRounds <= 1 ? 'critical' : s.remainingRounds <= 3 ? 'low' : 'ok'}`" :style="{ width: (s.totalRounds ? Math.min(s.remainingRounds / s.totalRounds * 100, 100) : Math.min(s.remainingRounds / 10 * 100, 100)) + '%' }"></div>
        </div>
      </div>
    </div>
    <div v-else class="acu-empty-hint">无状态效果</div>
    <div class="acu-status-add">
      <div class="acu-dice-form-row cols-5">
        <input :value="newStatusName" @input="emit('update:newStatusName', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="名称" />
        <select :value="newStatusType" @change="emit('update:newStatusType', ($event.target as HTMLSelectElement).value as any)" class="acu-dice-select">
          <option value="buff">增益</option>
          <option value="debuff">减益</option>
          <option value="dot">持续</option>
          <option value="control">控制</option>
          <option value="shield">护盾</option>
        </select>
        <select :value="newStatusIntensity" @change="emit('update:newStatusIntensity', ($event.target as HTMLSelectElement).value as any)" class="acu-dice-select">
          <option value="weak">弱</option>
          <option value="medium">中</option>
          <option value="strong">强</option>
        </select>
        <input :value="newStatusValue" @input="emit('update:newStatusValue', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="值" />
        <input :value="newStatusRounds" @input="emit('update:newStatusRounds', ($event.target as HTMLInputElement).value)" type="text" class="acu-dice-input" placeholder="回合" />
      </div>
      <button class="acu-tiny-btn accent" @click="emit('addStatus')">添加</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-status-panel {
  border: 1px solid var(--acu-border); border-radius: 6px; padding: 8px;
  .acu-section-title { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--acu-text-sub); margin-bottom: 6px; }
}
.acu-status-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
.acu-status-item {
  padding: 5px 8px; border-radius: 4px; border-left: 3px solid; font-size: 10px;
  &.intensity-weak { border-left-width: 2px; }
  &.intensity-medium { border-left-width: 3px; }
  &.intensity-strong { border-left-width: 4px; }
  &.status-buff { border-color: var(--acu-success-text, #27ae60); background: rgba(var(--acu-success-rgb, 39, 174, 96), 0.08); }
  &.status-debuff { border-color: var(--acu-error-text, #e74c3c); background: rgba(var(--acu-danger-rgb, 231, 76, 60), 0.08); }
  &.status-dot { border-color: var(--acu-warning-text, #f39c12); background: rgba(var(--acu-warning-rgb, 243, 156, 18), 0.08); }
  &.status-control { border-color: var(--acu-accent, #9b59b6); background: rgba(var(--acu-accent-rgb, 155, 89, 182), 0.08); }
  &.status-shield { border-color: var(--acu-color-info, #3498db); background: rgba(52, 152, 219, 0.08); }
}
.acu-status-header { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.acu-status-name { font-weight: 700; color: var(--acu-text-main); }
.acu-status-badge { font-size: 9px; padding: 0 4px; border-radius: 3px; &.weak { background: var(--acu-text-sub, #95a5a6); color: var(--acu-button-text-on-accent, white); } &.medium { background: var(--acu-warning-text, #f39c12); color: var(--acu-button-text-on-accent, white); } &.strong { background: var(--acu-error-text, #e74c3c); color: var(--acu-button-text-on-accent, white); } }
.acu-status-type { font-size: 9px; color: var(--acu-text-sub); }
.acu-status-remove { margin-left: auto; width: 16px; height: 16px; border-radius: 50%; border: none; background: transparent; color: var(--acu-text-sub); cursor: pointer; font-size: 12px; line-height: 1; display: flex; align-items: center; justify-content: center; &:hover { color: var(--acu-error-text, #e74c3c); background: rgba(var(--acu-danger-rgb, 231, 76, 60), 0.15); } }
.acu-status-detail { font-size: 9px; color: var(--acu-text-sub); margin-top: 2px; padding-left: 4px; display: flex; gap: 8px; }
.acu-rounds-bar { height: 3px; background: var(--acu-border); border-radius: 2px; overflow: hidden; margin-top: 3px; }
.acu-rounds-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; background: var(--acu-accent); &.rounds-ok { background: var(--acu-success, #27ae60); } &.rounds-low { background: var(--acu-warning, #f39c12); } &.rounds-critical { background: var(--acu-danger, #e74c3c); } }
.acu-status-add { margin-top: 4px; padding-top: 6px; border-top: 1px dashed var(--acu-border); .cols-5 { grid-template-columns: 1fr 70px 60px 50px 45px; gap: 3px; } .accent { background: var(--acu-accent); color: white; border-color: var(--acu-accent); &:hover { opacity: 0.85; } } }
.acu-empty-hint { font-size: 11px; color: var(--acu-text-sub); opacity: 0.6; }
.acu-dice-input, .acu-dice-select { width: 100%; height: 28px; padding: 0 8px; border-radius: 4px; border: 1px solid var(--acu-border); background: var(--acu-bg-header); color: var(--acu-text-main); font-size: 12px; outline: none; transition: border-color 0.15s; &:focus { border-color: var(--acu-accent); } }
.acu-dice-form-row { display: grid; gap: 8px; }
</style>
