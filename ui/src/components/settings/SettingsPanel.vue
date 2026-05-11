<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import type {
  AdvancedSettings,
  BehaviorSettings,
  DiceSystemSettings,
  DisplaySettings,
  GeneralSettings,
  LegacySettings,
  ValidationSettings,
} from '@data/settings-manager';
import { settingsManager } from '@data/settings-manager';
import { useDashboard } from '../../composables/data/useDashboard';

import AppearanceSection from './settings-sections/AppearanceSection.vue';
import LayoutSection from './settings-sections/LayoutSection.vue';
import InteractionSection from './settings-sections/InteractionSection.vue';
import DataSection from './settings-sections/DataSection.vue';
import ManagersSection from './settings-sections/ManagersSection.vue';
import AdvancedSection from './settings-sections/AdvancedSection.vue';

import AttributeRuleManager from '../character/AttributeRuleManager.vue';
import BlacklistManager from './BlacklistManager.vue';
import BookmarkManager from './BookmarkManager.vue';
import DebugConsole from '../dev/DebugConsole.vue';
import InteractionManager from '../layout/InteractionManager.vue';
import PresetManager from '../presets/PresetManager.vue';
import RegexManager from './RegexManager.vue';

const props = defineProps<{
  requestedSection?: string;
  requestedSectionVersion?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'themeChange', theme: string): void;
}>();

const settings = ref<LegacySettings>(settingsManager.getLegacySettings());
const general = ref<GeneralSettings>(settingsManager.getGroup('general'));
const display = ref<DisplaySettings>(settingsManager.getGroup('display'));
const behavior = ref<BehaviorSettings>(settingsManager.getGroup('behavior'));
const validation = ref<ValidationSettings>(settingsManager.getGroup('validation'));
const advanced = ref<AdvancedSettings>(settingsManager.getGroup('advanced'));

const { getTableData } = useDashboard();
const activeSection = ref('appearance');

const tables = computed(() => {
  const rawData = getTableData();
  if (!rawData) return [];
  const sheetTables = Object.keys(rawData)
    .filter(k => k.startsWith('sheet_'))
    .map(k => ({ key: k, name: rawData[k].name }));
  const orderKeys = settings.value.tableOrderKeys;
  if (!orderKeys || orderKeys.length === 0) return sheetTables;
  const orderMap = new Map(orderKeys.map((k, i) => [k, i]));
  return [...sheetTables].sort((a, b) => {
    const ia = orderMap.get(a.key) ?? 999;
    const ib = orderMap.get(b.key) ?? 999;
    return ia - ib;
  });
});

const allTableNames = computed(() => tables.value.map(t => t.name));

// --- 管理器状态 ---
const activeManager = ref<string | null>(null);
const previousSection = ref('managers');

function openAdvancedManager(type: string) {
  const managerMap: Record<string, string> = {
    '预设管理': 'preset',
    '交互规则': 'interaction',
    '正则规则': 'regex',
    '属性规则': 'attribute',
    '变量过滤': 'blacklist',
    '书签管理': 'bookmark',
    'Debug': 'debug',
  };
  if (managerMap[type]) {
    previousSection.value = activeSection.value;
    activeManager.value = managerMap[type];
    activeSection.value = 'manager-view';
  } else {
    alert(`即将打开 ${type} 管理器\n此功能需要单独的管理器组件支持`);
  }
}

function closeManager() {
  activeManager.value = null;
  activeSection.value = previousSection.value;
}

// --- 设置同步 ---
function syncAll() {
  settings.value = { ...settingsManager.getLegacySettings() };
  general.value = { ...settingsManager.getGroup('general') };
  display.value = { ...settingsManager.getGroup('display') };
  behavior.value = { ...settingsManager.getGroup('behavior') };
  validation.value = { ...settingsManager.getGroup('validation') };
  advanced.value = { ...settingsManager.getGroup('advanced') };
}

function updateLegacy(updates: Partial<LegacySettings>) {
  settingsManager.updateLegacySettings(updates);
  syncAll();
  if (updates.theme) {
    emit('themeChange', updates.theme);
  }
}

function updateGroupSetting<K extends keyof DiceSystemSettings, F extends keyof DiceSystemSettings[K]>(
  group: K,
  field: F,
  value: DiceSystemSettings[K][F],
) {
  settingsManager.updateValue(group, field, value);
  syncAll();
}

function updateDisplayField(field: keyof DisplaySettings, value: DisplaySettings[keyof DisplaySettings]) {
  updateGroupSetting('display', field, value);
}

function updateGeneralField(field: keyof GeneralSettings, value: GeneralSettings[keyof GeneralSettings]) {
  updateGroupSetting('general', field, value);
}

