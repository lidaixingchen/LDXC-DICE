<script setup lang="ts">
import { settingsManager, type LegacySettings } from '@data/settings-manager';
import { computed, onMounted, onUnmounted, ref, provide } from 'vue';
import { useDiceSystem, usePresets } from '../composables';
import { useDashboard } from '../composables/useDashboard';
import ChangesPanel from './ChangesPanel.vue';
import DashboardPanel from './DashboardPanel.vue';
import DicePanel from './DicePanel.vue';
import FavoritesPanel from './FavoritesPanel.vue';
import GeneratePanel from './GeneratePanel.vue';
import MvuPanel from './MvuPanel.vue';
import RelationGraph from './RelationGraph.vue';
import SettingsPanel from './SettingsPanel.vue';
import SavePanel from './SavePanel.vue';
import DiceHistoryPanel from './DiceHistoryPanel.vue';
import PresetManager from './PresetManager.vue';
import TableBrowser from './TableBrowser.vue';

const { getTableData } = useDashboard();
const { initialize } = useDiceSystem();
const { loadPresets } = usePresets();

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

const activeStatuses = ref<StatusEffect[]>([]);
const combat = ref<CombatState>({
  active: false,
  round: 1,
  enemyName: '',
  enemyMaxHP: 100,
  enemyCurrentHP: 100,
  playerMaxHP: 100,
  playerCurrentHP: 100,
  playerShield: 0,
});

provide('aidmStatuses', activeStatuses);
provide('aidmCombat', combat);

// 面板状态
const activeTab = ref<string>('');
const isCollapsed = ref(false);
const showDashboard = ref(false);
const showDice = ref(false);
const showChanges = ref(false);
const showMvu = ref(false);
const showFavorites = ref(false);
const showSettings = ref(false);
const showSave = ref(false);
const showGenerate = ref(false);
const showDiceHistory = ref(false);
const showPresetManager = ref(false);
const showOpposedCheck = ref(false);
const isOptionsCollapsed = ref(false);

const legacySettings = computed<LegacySettings>(() => settingsManager.getLegacySettings());
let tableRefreshTimer: ReturnType<typeof setInterval> | null = null;
const tables = ref<{ key: string; name: string; icon: string }[]>([]);

const SPECIAL_NAV_ITEMS = [
  { key: '__dice__', icon: 'fa-dice-d20', label: '掷骰', id: 'acu-btn-dice-nav' },
  { key: '__changes__', icon: 'fa-code-compare', label: '审核', id: 'acu-btn-changes' },
  { key: '__mvu__', icon: 'fa-code-branch', label: '变量', id: 'acu-btn-mvu' },
  { key: '__favorites__', icon: 'fa-star', label: '收藏', id: 'acu-btn-favorites' },
  { key: '__generate__', icon: 'fa-wand-magic-sparkles', label: '生成', id: 'acu-btn-generate-nav' },
  { key: '__save__', icon: 'fa-floppy-disk', label: '存档', id: 'acu-btn-save-nav' },
];

const ACTION_BUTTONS = [
  { id: 'acu-btn-open-editor', icon: 'fa-database', title: '打开数据库' },
  { id: 'acu-btn-open-visualizer', icon: 'fa-table-columns', title: '可视化编辑' },
  { id: 'acu-btn-settings', icon: 'fa-cog', title: '设置' },
  { id: 'acu-btn-collapse', icon: 'fa-chevron-down', title: '收起' },
];

function getIconForTableName(name: string): string {
  if (name.includes('全局')) return 'fa-globe';
  if (name.includes('角色') || name.includes('人物')) return 'fa-users';
  if (name.includes('地图')) return 'fa-map-location-dot';
  if (name.includes('任务')) return 'fa-scroll';
  if (name.includes('物品') || name.includes('背包')) return 'fa-box-open';
  return 'fa-table';
}

function loadTables() {
  const rawData = getTableData();
  if (!rawData) return;
  const newTables: { key: string; name: string; icon: string }[] = [];
  for (const key in rawData) {
    if (key.startsWith('sheet_')) {
      const sheet = rawData[key];
      if (sheet?.name) newTables.push({ key, name: sheet.name, icon: getIconForTableName(sheet.name) });
    }
  }
  tables.value = newTables;
}

