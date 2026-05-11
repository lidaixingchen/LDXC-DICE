<script setup lang="ts">
export interface NavItem {
  key: string;
  label: string;
  icon: string;
  isTable: boolean;
}

export interface ActionButton {
  id: string;
  icon: string;
  title: string;
}

const props = defineProps<{
  specialItems: NavItem[];
  tableItems: NavItem[];
  allNavItems: NavItem[];
  actionButtons: ActionButton[];
  activeKey: string;
  isExpanded: boolean;
  showDashboard: boolean;
  isDashboardActive: boolean;
  hideDashboardButton: boolean;
  splitNavActions: boolean;
  actionsPosition: 'top' | 'bottom';
  gridCols: number | string;
  collapseStyle: 'bar' | 'dot' | 'icon';
  collapseAlign: 'right' | 'center' | 'left';
  embedded: boolean;
}>();

const emit = defineEmits<{
  (e: 'nav-click', key: string): void;
  (e: 'action-click', id: string): void;
  (e: 'dashboard-click'): void;
  (e: 'update:expanded', value: boolean): void;
}>();

function handleNavClick(key: string): void {
  emit('nav-click', key);
}

function handleActionClick(id: string): void {
  emit('action-click', id);
}

function handleDashboardClick(): void {
  emit('dashboard-click');
}

function expand(): void {
  emit('update:expanded', true);
}
</script>

<template>
  <!-- 收起触发器 -->
  <div
    v-if="!isExpanded"
    class="acu-expand-trigger"
    :class="[
      `acu-col-${props.collapseStyle}`,
      `acu-align-${props.collapseAlign}`,
    ]"
    @click="expand"
  >
    <i class="fa-solid fa-table"></i><span>骰子系统助手</span>
  </div>

  <!-- 导航容器 -->
  <div
    v-else
    class="acu-nav-container"
    :class="{
      'acu-pos-top': actionsPosition === 'top',
      'acu-split-mode': splitNavActions,
      'acu-embedded': embedded,
    }"
    :style="{ '--acu-grid-cols': gridCols }"
  >
    <!-- 仪表盘按钮 -->
    <button
      v-if="showDashboard && !hideDashboardButton"
      class="acu-nav-btn"
      :class="{ active: isDashboardActive }"
      style="order: 0"
      @click="handleDashboardClick"
    >
      <i class="fa-solid fa-chart-line"></i><span>仪表盘</span>
    </button>

    <!-- 分行模式：特殊导航 + 表格导航 -->
    <template v-if="splitNavActions">
      <div class="acu-special-group">
        <button
          v-for="item in specialItems"
          :key="item.key"
          class="acu-nav-btn"
          :class="{ active: activeKey === item.key }"
          @click="handleNavClick(item.key)"
        >
          <i class="fa-solid" :class="item.icon"></i><span>{{ item.label }}</span>
        </button>
      </div>
      <button
        v-for="(item, idx) in tableItems"
        :key="item.key"
        class="acu-nav-btn"
        :class="{ active: activeKey === item.key }"
        :style="{ order: idx + 100 }"
        @click="handleNavClick(item.key)"
      >
        <i class="fa-solid" :class="item.icon"></i><span>{{ item.label }}</span>
      </button>
    </template>

    <!-- 平铺模式：所有导航统一显示 -->
    <template v-else>
      <button
        v-for="(item, idx) in allNavItems"
        :key="item.key"
        class="acu-nav-btn"
        :class="{ active: activeKey === item.key }"
        :style="{ order: idx + 2 }"
        @click="handleNavClick(item.key)"
      >
        <i class="fa-solid" :class="item.icon"></i><span>{{ item.label }}</span>
      </button>
    </template>

    <!-- 动作按钮组 -->
    <div class="acu-actions-group" style="order: 9999">
      <button
        v-for="btn in actionButtons"
        :key="btn.id"
        class="acu-action-btn"
        :title="btn.title"
        @click="handleActionClick(btn.id)"
      >
        <i class="fa-solid" :class="btn.icon"></i>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
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
  width: 100%;
  min-width: 280px;
  margin: 0 auto;
  position: relative;
  z-index: calc(var(--acu-z-fixed, 31000) + 1);

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

  /* 分行模式：特殊导航在上，表格按钮在下 */
  &.acu-split-mode {
    flex-wrap: wrap;
    .acu-special-group {
      grid-column: 1 / -1;
      flex-basis: 100%;
      display: flex;
      gap: 4px;
      justify-content: center;
      border-bottom: 1px dashed var(--acu-border);
      margin-bottom: 4px;
      padding-bottom: 6px;
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
    font-size: var(--acu-nav-btn-icon-size, 16px);
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
  width: var(--acu-action-btn-size, 28px);
  height: var(--acu-action-btn-size, 28px);
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-panel);
  color: var(--acu-text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  i {
    font-size: var(--acu-action-btn-icon-size, 12px);
  }
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
  z-index: calc(var(--acu-z-fixed, 31000) + 5);
  &.acu-col-bar {
    width: 100%;
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
  .acu-nav-container.acu-embedded {
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
    width: 100%;
  }

  .acu-nav-container .acu-nav-btn {
    width: fit-content !important;
    flex: 0 0 auto !important;
    height: var(--acu-nav-btn-height, 32px) !important;
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
    flex: 0 0 var(--acu-action-btn-size, 32px) !important;
    width: var(--acu-action-btn-size, 32px) !important;
    height: var(--acu-action-btn-size, 32px) !important;
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
}
</style>