function updateBehaviorField(field: keyof BehaviorSettings, value: BehaviorSettings[keyof BehaviorSettings]) {
  updateGroupSetting('behavior', field, value);
}

function updateValidationField(field: keyof ValidationSettings, value: ValidationSettings[keyof ValidationSettings]) {
  updateGroupSetting('validation', field, value);
}

function updateAdvancedField(field: keyof AdvancedSettings, value: AdvancedSettings[keyof AdvancedSettings]) {
  updateGroupSetting('advanced', field, value);
}

function clearSystemCache() {
  if (window.confirm('确认清除ACU缓存？')) {
    window.localStorage.clear();
    window.location.reload();
  }
}

function resetAllSettings() {
  if (window.confirm('确认重置所有设置为默认值？')) {
    settingsManager.resetAll();
    syncAll();
  }
}

const validSections = ['appearance', 'layout', 'interaction', 'data', 'managers', 'advanced', 'manager-view'];

onMounted(() => {
  if (props.requestedSection && validSections.includes(props.requestedSection)) {
    activeSection.value = props.requestedSection;
  }
  settingsManager.onChange(syncAll);
});

onActivated(() => {
  if (!validSections.includes(activeSection.value)) {
    activeSection.value = 'appearance';
  }
});
</script>

<template>
  <div class="acu-settings-container">
    <div class="acu-panel-header">
      <div class="acu-panel-title"><i class="fa-solid fa-sliders"></i> <span>系统设置</span></div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <!-- 管理器视图：替换整个设置内容 -->
      <div v-if="activeManager" class="acu-manager-view">
        <PresetManager v-if="activeManager === 'preset'" @close="closeManager" />
        <InteractionManager v-else-if="activeManager === 'interaction'" @close="closeManager" />
        <RegexManager v-else-if="activeManager === 'regex'" @close="closeManager" />
        <AttributeRuleManager v-else-if="activeManager === 'attribute'" @close="closeManager" />
        <BlacklistManager v-else-if="activeManager === 'blacklist'" @close="closeManager" />
        <BookmarkManager v-else-if="activeManager === 'bookmark'" @close="closeManager" />
        <DebugConsole v-else-if="activeManager === 'debug'" @close="closeManager" />
      </div>

      <!-- 设置布局：侧边导航 + 主配置区 -->
      <div v-else class="acu-settings-layout">
        <aside class="acu-settings-nav">
          <button
            v-for="item in [
              { k: 'appearance', l: '外观', i: 'fa-palette' },
              { k: 'layout', l: '布局', i: 'fa-th-large' },
              { k: 'interaction', l: '交互', i: 'fa-gamepad' },
              { k: 'data', l: '数据', i: 'fa-database' },
              { k: 'managers', l: '管理器', i: 'fa-folder-open' },
              { k: 'advanced', l: '高级', i: 'fa-cog' },
            ]"
            :key="item.k"
            :class="{ active: activeSection === item.k }"
            @click="activeSection = item.k"
          >
            <i class="fa-solid" :class="item.i"></i> {{ item.l }}
          </button>
        </aside>

        <main class="acu-settings-main">
          <AppearanceSection
            v-if="activeSection === 'appearance'"
            :settings="settings"
            :general="general"
            :display="display"
            @update-legacy="updateLegacy"
            @update-display="updateDisplayField"
            @update-general="updateGeneralField"
          />

          <LayoutSection
            v-if="activeSection === 'layout'"
            :settings="settings"
            :behavior="behavior"
            :all-table-names="allTableNames"
            @update-legacy="updateLegacy"
            @update-behavior="updateBehaviorField"
          />

          <InteractionSection
            v-if="activeSection === 'interaction'"
            :settings="settings"
            :display="display"
            :behavior="behavior"
            @update-legacy="updateLegacy"
            @update-display="updateDisplayField"
            @update-behavior="updateBehaviorField"
          />

          <DataSection
            v-if="activeSection === 'data'"
            :settings="settings"
            :tables="tables"
            @update-legacy="updateLegacy"
          />

          <ManagersSection
            v-if="activeSection === 'managers'"
            @open-manager="openAdvancedManager"
          />

          <AdvancedSection
            v-if="activeSection === 'advanced'"
            :general="general"
            :validation="validation"
            :advanced="advanced"
            @update-general="updateGeneralField"
            @update-validation="updateValidationField"
            @update-advanced="updateAdvancedField"
            @clear-cache="clearSystemCache"
            @reset-settings="resetAllSettings"
          />
        </main>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
/* 管理器视图 */
.acu-manager-view {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

/* 统一设置面板宽度与内容区一致 */
.acu-settings-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 320px;
  height: 100%;
  max-height: 500px;
  background: var(--acu-bg-panel);
}

