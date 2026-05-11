<script setup lang="ts">
import { settingsManager, type LegacySettings, getFontValue } from '@data/settings-manager';
import { clearThemeColorCache } from '../../utils/theme-utils';
import { syncRulesToEngine } from '@core/validation/regex-sync';
import { setDatabaseToastMute, injectToastStyles } from '../../utils/toast-manager';
import { computed, onMounted, onUnmounted, ref, provide, watch } from 'vue';
import { useDiceSystem, usePresets, useCombatState, useStatusEffects } from '../../composables';
import { useDashboard } from '../../composables/data/useDashboard';
import BottomNav, { type ActionButton } from './BottomNav.vue';
import ChangesPanel from '../data/ChangesPanel.vue';
import DashboardPanel from '../data/DashboardPanel.vue';
import DicePanel from '../dice/DicePanel.vue';
import FavoritesPanel from '../tools/FavoritesPanel.vue';
import GeneratePanel from '../tools/GeneratePanel.vue';
import MvuPanel from '../data/MvuPanel.vue';
import OpposedCheckPanel from '../dice/OpposedCheckPanel.vue';
import RelationGraph from '../data/RelationGraph.vue';
import SettingsPanel from '../settings/SettingsPanel.vue';
import SavePanel from '../tools/SavePanel.vue';
import DiceHistoryPanel from '../dice/DiceHistoryPanel.vue';
import PresetManager from '../presets/PresetManager.vue';
import TableBrowser from '../tools/TableBrowser.vue';

const { getTableData, findTableByKeywords } = useDashboard();
const { initialize } = useDiceSystem();
const { loadPresets } = usePresets();

interface StatusEffect {
  id: number;
  name: string;
  type: 'buff' | 'debuff' | 'dot' | 'control' | 'shield';
  intensity: 'weak' | 'medium' | 'strong';
  value: number;
  remainingRounds: number;
  totalRounds?: number;
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

const { activeStatuses } = useStatusEffects();
const { combat } = useCombatState();

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

const legacySettings = ref<LegacySettings>(settingsManager.getLegacySettings());
const displaySettings = ref(settingsManager.getGroup('display'));
const advancedSettings = ref(settingsManager.getGroup('advanced'));
const behaviorSettings = ref(settingsManager.getGroup('behavior'));
settingsManager.onChange(() => {
  legacySettings.value = { ...settingsManager.getLegacySettings() };
  displaySettings.value = { ...settingsManager.getGroup('display') };
  advancedSettings.value = { ...settingsManager.getGroup('advanced') };
  behaviorSettings.value = { ...settingsManager.getGroup('behavior') };
});

// 自动隐藏面板
let autoHideTimer: ReturnType<typeof setTimeout> | null = null;

function resetAutoHideTimer(): void {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
  if (behaviorSettings.value.autoHidePanel && !isCollapsed.value) {
    autoHideTimer = setTimeout(() => {
      isCollapsed.value = true;
    }, behaviorSettings.value.autoHideDelay);
  }
}

function handleUserActivity(): void {
  if (isCollapsed.value) return;
  resetAutoHideTimer();
}

watch(
  () => behaviorSettings.value.autoHidePanel,
  () => resetAutoHideTimer(),
  { immediate: true },
);
let tableRefreshTimer: number | null = null;
const tables = ref<{ key: string; name: string; icon: string }[]>([]);

const SPECIAL_NAV_ITEMS = [
  { key: '__dashboard__', icon: 'fa-chart-line', label: '仪表盘', id: 'acu-btn-dashboard' },
  { key: '__dice__', icon: 'fa-dice-d20', label: '掷骰', id: 'acu-btn-dice-nav' },
  { key: '__changes__', icon: 'fa-code-compare', label: '审核', id: 'acu-btn-changes' },
  { key: '__mvu__', icon: 'fa-code-branch', label: '变量', id: 'acu-btn-mvu' },
  { key: '__favorites__', icon: 'fa-star', label: '收藏', id: 'acu-btn-favorites' },
  { key: '__generate__', icon: 'fa-wand-magic-sparkles', label: '生成', id: 'acu-btn-generate-nav' },
  { key: '__save__', icon: 'fa-floppy-disk', label: '存档', id: 'acu-btn-save-nav' },
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

interface NavItemConfig {
  key: string;
  isTable?: boolean;
}

function isNavItemActive(item: NavItemConfig): boolean {
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
    import('../../services/HostBridgeService').then(m => m.getDatabaseApi()?.openSettings?.());
  } else if (id === 'acu-btn-open-visualizer') {
    import('../../services/HostBridgeService').then(m => m.getDatabaseApi()?.openVisualizer?.());
  } else if (id === 'acu-btn-relation') {
    relationGraphRef.value?.toggle();
  }
}

async function handleOptionClick(optionValue: string) {
  const config = legacySettings.value;
  const { sendOrInsertMessage } = await import('../../services/HostBridgeService');
  await sendOrInsertMessage(optionValue, config.clickOptionToAutoSend);
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
  { 'acu-no-animation': !displaySettings.value.showAnimations },
  { 'acu-compact': displaySettings.value.compactMode },
  { 'acu-performance': advancedSettings.value.performanceMode },
  { 'acu-no-tooltips': !displaySettings.value.showTooltips },
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
  const n = navItems.value.length;
  if (n <= 4) return n < 2 ? 2 : n;
  return 4;
});

