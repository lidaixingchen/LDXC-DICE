<script setup lang="ts">
import type { BehaviorSettings, DisplaySettings, LegacySettings } from '@data/settings-manager';

defineProps<{
  settings: LegacySettings;
  display: DisplaySettings;
  behavior: BehaviorSettings;
}>();

const emit = defineEmits<{
  (e: 'updateLegacy', updates: Partial<LegacySettings>): void;
  (e: 'updateDisplay', field: keyof DisplaySettings, value: DisplaySettings[keyof DisplaySettings]): void;
  (e: 'updateBehavior', field: keyof BehaviorSettings, value: BehaviorSettings[keyof BehaviorSettings]): void;
}>();
</script>

<template>
  <div class="acu-config-group">
    <div class="acu-group-label">掷骰行为</div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>记住上次值</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="behavior.rememberLastValues" @change="emit('updateBehavior', 'rememberLastValues', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>快速投骰</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="behavior.quickRollEnabled" @change="emit('updateBehavior', 'quickRollEnabled', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div v-if="behavior.quickRollEnabled" class="acu-setting-row">
      <label>快速投骰修正</label>
      <input type="number" :value="behavior.quickRollModifier" @change="emit('updateBehavior', 'quickRollModifier', parseInt(($event.target as HTMLInputElement).value))" />
    </div>
    <div class="acu-setting-row">
      <label>结果显示模式</label>
      <select :value="display.resultDisplayMode" @change="emit('updateDisplay', 'resultDisplayMode', ($event.target as HTMLSelectElement).value as 'simple' | 'detailed' | 'verbose')">
        <option value="simple">简洁</option>
        <option value="detailed">详细</option>
        <option value="verbose">完整</option>
      </select>
    </div>

    <div class="acu-group-label">选项面板</div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>显示选项面板</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.showOptionPanel" @change="emit('updateLegacy', { showOptionPanel: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>点击选项自动发送</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.clickOptionToAutoSend" @change="emit('updateLegacy', { clickOptionToAutoSend: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>

    <div class="acu-group-label">确认与效果</div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>效果前确认</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="behavior.confirmBeforeEffect" @change="emit('updateBehavior', 'confirmBeforeEffect', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>自动应用效果</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="behavior.autoApplyEffects" @change="emit('updateBehavior', 'autoApplyEffects', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>显示效果确认</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="display.showEffectConfirmation" @change="emit('updateDisplay', 'showEffectConfirmation', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>

    <div class="acu-group-label">历史与显示</div>
    <div class="acu-setting-row">
      <label>历史记录条数</label>
      <input type="number" :value="behavior.historySize" @change="emit('updateBehavior', 'historySize', parseInt(($event.target as HTMLInputElement).value))" />
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>紧凑模式</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="display.compactMode" @change="emit('updateDisplay', 'compactMode', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>隐藏骰子结果</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.hideDiceResultFromUser" @change="emit('updateLegacy', { hideDiceResultFromUser: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>隐藏仪表盘按钮</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.hideDashboardButton" @change="emit('updateLegacy', { hideDashboardButton: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>屏蔽数据库弹窗</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.muteDatabaseToasts" @change="emit('updateLegacy', { muteDatabaseToasts: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
  </div>
</template>