function handleNavClick(key: string) {
  const isSpecial = key.startsWith('__');
  const isActive = isNavItemActive({ key, isTable: !isSpecial });
  closeAllPanels();
  activeTab.value = '';
  if (isActive) return;
  if (key === '__dashboard__') showDashboard.value = true;
  else if (key === '__dice__') showDice.value = true;
  else if (key === '__changes__') showChanges.value = true;
  else if (key === '__mvu__') showMvu.value = true;
  else if (key === '__favorites__') showFavorites.value = true;
  else if (key === '__generate__') showGenerate.value = true;
  else if (key === '__save__') showSave.value = true;
  else activeTab.value = key;
}

function closeAllPanels() {
  showDashboard.value = false;
  showDice.value = false;
  showChanges.value = false;
  showMvu.value = false;
  showFavorites.value = false;
  showSettings.value = false;
  showSave.value = false;
  showGenerate.value = false;
  showDiceHistory.value = false;
  showPresetManager.value = false;
  showOpposedCheck.value = false;
}

function isNavItemActive(item: any): boolean {
  if (item.isTable) return activeTab.value === item.key;
  if (item.key === '__dice__') return showDice.value;
  if (item.key === '__changes__') return showChanges.value;
  if (item.key === '__mvu__') return showMvu.value;
  if (item.key === '__favorites__') return showFavorites.value;
  if (item.key === '__generate__') return showGenerate.value;
  if (item.key === '__save__') return showSave.value;
  if (item.key === '__dashboard__') return showDashboard.value;
  return false;
}

function handleActionClick(id: string) {
  if (id === 'acu-btn-collapse') isCollapsed.value = true;
  else if (id === 'acu-btn-settings') {
    const wasOpen = showSettings.value;
    closeAllPanels();
    activeTab.value = '';
    showSettings.value = !wasOpen;
  } else if (id === 'acu-btn-open-editor') {
    (window.parent as any).AutoCardUpdaterAPI?.openSettings?.();
  } else if (id === 'acu-btn-open-visualizer') {
    (window.parent as any).AutoCardUpdaterAPI?.openVisualizer?.();
  }
}

async function handleOptionClick(optionValue: string) {
  const config = legacySettings.value;

  if (!config.clickOptionToAutoSend) {
    try {
      const textarea = document.querySelector('#send_textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(textarea, textarea.value + (textarea.value ? ' ' : '') + optionValue);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          textarea.value += (textarea.value ? ' ' : '') + optionValue;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
        textarea.focus();
      }
    } catch (err) {
      console.error('[DICE]ACU 填充选项失败', err);
    }
    return;
  }

  try {
    const TavernHelper = (window as any).TavernHelper;
    if (TavernHelper?.createChatMessages) {
      await TavernHelper.createChatMessages(
        [{ role: 'user', message: optionValue }],
        { refresh: 'affected' },
      );
      if (TavernHelper.triggerSlash) {
        await TavernHelper.triggerSlash('/trigger');
      }
      return;
    }
  } catch (err) {
    console.warn('[DICE]ACU TavernHelper 发送失败，尝试备用方案', err);
  }

  try {
    const sendButton = document.querySelector('#send_but') as HTMLElement | null;
    const textarea = document.querySelector('#send_textarea') as HTMLTextAreaElement | null;
    if (textarea && sendButton) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea, optionValue);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        textarea.value = optionValue;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
      sendButton.click();
    }
  } catch (fallbackErr) {
    console.error('[DICE]ACU 备用发送方案也失败', fallbackErr);
  }
}

const options = computed(() => {
  try {
    const rawData = getTableData();
    if (!rawData) return [];
    const results: string[] = [];
    for (const key in rawData) {
      if (rawData[key].name?.includes('选项')) {
        const rows = rawData[key].content?.slice(1) || [];
        rows.forEach((row: any[]) => {
          row.slice(1).forEach((cell: any) => {
            if (cell && String(cell).trim()) results.push(String(cell).trim());
          });
        });
      }
    }
    return results;
  } catch {
    return [];
  }
});

const shouldShowTableList = computed(() => {
  if (!activeTab.value) return false;
  const name = tables.value.find(t => t.key === activeTab.value)?.name || '';
  return activeTab.value.toLowerCase().includes('global') || name.includes('全局');
});

const wrapperClass = computed(() => [
  `acu-theme-${legacySettings.value.theme}`,
  `acu-mode-${legacySettings.value.positionMode || 'fixed'}`,
  `acu-layout-${legacySettings.value.layout || 'horizontal'}`,
  `acu-panel-expand-${legacySettings.value.panelExpandDirection || 'up'}`,
  { 'acu-has-active-panel': showDataDisplay.value },
  { 'acu-collapsed-active': isCollapsed.value },
]);

