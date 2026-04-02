<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AdvancedDicePreset } from '@core/types';
import { presetManager } from '@data/preset-manager';
import { presetFileLoader } from '@presets/preset-file-loader';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', preset: AdvancedDicePreset): void;
}>();

const presets = ref<AdvancedDicePreset[]>([]);
const selectedPresetId = ref<string>('');
const searchQuery = ref('');
const showImportModal = ref(false);
const importJson = ref('');
const importError = ref('');

const filteredPresets = computed(() => {
  if (!searchQuery.value) return presets.value;
  const query = searchQuery.value.toLowerCase();
  return presets.value.filter(
    p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
  );
});

const builtinPresets = computed(() => filteredPresets.value.filter(p => p.builtin));
const customPresets = computed(() => filteredPresets.value.filter(p => !p.builtin));

function loadPresets() {
  presets.value = presetManager.getAllPresets();
}

function selectPreset(preset: AdvancedDicePreset) {
  selectedPresetId.value = preset.id;
  emit('select', preset);
}

function duplicatePreset(preset: AdvancedDicePreset) {
  const newName = prompt('请输入新预设名称：', `${preset.name} (副本)`);
  if (!newName) return;

  const copy = presetManager.duplicatePreset(preset.id, newName);
  if (copy) {
    loadPresets();
  }
}

function deletePreset(preset: AdvancedDicePreset) {
  if (preset.builtin) {
    alert('内置预设不能删除');
    return;
  }

  if (confirm(`确定要删除预设 "${preset.name}" 吗？`)) {
    presetManager.unregisterPreset(preset.id);
    loadPresets();
  }
}

function exportPreset(preset: AdvancedDicePreset) {
  const json = presetManager.exportPreset(preset.id);
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAllPresets() {
  const json = presetFileLoader.exportAllPresets();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all_presets_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.multiple = true;

  input.onchange = async e => {
    const files = (e.target as HTMLInputElement).files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const result = await presetFileLoader.loadPresetFromFile(files[i]);
      if (result.success) {
        console.log(`成功导入: ${result.preset?.name}`);
      } else {
        alert(`导入失败: ${result.error}`);
      }
    }

    loadPresets();
  };

  input.click();
}

function showImportDialog() {
  importJson.value = '';
  importError.value = '';
  showImportModal.value = true;
}

async function importFromJson() {
  if (!importJson.value.trim()) {
    importError.value = '请输入JSON内容';
    return;
  }

  try {
    const result = await presetFileLoader.loadPresetsFromJsonArray(importJson.value);
    if (result.loaded > 0) {
      showImportModal.value = false;
      loadPresets();
      alert(`成功导入 ${result.loaded} 个预设`);
    } else {
      importError.value = result.errors.join('\n');
    }
  } catch (e) {
    importError.value = e instanceof Error ? e.message : '导入失败';
  }
}

onMounted(() => {
  loadPresets();
});
</script>

