<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AdvancedDicePreset } from '@core/types';
import { presetManager } from '@data/preset-manager';
import { notifyPresetsUpdated } from '../../composables/core/usePresets';
import PresetConflictDialog from './PresetConflictDialog.vue';

type ViewMode = 'main' | 'dice-editor';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const viewMode = ref<ViewMode>('main');

const dicePresets = ref<AdvancedDicePreset[]>([]);

// 预设导入冲突弹窗状态
const showConflictDialog = ref(false);
const conflictPresetData = ref<AdvancedDicePreset | null>(null);
const conflictExistingNames = ref<string[]>([]);

const editingPresetId = ref<string | null>(null);
const editingPresetName = ref('');
const editingPresetDesc = ref('');
const editingPresetJson = ref('');
const jsonError = ref('');
const searchQuery = ref('');

const filteredDicePresets = computed(() => {
  if (!searchQuery.value) return dicePresets.value;
  const query = searchQuery.value.toLowerCase();
  return dicePresets.value.filter(
    p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
  );
});

const AIDM_PRESET_IDS = new Set(['aidm_standard_check', 'aidm_combat_check', 'aidm_defense_check', 'aidm_contest_check']);

function loadAllPresets() {
  dicePresets.value = presetManager.getAllPresets()
    .filter(p => ((p as AdvancedDicePreset).kind === 'advanced' || (p as any).kind === 'dice') && !AIDM_PRESET_IDS.has(p.id!));
}

function openDiceEditor(id: string | null): void {
  editingPresetId.value = id;
  if (id) {
    const preset = dicePresets.value.find(p => p.id === id);
    if (preset) {
      editingPresetName.value = preset.name;
      editingPresetDesc.value = preset.description || '';
      editingPresetJson.value = JSON.stringify(preset, null, 2);
    }
  } else {
    editingPresetName.value = '';
    editingPresetDesc.value = '';
    editingPresetJson.value = '';
  }
  jsonError.value = '';
  viewMode.value = 'dice-editor';
}

function hasNameConflict(preset: AdvancedDicePreset): boolean {
  return dicePresets.value.some(p => p.name === preset.name);
}

function resolveConflictOverwrite(): void {
  if (!conflictPresetData.value) return;
  showConflictDialog.value = false;
  presetManager.registerPreset(conflictPresetData.value);
  loadAllPresets();
  notifyPresetsUpdated();
  conflictPresetData.value = null;
}

function resolveConflictRename(newName: string): void {
  if (!conflictPresetData.value) return;
  showConflictDialog.value = false;
  conflictPresetData.value.name = newName;
  conflictPresetData.value.id = `${conflictPresetData.value.id}_${Date.now()}`;
  presetManager.registerPreset(conflictPresetData.value);
  loadAllPresets();
  notifyPresetsUpdated();
  conflictPresetData.value = null;
}

function resolveConflictCancel(): void {
  showConflictDialog.value = false;
  conflictPresetData.value = null;
  conflictExistingNames.value = [];
}

function doImport(preset: AdvancedDicePreset): void {
  if (hasNameConflict(preset)) {
    conflictPresetData.value = preset;
    conflictExistingNames.value = dicePresets.value.map(p => p.name);
    showConflictDialog.value = true;
  } else {
    presetManager.registerPreset(preset);
    loadAllPresets();
    notifyPresetsUpdated();
  }
}

function importDiceFromFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        data.forEach(p => doImport(p as AdvancedDicePreset));
      } else {
        doImport(data as AdvancedDicePreset);
      }
    } catch (err) {
      jsonError.value = '导入失败: ' + (err as Error).message;
    }
  };
  input.click();
}