const showDataDisplay = computed(
  () =>
    showDashboard.value ||
    showDice.value ||
    showChanges.value ||
    showMvu.value ||
    showFavorites.value ||
    showSettings.value ||
    showSave.value ||
    showGenerate.value ||
    showDiceHistory.value ||
    showPresetManager.value ||
    showOpposedCheck.value ||
    activeTab.value !== '',
);

const gridCols = computed(() => {
  if (legacySettings.value.gridColumns && legacySettings.value.gridColumns !== 'auto')
    return legacySettings.value.gridColumns;
  const n = navItems.value.length + (legacySettings.value.hideDashboardButton ? 0 : 1);
  if (n <= 4) return n < 2 ? 2 : n;
  return 4;
});

const navItems = computed(() => {
  const hidden = new Set(legacySettings.value.hiddenTableKeys || []);
  const special = SPECIAL_NAV_ITEMS.filter(i => !hidden.has(i.key)).map(i => ({ ...i, isTable: false }));
  const tableItems = tables.value.filter(t => !hidden.has(t.key)).map(t => ({ ...t, isTable: true, label: t.name }));
  const all = [...special, ...tableItems];
  if (legacySettings.value.tableOrderKeys?.length) {
    const orderMap = new Map(legacySettings.value.tableOrderKeys.map((k, i) => [k, i]));
    all.sort((a, b) => (orderMap.get(a.key) ?? 9999) - (orderMap.get(b.key) ?? 9999));
  }
  return all;
});

onMounted(() => {
  initialize();
  loadPresets();
  loadTables();
  tableRefreshTimer = setInterval(loadTables, 3000);

  window.addEventListener('acu-show-changes-panel', () => {
    closeAllPanels();
    activeTab.value = '';
    showChanges.value = true;
  });

  window.addEventListener('acu-open-settings-section', ((e: CustomEvent) => {
    closeAllPanels();
    activeTab.value = '';
    showSettings.value = true;
  }) as EventListener);

  window.addEventListener('acu-show-dice-history', () => {
    closeAllPanels();
    activeTab.value = '';
    showDiceHistory.value = true;
  });

  window.addEventListener('acu-show-preset-manager', () => {
    closeAllPanels();
    activeTab.value = '';
    showPresetManager.value = true;
  });
});

onUnmounted(() => {
  if (tableRefreshTimer) clearInterval(tableRefreshTimer);
  window.removeEventListener('acu-show-changes-panel', () => {});
  window.removeEventListener('acu-open-settings-section', () => {});
  window.removeEventListener('acu-show-dice-history', () => {});
  window.removeEventListener('acu-show-preset-manager', () => {});
});
</script>

