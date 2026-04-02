<script setup lang="ts">
import { computed } from 'vue';
import type { MvuVariable } from '../types/mvu';

const props = defineProps<{
  variable: MvuVariable;
  deltaData?: Record<string, { old: unknown; new: unknown }>;
}>();

const emit = defineEmits<{
  (e: 'toggle', path: string): void;
}>();

const hasChildren = computed(() => {
  return props.variable.children && props.variable.children.length > 0;
});

const isExpanded = computed(() => props.variable.isExpanded);

const displayValue = computed(() => {
  const val = props.variable.value;
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return `[${val.length}]`;
    return `{${Object.keys(val).length}}`;
  }
  return String(val);
});

const valueClass = computed(() => {
  const val = props.variable.value;
  if (typeof val === 'number') return 'acu-value-number';
  if (typeof val === 'string') return 'acu-value-string';
  if (typeof val === 'boolean') return 'acu-value-boolean';
  return 'acu-value-other';
});

const delta = computed(() => {
  return props.variable.delta;
});

const hasDelta = computed(() => {
  return delta.value && delta.value.old !== delta.value.new;
});

const indentStyle = computed(() => ({
  paddingLeft: `${props.variable.depth * 16}px`,
}));

function toggleExpand(): void {
  if (hasChildren.value) {
    emit('toggle', props.variable.path);
  }
}
</script>

<template>
  <div class="acu-variable-card" :class="{ 'has-children': hasChildren, expanded: isExpanded }">
    <div class="acu-variable-row" :style="indentStyle" @click="toggleExpand">
      <span v-if="hasChildren" class="acu-expand-icon">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span v-else class="acu-expand-placeholder"></span>
      
      <span class="acu-variable-name">{{ variable.name }}</span>
      
      <span class="acu-variable-value" :class="valueClass">
        <template v-if="hasDelta">
          <span class="acu-delta-old">{{ delta?.old }}</span>
          <span class="acu-delta-arrow">→</span>
          <span class="acu-delta-new">{{ delta?.new }}</span>
        </template>
        <template v-else>
          {{ displayValue }}
        </template>
      </span>
    </div>
    
    <div v-if="hasChildren && isExpanded" class="acu-variable-children">
      <VariableCard
        v-for="child in variable.children"
        :key="child.path"
        :variable="child"
        :delta-data="deltaData"
        @toggle="(path) => $emit('toggle', path)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-variable-card {
  user-select: none;
}

.acu-variable-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: default;
  transition: background 0.15s;

  &:hover {
    background: var(--acu-bg-hover, rgba(255, 255, 255, 0.05));
  }

  .has-children & {
    cursor: pointer;
  }
}

.acu-expand-icon {
  width: 12px;
  font-size: 10px;
  color: var(--acu-text-sub, #6c7086);
  transition: transform 0.2s;
}

.acu-expand-placeholder {
  width: 12px;
}

.acu-variable-name {
  flex: 1;
  font-weight: 500;
  color: var(--acu-text-main, #cdd6f4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acu-variable-value {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.acu-value-number {
  color: var(--acu-accent, #89b4fa);
  background: rgba(137, 180, 250, 0.1);
}

.acu-value-string {
  color: var(--acu-success, #a6e3a1);
  background: rgba(166, 227, 161, 0.1);
}

.acu-value-boolean {
  color: var(--acu-warning, #f9e2af);
  background: rgba(249, 226, 175, 0.1);
}

.acu-value-other {
  color: var(--acu-text-sub, #6c7086);
  background: rgba(108, 112, 134, 0.1);
}

.acu-delta-old {
  text-decoration: line-through;
  opacity: 0.6;
}

.acu-delta-arrow {
  margin: 0 4px;
  color: var(--acu-accent, #89b4fa);
}

.acu-delta-new {
  color: var(--acu-success, #a6e3a1);
  font-weight: 600;
}

.acu-variable-children {
  overflow: hidden;
}
</style>