function exportDicePreset(preset: AdvancedDicePreset): void {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.name || preset.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAllDicePresets(): void {
  const blob = new Blob([JSON.stringify(dicePresets.value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'all-dice-presets.json';
  a.click();
  URL.revokeObjectURL(url);
}

function deleteDicePreset(preset: AdvancedDicePreset): void {
  if (confirm(`确定删除预设 "${preset.name}"？`)) {
    presetManager.unregisterPreset(preset.id);
    loadAllPresets();
    notifyPresetsUpdated();
  }
}

function saveDicePreset(): void {
  try {
    const data = JSON.parse(editingPresetJson.value);
    data.id = editingPresetId.value || `custom_${Date.now()}`;
    data.name = editingPresetName.value || '未命名预设';
    data.description = editingPresetDesc.value;
    data.kind = 'advanced';
    data.version = data.version || '1.0.0';
    presetManager.registerPreset(data);
    loadAllPresets();
    notifyPresetsUpdated();
    viewMode.value = 'main';
  } catch (err) {
    jsonError.value = 'JSON 解析错误: ' + (err as Error).message;
  }
}

onMounted(() => {
  loadAllPresets();
});

</script>

<template>
  <div class="preset-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <i class="fa-solid fa-sliders-h"></i>
        <span>预设管理器</span>
      </div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="preset-body">
      <div class="dice-section">
        <div class="section-header">
          <span>通用检定预设</span>
          <button class="add-btn" @click="openDiceEditor(null)">
            <i class="fa-solid fa-plus"></i> 新建
          </button>
        </div>
        <div class="preset-toolbar">
          <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索通用预设..." />
          <div class="toolbar-actions">
            <button class="toolbar-btn" title="导入文件" @click="importDiceFromFile">
              <i class="fa-solid fa-file-import"></i>
            </button>
            <button class="toolbar-btn" title="导出全部" @click="exportAllDicePresets">
              <i class="fa-solid fa-file-export"></i>
            </button>
          </div>
        </div>
        <div class="preset-list">
          <div
            v-for="preset in filteredDicePresets"
            :key="preset.id"
            class="preset-item"
            @click="openDiceEditor(preset.id)"
          >
            <div class="preset-info">
              <div class="preset-name">{{ preset.name }}</div>
              <div class="preset-desc">{{ preset.description || '无描述' }}</div>
            </div>
            <div class="preset-actions">
              <button title="编辑" @click.stop="openDiceEditor(preset.id)">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button title="导出" @click.stop="exportDicePreset(preset)">
                <i class="fa-solid fa-download"></i>
              </button>
              <button class="danger" title="删除" @click.stop="deleteDicePreset(preset)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
          <div v-if="filteredDicePresets.length === 0" class="empty-state">
            <i class="fa-solid fa-inbox"></i>
            <span>暂无检定预设</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'dice-editor'" class="editor-overlay">
      <div class="editor-modal">
        <div class="editor-header">
          <span>{{ editingPresetId ? '编辑检定预设' : '新建检定预设' }}</span>
          <button class="editor-close" @click="viewMode = 'main'">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        <div class="editor-body">
          <div class="form-row">
            <label>预设名称</label>
            <input v-model="editingPresetName" type="text" class="form-input" placeholder="输入预设名称" />
          </div>
          <div class="form-row">
            <label>描述</label>
            <input v-model="editingPresetDesc" type="text" class="form-input" placeholder="可选描述" />
          </div>
          <div class="form-row">
            <label>JSON配置</label>
            <textarea
              v-model="editingPresetJson"
              class="form-textarea"
              placeholder="预设JSON配置..."
              rows="12"
            ></textarea>
          </div>
          <div v-if="jsonError" class="error-message">{{ jsonError }}</div>
        </div>
        <div class="editor-footer">
          <button class="footer-btn primary" @click="saveDicePreset">
            <i class="fa-solid fa-check"></i> 保存
          </button>
          <button class="footer-btn" @click="viewMode = 'main'">
            <i class="fa-solid fa-times"></i> 取消
          </button>
        </div>
      </div>
    </div>
    <!-- 预设导入冲突弹窗 -->
    <PresetConflictDialog
      v-if="showConflictDialog && conflictPresetData"
      :preset-name="conflictPresetData.name"
      preset-type="检定"
      :existing-names="conflictExistingNames"
      @overwrite="resolveConflictOverwrite"
      @rename="resolveConflictRename"
      @cancel="resolveConflictCancel"
    />
  </div>
</template>

<style scoped lang="scss">
.preset-manager {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--acu-bg-panel);
  overflow: hidden;
}

.acu-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: var(--acu-bg-header);
  border-bottom: 1px solid var(--acu-border);
}

.acu-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 13px;
  color: var(--acu-accent);
}

.acu-close-btn {
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
  &:hover {
    background: var(--acu-accent-light);
    color: var(--acu-accent);
  }
}

.preset-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.dice-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 900;
  color: var(--acu-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--acu-border);
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
    color: var(--acu-accent);
  }
}

.preset-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 30px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  font-size: 12px;
  outline: none;
  &:focus {
    border-color: var(--acu-accent);
  }
  &::placeholder {
    color: var(--acu-text-sub);
  }
}

.toolbar-actions {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.15s;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
    color: var(--acu-accent);
  }
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: var(--acu-accent);
    background: var(--acu-accent-light);
  }
}

.preset-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-desc {
  font-size: 11px;
  color: var(--acu-text-sub);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
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
    transition: all 0.15s;
    &:hover {
      background: var(--acu-accent-light);
      color: var(--acu-accent);
    }
    &.danger:hover {
      background: var(--acu-error-bg);
      color: var(--acu-error-text);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--acu-text-sub);
  gap: 8px;
  i {
    font-size: 36px;
    opacity: 0.3;
  }
  span {
    font-size: 12px;
  }
}

.editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--acu-z-modal, 31100);
}

.editor-modal {
  background: var(--acu-bg-panel);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--acu-border);
  font-weight: 600;
  font-size: 13px;
  color: var(--acu-text-main);
}

.editor-close {
  background: transparent;
  border: none;
  color: var(--acu-text-sub);
  cursor: pointer;
  font-size: 14px;
  &:hover {
    color: var(--acu-accent);
  }
}

.editor-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.form-row {
  margin-bottom: 12px;
  label {
    display: block;
    font-size: 11px;
    color: var(--acu-text-sub);
    margin-bottom: 4px;
  }
}

.form-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  font-size: 12px;
  outline: none;
  &:focus {
    border-color: var(--acu-accent);
  }
}

.form-textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  font-size: 12px;
  font-family: 'Courier New', monospace;
  resize: vertical;
  outline: none;
  &:focus {
    border-color: var(--acu-accent);
  }
}

.error-message {
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--acu-error-bg);
  color: var(--acu-error-text);
  font-size: 12px;
  margin-top: 8px;
}

.editor-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--acu-border);
}

.footer-btn {
  flex: 1;
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;
  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }
  &.primary {
    background: var(--acu-accent);
    color: var(--acu-button-text-on-accent, #fff);
    border-color: var(--acu-accent);
    &:hover {
      opacity: 0.9;
    }
  }
}
</style>