<template>
  <div
    class="acu-wrapper"
    :class="wrapperClass"
    :style="{
      '--acu-grid-cols': gridCols,
      '--acu-card-width': legacySettings.cardWidth + 'px',
      '--acu-font-size': legacySettings.fontSize + 'px',
      '--acu-opt-font-size': legacySettings.optionFontSize + 'px',
      '--acu-table-font-size': legacySettings.tableFontSize + 'px',
      '--acu-bottom-offset': legacySettings.bottomOffset + 'px',
    }"
  >
    <!-- 1. 数据展示区 (基于绝对定位弹出) -->
    <div id="acu-data-area" class="acu-data-display" :class="{ visible: showDataDisplay && !isCollapsed }">
      <DashboardPanel v-if="showDashboard" @close="showDashboard = false" />
      <DicePanel
        v-else-if="showDice"
        @close="showDice = false"
        @switch-to-opposed="
          showDice = false;
          showOpposedCheck = true;
        "
      />
      <OpposedCheckPanel
        v-else-if="showOpposedCheck"
        @close="showOpposedCheck = false"
        @switchToNormal="
          showOpposedCheck = false;
          showDice = true;
        "
      />
      <ChangesPanel v-else-if="showChanges" @close="showChanges = false" />
      <MvuPanel v-else-if="showMvu" @close="showMvu = false" />
      <FavoritesPanel v-else-if="showFavorites" @close="showFavorites = false" />
      <SettingsPanel v-else-if="showSettings" @close="showSettings = false" />
      <SavePanel v-else-if="showSave" @close="showSave = false" />
      <GeneratePanel v-else-if="showGenerate" @close="showGenerate = false" />
      <DiceHistoryPanel v-else-if="showDiceHistory" @close="showDiceHistory = false" />
      <PresetManager v-else-if="showPresetManager" @close="showPresetManager = false" />
      <TableBrowser
        v-else-if="activeTab"
        :key="activeTab"
        :initial-table="activeTab"
        :embedded="true"
        :show-table-list="shouldShowTableList"
        @close="activeTab = ''"
      />
    </div>

    <!-- 2. 行动选项区 -->
    <div
      v-if="legacySettings.showOptionPanel && options.length > 0 && !isCollapsed"
      class="acu-option-panel"
      :class="{ collapsed: isOptionsCollapsed }"
    >
      <div class="acu-opt-header" @click="isOptionsCollapsed = !isOptionsCollapsed">
        <i class="fa-solid" :class="isOptionsCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
        <span> 行动选项 ({{ options.length }})</span>
      </div>
      <div v-if="!isOptionsCollapsed" class="acu-opt-body">
        <button v-for="opt in options" :key="opt" class="acu-opt-btn" @click="handleOptionClick(opt)">{{ opt }}</button>
      </div>
    </div>

    <!-- 3. 收起触发器 -->
    <div
      v-if="isCollapsed"
      class="acu-expand-trigger"
      :class="[
        `acu-col-${legacySettings.collapseStyle || 'bar'}`,
        `acu-align-${legacySettings.collapseAlign || 'right'}`,
      ]"
      @click="isCollapsed = false"
    >
      <i class="fa-solid fa-table"></i><span>数据库助手 ({{ tables.length }})</span>
    </div>
    <!-- 4. 导航栏 (包含动作栏位置控制) -->
    <div v-else class="acu-nav-container" :class="{ 'acu-pos-top': legacySettings.actionsPosition === 'top' }">
      <button
        v-if="!legacySettings.hideDashboardButton"
        class="acu-nav-btn"
        :class="{ active: showDashboard }"
        style="order: 1"
        @click="handleNavClick('__dashboard__')"
      >
        <i class="fa-solid fa-chart-line"></i><span>仪表盘</span>
      </button>

      <button
        v-for="(item, idx) in navItems"
        :key="item.key"
        class="acu-nav-btn"
        :class="['id' in item && item.id ? item.id : '', { active: isNavItemActive(item) }]"
        :style="{ order: idx + 2 }"
        @click="handleNavClick(item.key)"
      >
        <i class="fa-solid" :class="item.icon"></i><span>{{ item.label }}</span>
      </button>

      <div class="acu-actions-group" style="order: 9999">
        <button
          v-for="btn in ACTION_BUTTONS"
          :key="btn.id"
          class="acu-action-btn"
          :title="btn.title"
          @click="handleActionClick(btn.id)"
        >
          <i class="fa-solid" :class="btn.icon"></i>
        </button>
      </div>
    </div>

    <RelationGraph />
  </div>
</template>

<style scoped lang="scss">
/* 核心容器：复刻原版 flex-direction */
.acu-wrapper {
  position: relative;
  z-index: 31000;
  font-family: var(--acu-font-family, sans-serif);
  display: flex;
  flex-direction: column-reverse;
  width: 100%;
}

/* 1. 悬浮底部模式 (Fixed) */
.acu-wrapper.acu-mode-fixed {
  position: fixed;
  bottom: var(--acu-bottom-offset, 20px);
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  max-width: 95vw;
}

/* 2. 跟随消息模式 (Embedded) */
.acu-wrapper.acu-mode-embedded {
  position: relative;
  margin: 20px 0;
  width: 100%;
}

/* 数据展示面板 (绝对定位，向上弹出) */
.acu-data-display {
  display: none;
  flex-direction: column;
  position: absolute;
  left: 0;
  right: 0;
  width: var(--acu-card-width, 380px);
  max-width: min(95vw, 1200px);
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  background: var(--acu-bg-panel);
  max-height: 80vh;
  overflow: hidden;
  z-index: 31010;
}
.acu-data-display.visible {
  display: flex;
}

/* 悬浮模式下的弹出方向 */
.acu-wrapper.acu-mode-fixed.acu-panel-expand-up .acu-data-display {
  bottom: calc(100% + 10px);
  top: auto;
}

.acu-wrapper.acu-mode-fixed.acu-panel-expand-down .acu-data-display {
  top: calc(100% + 10px);
  bottom: auto;
}