<template>
  <div class="acu-preset-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title"><i class="fa-solid fa-dice"></i> 预设管理器</div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-preset-toolbar">
      <input v-model="searchQuery" type="text" class="acu-search-input" placeholder="搜索预设..." />
      <div class="acu-toolbar-actions">
        <button class="acu-toolbar-btn" title="导入文件" @click="importFromFile">
          <i class="fa-solid fa-file-import"></i>
        </button>
        <button class="acu-toolbar-btn" title="粘贴导入" @click="showImportDialog">
          <i class="fa-solid fa-paste"></i>
        </button>
        <button class="acu-toolbar-btn" title="导出全部" @click="exportAllPresets">
          <i class="fa-solid fa-file-export"></i>
        </button>
      </div>
    </div>

    <div class="acu-preset-list">
      <div v-if="builtinPresets.length > 0" class="acu-preset-section">
        <div class="acu-section-title">内置预设</div>
        <div
          v-for="preset in builtinPresets"
          :key="preset.id"
          class="acu-preset-item"
          :class="{ active: selectedPresetId === preset.id }"
          @click="selectPreset(preset)"
        >
          <div class="acu-preset-info">
            <div class="acu-preset-name">
              <i class="fa-solid fa-lock"></i>
              {{ preset.name }}
            </div>
            <div class="acu-preset-desc">{{ preset.description || '无描述' }}</div>
          </div>
          <div class="acu-preset-actions">
            <button title="复制" @click.stop="duplicatePreset(preset)">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button title="导出" @click.stop="exportPreset(preset)">
              <i class="fa-solid fa-download"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-if="customPresets.length > 0" class="acu-preset-section">
        <div class="acu-section-title">自定义预设</div>
        <div
          v-for="preset in customPresets"
          :key="preset.id"
          class="acu-preset-item"
          :class="{ active: selectedPresetId === preset.id }"
          @click="selectPreset(preset)"
        >
          <div class="acu-preset-info">
            <div class="acu-preset-name">{{ preset.name }}</div>
            <div class="acu-preset-desc">{{ preset.description || '无描述' }}</div>
          </div>
          <div class="acu-preset-actions">
            <button title="复制" @click.stop="duplicatePreset(preset)">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button title="导出" @click.stop="exportPreset(preset)">
              <i class="fa-solid fa-download"></i>
            </button>
            <button class="danger" title="删除" @click.stop="deletePreset(preset)">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredPresets.length === 0" class="acu-empty-state">
        <i class="fa-solid fa-inbox"></i>
        <p>没有找到预设</p>
      </div>
    </div>

    <div v-if="showImportModal" class="acu-modal-overlay" @click.self="showImportModal = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>导入预设</span>
          <button @click="showImportModal = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row">
            <label>JSON内容（支持数组格式）</label>
            <textarea v-model="importJson" placeholder="粘贴JSON内容..." rows="10"></textarea>
          </div>
          <div v-if="importError" class="acu-error-message">{{ importError }}</div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-half-btn" @click="showImportModal = false">取消</button>
          <button class="acu-half-btn primary" @click="importFromJson">导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-preset-manager {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--acu-bg-panel);
}

.acu-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-panel-title {
  font-weight: 800;
  color: var(--acu-text-main);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.acu-close-btn {
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  &:hover {
    background: var(--acu-accent-light);
    color: var(--acu-accent);
  }
}

.acu-preset-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-search-input {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  font-size: 12px;
}

.acu-toolbar-actions {
  display: flex;
  gap: 4px;
}

.acu-toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }
}

.acu-preset-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.acu-preset-section {
  margin-bottom: 16px;
}

.acu-section-title {
  font-size: 10px;
  font-weight: 900;
  color: var(--acu-accent);
  text-transform: uppercase;
  margin-bottom: 8px;
  padding: 0 4px;
}

.acu-preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--acu-accent);
    background: var(--acu-bg-panel);
  }

  &.active {
    border-color: var(--acu-accent);
    background: var(--acu-accent-light);
  }
}

.acu-preset-info {
  flex: 1;
  min-width: 0;
}

.acu-preset-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    font-size: 10px;
    color: var(--acu-text-sub);
  }
}

.acu-preset-desc {
  font-size: 11px;
  color: var(--acu-text-sub);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.acu-preset-actions {
  display: flex;
  gap: 4px;

  button {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--acu-text-sub);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;

    &:hover {
      background: var(--acu-accent-light);
      color: var(--acu-accent);
    }

    &.danger:hover {
      background: #ffebee;
      color: #e74c3c;
    }
  }
}

.acu-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--acu-text-sub);

  i {
    font-size: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
  }

  p {
    font-size: 14px;
  }
}

.acu-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.acu-modal {
  background: var(--acu-bg-panel);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.acu-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--acu-border);
  font-weight: 600;
  color: var(--acu-text-main);

  button {
    background: transparent;
    border: none;
    color: var(--acu-text-sub);
    cursor: pointer;
    font-size: 16px;
    &:hover {
      color: var(--acu-accent);
    }
  }
}

.acu-modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.acu-form-row {
  margin-bottom: 12px;

  label {
    display: block;
    font-size: 11px;
    color: var(--acu-text-sub);
    margin-bottom: 4px;
  }

  textarea {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    color: var(--acu-text-main);
    font-size: 12px;
    font-family: 'Courier New', monospace;
    resize: vertical;
  }
}

.acu-error-message {
  color: #e74c3c;
  font-size: 12px;
  padding: 8px;
  background: #ffebee;
  border-radius: 4px;
}

.acu-modal-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--acu-border);
}

.acu-half-btn {
  flex: 1;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;

  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }

  &.primary {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }
}
</style>