const navItems = computed(() => {
  const hidden = new Set(legacySettings.value.hiddenTableKeys || []);
  const hideDashboard = legacySettings.value.hideDashboardButton;
  const special = SPECIAL_NAV_ITEMS.filter(i => !hidden.has(i.key) && !(hideDashboard && i.key === '__dashboard__')).map(i => ({ ...i, isTable: false }));
  const tableItems = tables.value.filter(t => !hidden.has(t.key)).map(t => ({ ...t, isTable: true, label: t.name }));
  const all = [...special, ...tableItems];
  if (legacySettings.value.tableOrderKeys?.length) {
    const orderMap = new Map(legacySettings.value.tableOrderKeys.map((k, i) => [k, i]));
    all.sort((a, b) => (orderMap.get(a.key) ?? 9999) - (orderMap.get(b.key) ?? 9999));
  }
  return all;
});

const specialItems = computed(() => navItems.value.filter(i => !('isTable' in i && i.isTable)));
const tableItems = computed(() => navItems.value.filter(i => 'isTable' in i && i.isTable));

const activeKey = computed(() => {
  if (showDashboard.value) return '__dashboard__';
  if (showDice.value) return '__dice__';
  if (showChanges.value) return '__changes__';
  if (showMvu.value) return '__mvu__';
  if (showFavorites.value) return '__favorites__';
  if (showGenerate.value) return '__generate__';
  if (showSave.value) return '__save__';
  return activeTab.value;
});

const relationGraphRef = ref<InstanceType<typeof RelationGraph> | null>(null);

const actionButtons: ActionButton[] = [
  { id: 'acu-btn-open-editor', icon: 'fa-database', title: '打开数据库' },
  { id: 'acu-btn-open-visualizer', icon: 'fa-table-columns', title: '可视化编辑' },
  { id: 'acu-btn-relation', icon: 'fa-project-diagram', title: '人物关系图' },
  { id: 'acu-btn-settings', icon: 'fa-cog', title: '设置' },
  { id: 'acu-btn-collapse', icon: 'fa-chevron-down', title: '收起' },
];

const onShowChangesPanel = () => {
  closeAllPanels();
  activeTab.value = '';
  showChanges.value = true;
};

const onOpenSettingsSection = (_e: Event) => {
  closeAllPanels();
  activeTab.value = '';
  showSettings.value = true;
};

const onShowDiceHistory = () => {
  closeAllPanels();
  activeTab.value = '';
  showDiceHistory.value = true;
};

const onShowPresetManager = () => {
  closeAllPanels();
  activeTab.value = '';
  showPresetManager.value = true;
};

onMounted(() => {
  initialize();
  loadPresets();
  loadTables();
  syncRulesToEngine();
  injectToastStyles();
  setDatabaseToastMute(legacySettings.value.muteDatabaseToasts);
  tableRefreshTimer = window.setTimeout(loadTables, 500); // Trigger a single delayed load just in case
  window.addEventListener('acu-data-updated', loadTables);

  window.addEventListener('acu-show-changes-panel', onShowChangesPanel);
  window.addEventListener('acu-open-settings-section', onOpenSettingsSection as EventListener);
  window.addEventListener('acu-show-dice-history', onShowDiceHistory);
  window.addEventListener('acu-show-preset-manager', onShowPresetManager);

  // 自动隐藏面板：监听用户活动
  document.addEventListener('mousemove', handleUserActivity);
  document.addEventListener('keydown', handleUserActivity);
  document.addEventListener('click', handleUserActivity);
  resetAutoHideTimer();
});

