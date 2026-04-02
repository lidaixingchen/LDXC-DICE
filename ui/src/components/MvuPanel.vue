<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMvu } from '../composables/useMvu';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const {
  variables,
  filteredNumericVariables,
  variableCount,
  modeLabel,
  loading,
  panelState,
  refresh,
  toggleNumericMode,
  hide,
} = useMvu();

function handleClose(): void {
  hide();
  emit('close');
}

onMounted(() => {
  panelState.value.visible = true;
  refresh();
});
</script>

<template>
  <div class="acu-mvu-panel">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <i class="fa-solid fa-square-rss"></i>
        <span>变量监控</span>
        <span class="acu-badge-source">{{ modeLabel }}</span>
      </div>
      <div class="acu-header-actions">
        <button class="acu-view-btn" :class="{ active: panelState.numericMode }" @click="toggleNumericMode" title="数值模式"><i class="fa-solid fa-hashtag"></i></button>
        <button class="acu-view-btn" @click="refresh"><i class="fa-solid fa-sync" :class="{ 'fa-spin': loading }"></i></button>
        <button class="acu-close-btn" @click="handleClose"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <!-- 数值对比模式 (原版逻辑) -->
      <div v-if="panelState.numericMode" class="acu-numeric-grid">
        <div v-for="nv in filteredNumericVariables" :key="nv.path" class="acu-num-card">
          <div class="path">{{ nv.path.split('.').pop() }}</div>
          <div class="val-row">
            <template v-if="nv.delta">
              <span class="old">{{ nv.delta.old }}</span>
              <i class="fa-solid fa-long-arrow-alt-right"></i>
              <span class="new" :class="nv.delta.new > nv.delta.old ? 'up' : 'down'">{{ nv.delta.new }}</span>
            </template>
            <span v-else class="curr">{{ nv.value }}</span>
          </div>
        </div>
      </div>

      <!-- 树形模式 -->
      <div v-else class="acu-tree-list">
        <div v-for="v in variables" :key="v.path" class="tree-item">
          <i class="fa-solid fa-caret-right"></i>
          <span class="name">{{ v.name }}</span>
          <span class="val">{{ v.value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-mvu-panel { display: flex; flex-direction: column; height: 100%; }
.acu-badge-source { font-size: 9px; background: var(--acu-accent); color: white; padding: 1px 6px; border-radius: 4px; margin-left: 8px; }

.acu-numeric-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; padding: 12px; }
.acu-num-card { 
  background: var(--acu-bg-card); border: 1px solid var(--acu-border); border-radius: 8px; padding: 8px;
  .path { font-size: 10px; color: var(--acu-text-sub); margin-bottom: 4px; font-weight: bold; }
  .val-row { 
    display: flex; align-items: center; gap: 6px; font-family: monospace; font-size: 14px; font-weight: 800;
    .old { text-decoration: line-through; opacity: 0.4; font-size: 11px; }
    .new.up { color: #10b981; }
    .new.down { color: #ef4444; }
    .curr { color: var(--acu-accent); }
  }
}

.acu-tree-list { padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.tree-item { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 8px; background: var(--acu-bg-header); border-radius: 4px;
  .name { font-weight: 700; color: var(--acu-text-main); }
  .val { color: var(--acu-accent); font-family: monospace; margin-left: auto; }
}

.acu-view-btn, .acu-close-btn { background: transparent; border: none; color: var(--acu-text-sub); cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; &:hover { background: var(--acu-accent-light); color: var(--acu-accent); } &.active { color: var(--acu-accent); } }
</style>
