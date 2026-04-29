<script setup lang="ts">
import { computed } from 'vue';
import { generateUniqueName } from '../../../utils/helpers';

const props = defineProps<{
  presetName: string;
  presetType: string;
  existingNames: string[];
}>();

const emit = defineEmits<{
  (e: 'overwrite'): void;
  (e: 'rename', newName: string): void;
  (e: 'cancel'): void;
}>();

const suggestedName = computed(() =>
  generateUniqueName(props.presetName, props.existingNames),
);

function handleConfirm(): void {
  const selected = document.querySelector<HTMLInputElement>(
    'input[name="preset-conflict-mode"]:checked',
  );
  if (selected?.value === 'overwrite') {
    emit('overwrite');
  } else {
    emit('rename', suggestedName.value);
  }
}
</script>

<template>
  <div class="acu-conflict-overlay" @click.self="emit('cancel')">
    <div class="acu-conflict-dialog">
      <div class="acu-conflict-header">
        <i class="fa-solid fa-file-import"></i>
        导入{{ presetType }}预设
      </div>
      <div class="acu-conflict-body">
        <div class="acu-conflict-warning">
          <i class="fa-solid fa-exclamation-triangle acu-warning-icon"></i>
          <div class="acu-warning-title">发现同名预设</div>
          <div class="acu-warning-message">
            预设「{{ presetName }}」已存在，请选择处理方式：
          </div>
        </div>
        <div class="acu-conflict-options">
          <label class="acu-option-radio">
            <input
              type="radio"
              name="preset-conflict-mode"
              value="overwrite"
              checked
            />
            <span>覆盖现有预设</span>
          </label>
          <label class="acu-option-radio">
            <input
              type="radio"
              name="preset-conflict-mode"
              value="rename"
            />
            <span>新建副本（命名为「{{ suggestedName }}」）</span>
          </label>
        </div>
      </div>
      <div class="acu-conflict-footer">
        <button class="acu-btn acu-btn-cancel" @click="emit('cancel')">
          取消
        </button>
        <button class="acu-btn acu-btn-confirm" @click="handleConfirm">
          确认导入
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-conflict-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  z-index: 31300;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
}

.acu-conflict-dialog {
  background: var(--acu-bg-panel, #1a1a1e);
  border: 1px solid var(--acu-border, #333);
  border-radius: 12px;
  max-width: 480px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.acu-conflict-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  font-size: 15px;
  font-weight: 600;
  color: var(--acu-text, #e0e0e0);
  border-bottom: 1px solid var(--acu-border, #333);
  background: var(--acu-bg-header, #222);
}

.acu-conflict-body {
  padding: 20px;
}

.acu-conflict-warning {
  text-align: center;
  margin-bottom: 20px;
}

.acu-warning-icon {
  font-size: 36px;
  color: #f39c12;
  margin-bottom: 8px;
}

.acu-warning-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--acu-text, #e0e0e0);
  margin-bottom: 8px;
}

.acu-warning-message {
  font-size: 13px;
  color: var(--acu-text-secondary, #999);
}

.acu-conflict-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.acu-option-radio {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--acu-bg-input, #2a2a2e);
  border: 1px solid var(--acu-border, #444);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--acu-primary, #6c8cff);
  }

  input[type='radio'] {
    accent-color: var(--acu-primary, #6c8cff);
  }

  span {
    font-size: 13px;
    color: var(--acu-text, #e0e0e0);
  }
}

.acu-conflict-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--acu-border, #333);
  background: var(--acu-bg-footer, #1e1e22);
}

.acu-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.acu-btn-cancel {
  background: var(--acu-bg-input, #2a2a2e);
  color: var(--acu-text, #e0e0e0);
  border: 1px solid var(--acu-border, #444);

  &:hover {
    background: var(--acu-border, #444);
  }
}

.acu-btn-confirm {
  background: var(--acu-primary, #6c8cff);
  color: #fff;

  &:hover {
    background: var(--acu-primary-hover, #5a7ae6);
  }
}
</style>