watch(
  () => legacySettings.value.muteDatabaseToasts,
  muted => {
    setDatabaseToastMute(muted);
  },
);

watch(
  () => legacySettings.value.theme,
  () => {
    clearThemeColorCache();
  },
);

onUnmounted(() => {
  if (tableRefreshTimer) clearTimeout(tableRefreshTimer);
  if (autoHideTimer) clearTimeout(autoHideTimer);
  window.removeEventListener('acu-data-updated', loadTables);
  window.removeEventListener('acu-show-changes-panel', onShowChangesPanel);
  window.removeEventListener('acu-open-settings-section', onOpenSettingsSection as EventListener);
  window.removeEventListener('acu-show-dice-history', onShowDiceHistory);
  window.removeEventListener('acu-show-preset-manager', onShowPresetManager);
  document.removeEventListener('mousemove', handleUserActivity);
  document.removeEventListener('keydown', handleUserActivity);
  document.removeEventListener('click', handleUserActivity);
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
      '--acu-chart-card-size': legacySettings.chartCardSize + 'px',
      '--acu-bottom-offset': legacySettings.bottomOffset + 'px',
      '--acu-nav-btn-height': (legacySettings.navButtonHeight || 32) + 'px',
      '--acu-nav-btn-icon-size': (legacySettings.navButtonIconSize || 16) + 'px',
      '--acu-action-btn-size': legacySettings.actionButtonSize + 'px',
      '--acu-action-btn-icon-size': legacySettings.actionButtonIconSize + 'px',
      '--acu-font-family': getFontValue(legacySettings.fontFamily),
      zoom: legacySettings.fontSize / 12,
    }"
  >
    <!-- 1. 数据展示区 (基于绝对定位弹出) -->
    <div id="acu-data-area" class="acu-data-display" :class="{ visible: showDataDisplay && !isCollapsed }">
      <!-- Cache only the 3 most recently used panels to preserve quick switching without retaining every panel instance in memory. -->
      <KeepAlive :max="3">
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
      </KeepAlive>
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

    <!-- 3+4. 导航栏 -->
    <BottomNav
      :special-items="specialItems"
      :table-items="tableItems"
      :all-nav-items="navItems"
      :action-buttons="actionButtons"
      :active-key="activeKey"
      :is-expanded="!isCollapsed"
      :split-nav-actions="legacySettings.splitNavActions"
      :actions-position="legacySettings.actionsPosition"
      :grid-cols="gridCols"
      :collapse-style="legacySettings.collapseStyle || 'bar'"
      :collapse-align="legacySettings.collapseAlign || 'right'"
      :embedded="legacySettings.positionMode === 'embedded'"
      @nav-click="handleNavClick"
      @action-click="handleActionClick"
      @update:expanded="isCollapsed = !$event"
    />

    <RelationGraph ref="relationGraphRef" />
  </div>
</template>

<style scoped lang="scss">
/* 核心容器：复刻原版 flex-direction */
.acu-wrapper {
  position: relative;
  z-index: var(--acu-z-fixed, 31000);
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
  z-index: var(--acu-z-modal-backdrop, 31010);
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

/* 内嵌模式下通过order控制弹出方向（column-reverse 下 order 越大越靠上） */
.acu-wrapper.acu-mode-embedded.acu-panel-expand-up .acu-data-display {
  order: 1;
}

.acu-wrapper.acu-mode-embedded.acu-panel-expand-down .acu-data-display {
  order: -1;
}

/* 选项面板 */
.acu-option-panel {
  width: 100%;
  min-width: 280px;
  max-width: 100%;
  margin: 0 auto 10px auto;
  background: var(--acu-bg-nav);
  border: 1px solid var(--acu-border);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: calc(var(--acu-z-fixed, 31000) + 5);
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

/* PC 端布局 */
@media (min-width: 768px) {
  .acu-data-display {
    width: var(--acu-card-width, 380px) !important;
    min-width: 0;
  }
}
</style>