/* 内嵌模式下的布局 */
.acu-wrapper.acu-mode-embedded .acu-data-display {
  position: relative;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 内嵌模式下通过order控制弹出方向 */
.acu-wrapper.acu-mode-embedded.acu-panel-expand-up .acu-data-display {
  order: 1;
}

.acu-wrapper.acu-mode-embedded.acu-panel-expand-down .acu-data-display {
  order: -1;
}

/* 选项面板 */
.acu-option-panel {
  width: var(--acu-card-width, 380px);
  min-width: 320px;
  max-width: 100%;
  margin: 0 auto 10px auto;
  background: var(--acu-bg-nav);
  border: 1px solid var(--acu-border);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 31005;
  &.collapsed {
    padding: 4px 8px;
  }
  .acu-opt-header {
    cursor: pointer;
    color: var(--acu-accent);
    font-size: 11px;
    font-weight: bold;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .acu-opt-body {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .acu-opt-btn {
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-panel);
    color: var(--acu-text-main);
    font-size: var(--acu-opt-font-size, 12px);
    cursor: pointer;
  }
}

.acu-wrapper.acu-mode-embedded .acu-option-panel {
  margin-bottom: 12px;
}

/* 导航容器 */
.acu-nav-container {
  display: grid;
  grid-template-columns: repeat(var(--acu-grid-cols, 3), 1fr);
  gap: 4px;
  padding: 6px;
  background: var(--acu-bg-nav);
  border: 1px solid var(--acu-border);
  border-radius: 10px;
  box-shadow: 0 2px 6px var(--acu-shadow);
  width: var(--acu-card-width, 380px);
  min-width: 320px;
  margin: 0 auto;
  position: relative;
  z-index: 31001;

  /* 顶部停靠：将操作组移到上方 */
  &.acu-pos-top {
    .acu-actions-group {
      order: -1 !important;
      border-top: none;
      border-bottom: 1px dashed var(--acu-border);
      margin-top: 0;
      margin-bottom: 6px;
      padding-top: 0;
      padding-bottom: 8px;
    }
  }
}

.acu-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 2px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  font-size: 11px;
  cursor: pointer;
  i {
    font-size: 16px;
  }
  &.active {
    background: var(--acu-accent);
    color: white;
  }
}

.acu-actions-group {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  grid-column: span var(--acu-grid-cols, 3);
  border-top: 1px solid var(--acu-border);
  padding-top: 4px;
  margin-top: 4px;
}

.acu-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-panel);
  color: var(--acu-text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 收起触发器 */
.acu-expand-trigger {
  background: var(--acu-bg-nav);
  border: 1px solid var(--acu-border);
  box-shadow: 0 2px 6px var(--acu-shadow);
  cursor: pointer;
  color: var(--acu-text-main);
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 31005;
  &.acu-col-bar {
    width: var(--acu-card-width, 380px);
    justify-content: center;
    padding: 8px 10px;
    border-radius: 6px;
    margin: 0 auto;
  }
  &.acu-col-dot {
    width: auto !important;
    padding: 6px 16px;
    border-radius: 50px;
  }
  &.acu-col-icon {
    width: 40px !important;
    height: 40px !important;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
    span {
      display: none;
    }
  }
  &.acu-align-right {
    margin-left: auto;
  }
  &.acu-align-center {
    margin: 0 auto;
  }
  &.acu-align-left {
    margin-right: auto;
    margin-left: 0;
  }
}

/* PC 端布局 */
@media (min-width: 768px) {
  .acu-wrapper.acu-mode-embedded .acu-nav-container {
    width: fit-content !important;
    min-width: 300px;
    max-width: 100%;
    border-radius: 50px;
    padding: 6px 20px;
  }

  .acu-nav-container {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 6px !important;
    padding: 6px 10px;
    grid-template-columns: none !important;
    flex-direction: row !important;
    justify-content: flex-start !important;
    align-items: center !important;
    height: auto !important;
    width: var(--acu-card-width, 380px);
  }

  .acu-nav-container .acu-nav-btn {
    width: fit-content !important;
    flex: 0 0 auto !important;
    height: 32px !important;
    padding: 0 12px;
    font-size: 13px !important;
    min-width: auto !important;
    flex-direction: row;
    gap: 6px;
  }

  .acu-nav-btn span {
    display: inline !important;
    max-width: 200px;
  }

  .acu-action-btn {
    flex: 0 0 32px !important;
    width: 32px !important;
    height: 32px !important;
    background: transparent !important;
    color: var(--acu-text-sub) !important;
    border-radius: 6px;
    border: 1px solid transparent;
  }

  .acu-actions-group {
    width: auto !important;
    margin-left: auto !important;
    border: none !important;
    padding: 0;
    margin-top: 0 !important;
    gap: 4px !important;
    justify-content: flex-end;
    order: 9999 !important;
    display: flex;
  }

  .acu-nav-container.acu-pos-top .acu-actions-group {
    margin-left: 0 !important;
    margin-right: 10px !important;
    justify-content: flex-start !important;
    border-bottom: none !important;
  }

  .acu-data-display {
    width: fit-content !important;
  }
}
</style>