.acu-settings-layout {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px;
  padding: 0 !important;
}

.acu-settings-nav {
  background: var(--acu-bg-header);
  border-right: 1px solid var(--acu-border);
  display: flex;
  flex-direction: column;
  button {
    background: transparent;
    border: none;
    padding: 12px 4px;
    color: var(--acu-text-sub);
    font-size: 11px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    i {
      font-size: 16px;
    }
    &.active {
      color: var(--acu-accent);
      background: var(--acu-bg-panel);
      font-weight: bold;
    }
  }
}

.acu-settings-main {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.acu-group-label {
  font-size: 10px;
  font-weight: 900;
  color: var(--acu-accent);
  margin: 12px 0 8px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-tag-experimental {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  color: var(--acu-text-sub);
  background: var(--acu-bg-header);
  border: 1px solid var(--acu-border);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 6px;
  vertical-align: middle;
  opacity: 0.7;
}

.acu-setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  label {
    font-size: 12px;
    color: var(--acu-text-main);
  }
  select,
  input[type='number'],
  input[type='text'] {
    height: 24px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    color: var(--acu-text-main);
    font-size: 11px;
    padding: 0 8px;
    min-width: 120px;
  }
  input[type='text'] {
    width: 100%;
  }
  &.checkbox {
    cursor: pointer;
  }
}

/* 主题预览 */
.acu-theme-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  min-height: 220px;
}

.acu-theme-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  max-height: 260px;
  padding-right: 2px;
}

.acu-theme-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
  &:hover { background: var(--acu-bg-header); }
  &.active {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
  }
}

.acu-theme-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--acu-border);
  display: flex;
  flex-direction: column;
}

.swatch-bg { flex: 2; }
.swatch-accent { flex: 1; }

.acu-theme-opt-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.acu-theme-opt-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--acu-text-main);
  line-height: 1.2;
}

.acu-theme-opt-sub {
  font-size: 9px;
  color: var(--acu-text-dim);
}

.acu-theme-check {
  margin-left: auto;
  font-size: 10px;
  color: var(--acu-accent);
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.acu-theme-option.active .acu-theme-check { opacity: 1; }

.acu-theme-preview {
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.acu-theme-pv-header {
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid;
  transition: all 0.3s;
}

.acu-theme-pv-title {
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.3s;
}

.acu-theme-pv-body {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.3s;
}

.acu-theme-pv-label {
  font-size: 7px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-bottom: 3px;
  border-bottom: 1px solid;
  transition: all 0.3s;
}

.acu-theme-pv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
  transition: color 0.3s;
}

.acu-theme-pv-input {
  width: 44px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid;
  transition: all 0.3s;
}

.acu-theme-pv-toggle {
  width: 22px;
  height: 11px;
  border-radius: 6px;
  position: relative;
  transition: all 0.3s;
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff;
  }
}

.acu-theme-pv-btns {
  display: flex;
  gap: 4px;
  margin-top: auto;
}

.acu-theme-pv-btn {
  flex: 1;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 7px;
  font-weight: 600;
  text-align: center;
  border: 1px solid;
  transition: all 0.3s;
}

.acu-theme-pv-nav {
  display: flex;
  gap: 2px;
  padding: 5px 8px;
  border-top: 1px solid;
  transition: all 0.3s;
}

.acu-theme-pv-navbtn {
  flex: 1;
  height: 14px;
  border-radius: 3px;
  font-size: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  transition: all 0.3s;
}

/* 按钮组 */
.acu-btn-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 8px 0;
  &.vertical {
    flex-direction: column;
  }
}

.acu-half-btn {
  flex: 1;
  min-width: 80px;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }
  &.primary {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }
  &.danger {
    border-color: var(--acu-error-text, #e74c3c);
    color: var(--acu-error-text, #e74c3c);
    &:hover {
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
    }
  }
  &.special {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.acu-full-btn {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }
  &.danger {
    border-color: var(--acu-error-text, #e74c3c);
    color: var(--acu-error-text, #e74c3c);
    &:hover {
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
    }
  }
}

/* 规则列表 */
.acu-rule-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  background: var(--acu-bg-header);
}

.acu-rule-item {
  padding: 8px;
  border-bottom: 1px solid var(--acu-border);
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: var(--acu-bg-panel);
  }
}

.acu-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.acu-rule-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-rule-actions {
  display: flex;
  gap: 4px;
  button {
    background: transparent;
    border: none;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--acu-text-sub);
    font-size: 12px;
    transition: all 0.2s;
    &:hover {
      background: var(--acu-accent-light);
      color: var(--acu-accent);
    }
    &.active {
      color: var(--acu-accent);
    }
    &.danger:hover {
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
      color: var(--acu-error-text, #e74c3c);
    }
  }
}

.acu-rule-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  margin-bottom: 4px;
}

.acu-rule-target {
  color: var(--acu-text-sub);
}
.acu-rule-type {
  background: var(--acu-accent-light);
  color: var(--acu-accent);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.acu-rule-desc {
  font-size: 10px;
  color: var(--acu-text-sub);
  line-height: 1.4;
}

.acu-regex-pattern {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  background: var(--acu-bg-panel);
  padding: 2px 6px;
  border-radius: 3px;
  display: block;
  word-break: break-all;
}

/* 模态框样式 */
.acu-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--acu-overlay-bg, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--acu-z-modal-backdrop, 31010);
}

