<script setup lang="ts">
const emit = defineEmits<{
  (e: 'openManager', type: string): void;
}>();

const managerItems = [
  { type: '预设管理', label: '预设管理器', desc: '管理检定预设规则', icon: 'fa-dice' },
  { type: '交互规则', label: '交互规则', desc: '配置触发与响应规则', icon: 'fa-exchange-alt' },
  { type: '正则规则', label: '正则规则', desc: '文本匹配与替换规则', icon: 'fa-code' },
  { type: '属性规则', label: '属性规则', desc: '属性生成预设管理', icon: 'fa-atom' },
  { type: '变量过滤', label: '变量过滤', desc: '黑名单与过滤规则', icon: 'fa-filter' },
  { type: '书签管理', label: '书签管理', desc: '快捷书签与分组', icon: 'fa-bookmark' },
  { type: 'Debug', label: '调试控制台', desc: '查看日志与调试信息', icon: 'fa-bug' },
] as const;
</script>

<template>
  <div class="acu-config-group">
    <div class="acu-group-label">管理器</div>
    <div class="acu-manager-grid">
      <button
        v-for="item in managerItems"
        :key="item.type"
        class="acu-manager-card"
        @click="emit('openManager', item.type)"
      >
        <div class="acu-manager-card-icon">
          <i class="fa-solid" :class="item.icon"></i>
        </div>
        <div class="acu-manager-card-info">
          <span class="acu-manager-card-label">{{ item.label }}</span>
          <span class="acu-manager-card-desc">{{ item.desc }}</span>
        </div>
        <i class="fa-solid fa-chevron-right acu-manager-card-arrow"></i>
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-manager-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acu-manager-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;

  &:hover {
    background: var(--acu-btn-hover);
    border-color: var(--acu-accent);
  }
}

.acu-manager-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--acu-accent-light);
  color: var(--acu-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 15px;
}

.acu-manager-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.acu-manager-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-manager-card-desc {
  font-size: 11px;
  color: var(--acu-text-sub);
}

.acu-manager-card-arrow {
  font-size: 11px;
  color: var(--acu-text-dim);
  flex-shrink: 0;
}
</style>
