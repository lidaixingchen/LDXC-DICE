<script setup lang="ts">
import { ref } from 'vue';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  type: 'panel' | 'table';
}

const emit = defineEmits<{
  (e: 'select', id: string, type: string): void;
}>();

const activeId = ref('');
const isExpanded = ref(true);

const topRowItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: 'fa-chart-line', type: 'panel' },
  { id: 'dice', label: '掷骰', icon: 'fa-dice-d20', type: 'panel' },
  { id: 'changes', label: '审核', icon: 'fa-clock-rotate-left', type: 'panel' },
  { id: 'mvu', label: '变量', icon: 'fa-code-branch', type: 'panel' },
  { id: 'bookmark', label: '收藏夹', icon: 'fa-star', type: 'panel' },
  { id: 'global', label: '全局数据表', icon: 'fa-globe', type: 'table' },
  { id: 'map', label: '世界地图点', icon: 'fa-map-location-dot', type: 'table' },
  { id: 'map-elements', label: '地图元素表', icon: 'fa-map', type: 'table' },
  { id: 'faction', label: '势力', icon: 'fa-shield-halved', type: 'table' },
];

const bottomRowItems: NavItem[] = [
  { id: 'player', label: '主角信息', icon: 'fa-user', type: 'table' },
  { id: 'npc', label: '重要角色表', icon: 'fa-users', type: 'table' },
  { id: 'skill', label: '技能表', icon: 'fa-bolt', type: 'table' },
  { id: 'item', label: '物品栏', icon: 'fa-box-open', type: 'table' },
  { id: 'equip', label: '装备表', icon: 'fa-shield', type: 'table' },
  { id: 'record', label: '纪要表', icon: 'fa-file-lines', type: 'table' },
  { id: 'option', label: '选项表', icon: 'fa-list-check', type: 'table' },
  { id: 'intel', label: '重要情报', icon: 'fa-circle-info', type: 'table' },
  { id: 'quest', label: '任务表', icon: 'fa-scroll', type: 'table' },
];

const actionButtons = [
  { id: 'database', icon: 'fa-database', title: '数据库浏览' },
  { id: 'relation', icon: 'fa-project-diagram', title: '人物关系图' },
  { id: 'collapse', icon: 'fa-chevron-down', title: '收起/展开' },
  { id: 'quick', icon: 'fa-bolt', title: '快捷操作' },
  { id: 'settings', icon: 'fa-gear', title: '设置' },
];

function handleItemClick(item: NavItem) {
  activeId.value = item.id;
  emit('select', item.id, item.type);
}

function handleActionClick(actionId: string) {
  if (actionId === 'collapse') {
    isExpanded.value = !isExpanded.value;
  } else if (actionId === 'database') {
    emit('select', 'database', 'action');
  } else if (actionId === 'relation') {
    emit('select', 'relation', 'action');
  }
}

function isActive(id: string): boolean {
  return activeId.value === id;
}

defineExpose({
  setActive: (id: string) => { activeId.value = id; },
  clearActive: () => { activeId.value = ''; },
});
</script>

<template>
  <div class="acu-bottom-nav" :class="{ collapsed: !isExpanded }">
    <div v-if="isExpanded" class="acu-nav-rows">
      <div class="acu-nav-row">
        <button
          v-for="item in topRowItems"
          :key="item.id"
          class="acu-nav-btn"
          :class="{ active: isActive(item.id) }"
          @click="handleItemClick(item)"
        >
          <i class="fa-solid" :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>
      <div class="acu-nav-row">
        <button
          v-for="item in bottomRowItems"
          :key="item.id"
          class="acu-nav-btn"
          :class="{ active: isActive(item.id) }"
          @click="handleItemClick(item)"
        >
          <i class="fa-solid" :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>
    <div class="acu-nav-actions">
      <button
        v-for="btn in actionButtons"
        :key="btn.id"
        class="acu-action-icon"
        :title="btn.title"
        :class="{ rotate: btn.id === 'collapse' && !isExpanded }"
        @click="handleActionClick(btn.id)"
      >
        <i class="fa-solid" :class="btn.icon"></i>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-bottom-nav {
  position: fixed;
  bottom: var(--acu-bottom-offset, 20px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--acu-bg-nav);
  border-radius: var(--acu-radius-xl, 16px);
  padding: 12px 16px;
  box-shadow: var(--acu-shadow-lg, 0 4px 20px rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
  gap: var(--acu-space-sm, 8px);
  z-index: var(--acu-z-fixed, 1030);
  min-width: 600px;
  max-width: 90vw;
  border: 1px solid var(--acu-border);
}

.acu-bottom-nav.collapsed {
  min-width: auto;
  padding: 8px 12px;
}

.acu-nav-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acu-nav-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.acu-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: var(--acu-radius-lg, 10px);
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.acu-nav-btn:hover {
  background: var(--acu-btn-hover);
  transform: translateY(-1px);
}

.acu-nav-btn.active {
  background: var(--acu-btn-active-bg);
  color: var(--acu-btn-active-text);
}

.acu-nav-btn i {
  font-size: 12px;
}

.acu-nav-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--acu-border);
}

.acu-action-icon {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--acu-radius-md, 8px);
  background: var(--acu-btn-bg);
  color: var(--acu-text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.acu-action-icon:hover {
  background: var(--acu-btn-hover);
  color: var(--acu-text-main);
}

.acu-action-icon.rotate i {
  transform: rotate(180deg);
}

.acu-action-icon i {
  font-size: 13px;
  transition: transform 0.2s;
}
</style>