.acu-modal {
  background: var(--acu-bg-panel);
  border-radius: var(--acu-radius-lg, 8px);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--acu-shadow-lg, 0 4px 20px rgba(0, 0, 0, 0.3));
  z-index: var(--acu-z-modal, 31100);
}

.acu-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--acu-border);
  font-weight: 600;
  color: var(--acu-text-main);
  button {
    background: transparent;
    border: none;
    color: var(--acu-text-sub);
    cursor: pointer;
    font-size: 16px;
    &:hover {
      color: var(--acu-accent);
    }
  }
}

.acu-modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.acu-form-row {
  margin-bottom: 12px;
  label {
    display: block;
    font-size: 11px;
    color: var(--acu-text-sub);
    margin-bottom: 4px;
  }
  input,
  textarea,
  select {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    color: var(--acu-text-main);
    font-size: 12px;
  }
  textarea {
    min-height: 60px;
    resize: vertical;
  }
  &.checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    label {
      margin: 0;
    }
    input {
      width: auto;
    }
  }
}

.acu-modal-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--acu-border);
}

/* 表格排序 */
.acu-table-order-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-table-order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
}

.acu-order-num {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--acu-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.acu-table-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: var(--acu-text);
}

.acu-order-actions {
  display: flex;
  gap: 2px;
  button {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--acu-border);
    border-radius: 4px;
    background: var(--acu-bg-header);
    color: var(--acu-text);
    cursor: pointer;
    font-size: 10px;
    padding: 0;
    &:hover:not(:disabled) {
      background: var(--acu-accent);
      color: #fff;
    }
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }
}

.acu-order-hint {
  font-size: 10px;
  color: var(--acu-text-sub);
  opacity: 0.6;
  padding: 4px 0;
}

/* 验证结果样式 */
.acu-validation-results {
  margin-top: 12px;
  border: 1px solid var(--acu-error-border, rgba(231, 76, 60, 0.5));
  border-radius: var(--acu-radius-md, 6px);
  background: var(--acu-bg-header);
  overflow: hidden;
}

.acu-validation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--acu-error-bg, rgba(231, 76, 60, 0.1));
  border-bottom: 1px solid var(--acu-error-border, rgba(231, 76, 60, 0.5));
}

.acu-validation-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--acu-error-text, #e74c3c);
  display: flex;
  align-items: center;
  gap: 6px;
}

.acu-clear-btn {
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  &:hover {
    background: var(--acu-error-bg, rgba(231, 76, 60, 0.1));
    color: var(--acu-error-text, #e74c3c);
  }
}

.acu-validation-tables {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-validation-table-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  &:hover {
    border-color: var(--acu-accent);
  }
  &.active {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
    color: var(--acu-accent);
  }
}

.acu-error-count {
  background: var(--acu-error-text, #e74c3c);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.acu-validation-errors {
  max-height: 200px;
  overflow-y: auto;
}

.acu-validation-error-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: var(--acu-bg-panel);
  }
}

.acu-error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.acu-error-row {
  font-size: 11px;
  font-weight: 600;
  color: var(--acu-accent);
  display: flex;
  align-items: center;
  gap: 4px;
}

.acu-error-row-title {
  font-weight: normal;
  color: var(--acu-text-sub);
  font-size: 10px;
}

.acu-error-column {
  font-size: 10px;
  color: var(--acu-text-sub);
  background: var(--acu-bg-panel);
  padding: 2px 6px;
  border-radius: 3px;
}

.acu-error-message {
  font-size: 11px;
  color: var(--acu-error-text, #e74c3c);
  margin-bottom: 4px;
  line-height: 1.4;
}

.acu-error-value {
  font-size: 10px;
  color: var(--acu-text-sub);
  margin-bottom: 2px;
  code {
    background: var(--acu-bg-panel);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    color: var(--acu-text-main);
  }
}

.acu-error-label {
  color: var(--acu-text-sub);
  margin-right: 4px;
}

.acu-error-rule {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-error-type {
  background: var(--acu-accent-light);
  color: var(--acu-accent);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  margin-left: 4px;
}
</style>
