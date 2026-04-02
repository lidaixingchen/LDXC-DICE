<script setup lang="ts">
import type { EffectResult } from '../types';

const props = defineProps<{
  effects: EffectResult[];
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function handleConfirm(): void {
  emit('confirm');
}

function handleCancel(): void {
  emit('cancel');
}
</script>

<template>
  <Teleport to="body">
    <div class="acu-effect-confirm-overlay">
      <div class="acu-effect-confirm-dialog">
        <div class="acu-dialog-header">
          <span class="acu-dialog-icon">⚠️</span>
          <span class="acu-dialog-title">确认执行效果</span>
        </div>

        <div class="acu-dialog-body">
          <p class="acu-dialog-desc">以下效果将被执行，请确认：</p>
          
          <div class="acu-effects-list">
            <div v-for="effect in effects" :key="effect.effectId" class="acu-effect-preview">
              <span class="acu-preview-icon">{{ effect.success ? '✓' : '✗' }}</span>
              <span class="acu-preview-target">{{ effect.target }}</span>
              <span class="acu-preview-operation">{{ effect.operation }}</span>
              <span class="acu-preview-values">
                {{ effect.oldValue }} → {{ effect.newValue }}
              </span>
            </div>
          </div>
        </div>

        <div class="acu-dialog-footer">
          <button class="acu-btn acu-btn-secondary" @click="handleCancel">取消</button>
          <button class="acu-btn acu-btn-primary" @click="handleConfirm">确认执行</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.acu-effect-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.acu-effect-confirm-dialog {
  width: 90%;
  max-width: 420px;
  background: var(--acu-bg-panel, #1e1e2e);
  border: 1px solid var(--acu-border, #313244);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.acu-dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: var(--acu-bg-header, #181825);
  border-bottom: 1px solid var(--acu-border, #313244);
}

.acu-dialog-icon {
  font-size: 20px;
}

.acu-dialog-title {
  font-size: 16px;
  font-weight: 600;
}

.acu-dialog-body {
  padding: 16px;
}

.acu-dialog-desc {
  font-size: 14px;
  color: var(--acu-text-sub, #a6adc8);
  margin-bottom: 12px;
}

.acu-effects-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.acu-effect-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--acu-bg-card, #181825);
  border-radius: 8px;
  font-size: 13px;
}

.acu-preview-icon {
  font-size: 14px;
}

.acu-preview-target {
  flex: 1;
  font-weight: 500;
}

.acu-preview-operation {
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--acu-accent, #89b4fa);
  color: var(--acu-btn-active-text, #1e1e2e);
  font-size: 11px;
  font-weight: 500;
}

.acu-preview-values {
  font-family: 'Consolas', monospace;
  font-size: 12px;
}

.acu-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px;
  background: var(--acu-bg-header, #181825);
  border-top: 1px solid var(--acu-border, #313244);
}

.acu-btn {
  padding: 10px 20px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.acu-btn-secondary {
  background: var(--acu-bg-btn, #313244);
  color: var(--acu-text-main, #cdd6f4);

  &:hover {
    background: var(--acu-bg-btn-hover, #45475a);
  }
}

.acu-btn-primary {
  background: var(--acu-accent, #89b4fa);
  border-color: var(--acu-accent, #89b4fa);
  color: var(--acu-btn-active-text, #1e1e2e);

  &:hover {
    filter: brightness(1.1);
  }
}
</style>
