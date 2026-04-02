<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDashboard } from '../composables/useDashboard';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();
const viewMode = ref<'full' | 'validation'>('full');

// 模拟原版变更检测逻辑 (这里仅做 UI 排版展示，实际对比由后端/composable处理)
// 假设我们从后端拿到了一组格式化的 changes 数据
const mockChanges = [
  { type: 'modified', table: '主角信息', field: 'HP', old: '10', new: '8', title: '主角' },
  { type: 'added', table: '物品表', title: '生锈的铁剑' },
  { type: 'deleted', table: '重要角色表', title: '路人甲' }
];

function handleAction(action: string) {
  console.log('Action:', action);
}
</script>

<template>
  <div class="acu-changes-panel">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main"><i class="fa-solid" :class="viewMode === 'full' ? 'fa-code-compare' : 'fa-shield-halved'"></i> <span class="acu-title-text">{{ viewMode === 'full' ? '更新审核' : '数据验证' }}</span></div>
      </div>
      <div class="acu-header-actions">
        <button class="acu-view-btn" @click="handleAction('accept-all')" title="接受全部"><i class="fa-solid fa-check-double"></i></button>
        <button class="acu-view-btn" @click="handleAction('reject-all')" title="全部拒绝"><i class="fa-solid fa-rotate-left"></i></button>
        <button class="acu-view-btn" :class="{ active: viewMode === 'validation' }" @click="viewMode = viewMode === 'full' ? 'validation' : 'full'"><i class="fa-solid fa-filter"></i></button>
        <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <div class="acu-changes-list">
        <!-- 分组展示 -->
        <div class="acu-changes-group">
          <div class="acu-changes-group-header">
            <i class="fa-solid fa-chevron-down"></i> <i class="fa-solid fa-table"></i> 变更项 ({{ mockChanges.length }})
          </div>
          <div class="acu-changes-group-body">
            <div v-for="(c, idx) in mockChanges" :key="idx" class="acu-change-item" :class="`acu-change-${c.type}`">
              <span class="acu-change-badge">{{ c.type === 'modified' ? '更' : c.type === 'added' ? '新' : '删' }}</span>
              <div class="acu-change-info">
                <span class="field" v-if="c.field">{{ c.title }}.{{ c.field }}</span>
                <span class="title" v-else>{{ c.title }}</span>
                <div v-if="c.type === 'modified'" class="diff">
                  <span class="old">{{ c.old }}</span> <i class="fa-solid fa-arrow-right"></i> <span class="new">{{ c.new }}</span>
                </div>
              </div>
              <div class="acu-change-actions">
                <button @click="handleAction('accept')"><i class="fa-solid fa-check"></i></button>
                <button @click="handleAction('reject')"><i class="fa-solid fa-rotate-left"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-changes-panel { display: flex; flex-direction: column; height: 100%; }
.acu-changes-list { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.acu-changes-group { border: 1px solid var(--acu-border); border-radius: 10px; overflow: hidden; }
.acu-changes-group-header { background: var(--acu-bg-header); padding: 8px 12px; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--acu-border); }

.acu-change-item { 
  display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--acu-bg-card); border-bottom: 1px solid var(--acu-border);
  &:last-child { border-bottom: none; }
}

.acu-change-badge { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: white; }
.acu-change-modified .acu-change-badge { background: #3b82f6; }
.acu-change-added .acu-change-badge { background: #10b981; }
.acu-change-deleted .acu-change-badge { background: #ef4444; }

.acu-change-info { 
  flex: 1; display: flex; flex-direction: column; gap: 2px;
  .field { font-size: 11px; font-weight: 800; color: var(--acu-text-main); }
  .title { font-size: 12px; font-weight: 700; color: var(--acu-text-main); }
  .diff { font-size: 11px; display: flex; align-items: center; gap: 6px; .old { text-decoration: line-through; opacity: 0.5; } .new { color: var(--acu-accent); font-weight: 800; } }
}

.acu-change-actions { 
  display: flex; gap: 4px; 
  button { width: 26px; height: 26px; border-radius: 4px; border: 1px solid var(--acu-border); background: var(--acu-bg-panel); color: var(--acu-text-sub); cursor: pointer; &:hover { border-color: var(--acu-accent); color: var(--acu-accent); } }
}
</style>
