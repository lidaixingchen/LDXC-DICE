<script setup lang="ts">
const emit = defineEmits<{
  (e: 'openManager', type: string): void;
}>();

const managerItems = [
  { type: '预设管理', label: '预设管理器', icon: 'fa-dice' },
  { type: '交互规则', label: '交互规则管理器', icon: 'fa-exchange-alt' },
  { type: '正则规则', label: '正则规则管理器', icon: 'fa-code' },
  { type: '属性规则', label: '属性规则管理器', icon: 'fa-atom' },
  { type: '变量过滤', label: '变量过滤黑名单管理器', icon: 'fa-filter' },
  { type: '书签管理', label: '书签管理器', icon: 'fa-bookmark' },
  { type: 'Debug', label: 'Debug 控制台', icon: 'fa-bug' },
] as const;
</script>

<template>
  <div class="acu-config-group">
    <div class="acu-group-label">高级管理器</div>
    <div class="acu-btn-group vertical">
      <button
        v-for="item in managerItems"
        :key="item.type"
        class="acu-full-btn"
        @click="emit('openManager', item.type)"
      >
        <i class="fa-solid" :class="item.icon"></i> {{ item.label }}
      </button>
    </div>
  </div>
</template>
