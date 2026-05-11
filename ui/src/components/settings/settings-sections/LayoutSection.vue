<script setup lang="ts">
import { computed } from 'vue';
import type { BehaviorSettings, LegacySettings } from '@data/settings-manager';

const props = defineProps<{
  settings: LegacySettings;
  behavior: BehaviorSettings;
  allTableNames: string[];
}>();

const emit = defineEmits<{
  (e: 'updateLegacy', updates: Partial<LegacySettings>): void;
  (e: 'updateBehavior', field: keyof BehaviorSettings, value: BehaviorSettings[keyof BehaviorSettings]): void;
}>();

const areAllTablesReversed = computed(() => {
  const names = props.allTableNames;
  if (names.length === 0) return false;
  const reverseSet = new Set(props.settings.tableReverseKeys || []);
  return names.every(name => reverseSet.has(name));
});

function toggleAllTablesReverse(enabled: boolean) {
  const targetNames = props.allTableNames;
  if (targetNames.length === 0) return;
  const currentSet = new Set(props.settings.tableReverseKeys || []);
  if (enabled) {
    targetNames.forEach(name => currentSet.add(name));
  } else {
    targetNames.forEach(name => currentSet.delete(name));
  }
  emit('updateLegacy', { tableReverseKeys: Array.from(currentSet) });
}
</script>

<template>
  <div class="acu-config-group">
    <div class="acu-group-label">面板定位</div>
    <div class="acu-setting-row">
      <label>位置模式</label>
      <select :value="settings.positionMode" @change="emit('updateLegacy', { positionMode: ($event.target as HTMLSelectElement).value as 'fixed' | 'embedded' })">
        <option value="fixed">悬浮模式</option>
        <option value="embedded">内嵌模式</option>
      </select>
    </div>
    <div v-if="settings.positionMode === 'fixed'" class="acu-setting-row">
      <label>垂直偏移 ({{ settings.bottomOffset }}px)</label>
      <input type="range" min="0" max="300" :value="settings.bottomOffset" @input="emit('updateLegacy', { bottomOffset: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row">
      <label>面板弹出方向</label>
      <select :value="settings.panelExpandDirection || 'up'" @change="emit('updateLegacy', { panelExpandDirection: ($event.target as HTMLSelectElement).value as 'up' | 'down' })">
        <option value="up">向上弹出</option>
        <option value="down">向下弹出</option>
      </select>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>面板自动隐藏</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="behavior.autoHidePanel" @change="emit('updateBehavior', 'autoHidePanel', ($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div v-if="behavior.autoHidePanel" class="acu-setting-row">
      <label>自动隐藏延迟 ({{ behavior.autoHideDelay }}ms)</label>
      <input type="range" min="1000" max="30000" step="1000" :value="behavior.autoHideDelay" @input="emit('updateBehavior', 'autoHideDelay', parseInt(($event.target as HTMLInputElement).value))" />
    </div>

    <div class="acu-group-label">排列方式</div>
    <div class="acu-setting-row">
      <label>布局模式</label>
      <select :value="settings.layout" @change="emit('updateLegacy', { layout: ($event.target as HTMLSelectElement).value as 'horizontal' | 'vertical' })">
        <option value="horizontal">横向滚动</option>
        <option value="vertical">竖向滚动</option>
      </select>
    </div>
    <div class="acu-setting-row">
      <label>导航网格列数</label>
      <select :value="settings.gridColumns" @change="emit('updateLegacy', { gridColumns: ($event.target as HTMLSelectElement).value as 'auto' | '2' | '3' | '4' })">
        <option value="auto">智能适配</option>
        <option value="2">2 列</option>
        <option value="3">3 列</option>
        <option value="4">4 列</option>
      </select>
    </div>
    <div class="acu-setting-row">
      <label>每页显示条数</label>
      <input type="number" min="10" max="200" step="10" :value="settings.itemsPerPage" @change="emit('updateLegacy', { itemsPerPage: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>显示横向滚动条</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.showHorizontalScrollbar" @change="emit('updateLegacy', { showHorizontalScrollbar: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>倒序显示</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="areAllTablesReversed" @change="toggleAllTablesReverse(($event.target as HTMLInputElement).checked)" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>

    <div class="acu-group-label">导航栏</div>
    <div class="acu-setting-row">
      <label>收起显示形态</label>
      <select :value="settings.collapseStyle" @change="emit('updateLegacy', { collapseStyle: ($event.target as HTMLSelectElement).value as 'bar' | 'dot' | 'icon' })">
        <option value="bar">横条风格</option>
        <option value="dot">圆点风格</option>
        <option value="icon">迷你图标</option>
      </select>
    </div>
    <div class="acu-setting-row">
      <label>对齐方向</label>
      <select :value="settings.collapseAlign" @change="emit('updateLegacy', { collapseAlign: ($event.target as HTMLSelectElement).value as 'left' | 'right' | 'center' })">
        <option value="right">右对齐</option>
        <option value="left">左对齐</option>
        <option value="center">居中</option>
      </select>
    </div>
    <div class="acu-setting-row">
      <label>导航按钮高度 ({{ settings.navButtonHeight }}px)</label>
      <input type="range" min="24" max="64" :value="settings.navButtonHeight" @input="emit('updateLegacy', { navButtonHeight: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row">
      <label>导航图标大小 ({{ settings.navButtonIconSize }}px)</label>
      <input type="range" min="8" max="24" :value="settings.navButtonIconSize" @input="emit('updateLegacy', { navButtonIconSize: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row acu-setting-row-toggle">
      <label>功能按钮分行显示</label>
      <label class="acu-toggle">
        <input type="checkbox" :checked="settings.splitNavActions" @change="emit('updateLegacy', { splitNavActions: ($event.target as HTMLInputElement).checked })" />
        <span class="acu-toggle-slider"></span>
      </label>
    </div>

    <div class="acu-group-label">动作栏</div>
    <div class="acu-setting-row">
      <label>动作栏位置</label>
      <select :value="settings.actionsPosition" @change="emit('updateLegacy', { actionsPosition: ($event.target as HTMLSelectElement).value as 'top' | 'bottom' })">
        <option value="bottom">底部停靠</option>
        <option value="top">顶部停靠</option>
      </select>
    </div>
    <div class="acu-setting-row">
      <label>动作栏按钮尺寸 ({{ settings.actionButtonSize }}px)</label>
      <input type="range" min="24" max="56" :value="settings.actionButtonSize" @input="emit('updateLegacy', { actionButtonSize: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
    <div class="acu-setting-row">
      <label>动作栏图标大小 ({{ settings.actionButtonIconSize }}px)</label>
      <input type="range" min="8" max="20" :value="settings.actionButtonIconSize" @input="emit('updateLegacy', { actionButtonIconSize: parseInt(($event.target as HTMLInputElement).value) })" />
    </div>
  </div>
</template>
