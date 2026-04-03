<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AdvancedDicePreset } from '@core/types';
import { presetManager } from '@data/preset-manager';

type ViewMode = 'main' | 'dice-editor';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const viewMode = ref<ViewMode>('main');

const dicePresets = ref<AdvancedDicePreset[]>([]);

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

function loadAllPresets() {
  dicePresets.value = presetManager.getAllPresets().filter(p => (p as AdvancedDicePreset).kind === 'advanced' || (p as any).kind === 'dice');
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

function selectDicePreset(preset: AdvancedDicePreset): void {
  editingPresetId.value = preset.id;
  editingPresetName.value = preset.name;
  editingPresetDesc.value = preset.description || '';
  editingPresetJson.value = JSON.stringify(preset, null, 2);
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
        data.forEach(p => presetManager.addPreset(p));
      } else {
        presetManager.addPreset(data);
      }
      loadAllPresets();
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
    presetManager.removePreset(preset.id);
    loadAllPresets();
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
    presetManager.addPreset(data);
    loadAllPresets();
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
    <div class="preset-header">
      <div class="preset-title">
        <i class="fa-solid fa-sliders-h"></i>
        <span>预设管理器</span>
      </div>
    </div>

    <div class="preset-body">
      <div class="dice-section">
        <div class="section-header">
          <span>检定预设</span>
          <button class="add-btn" @click="openDiceEditor(null)">
            <i class="fa-solid fa-plus"></i> 新建
          </button>
        </div>
        <div class="preset-toolbar">
          <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索检定预设..." />
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
            @click="selectDicePreset(preset)"
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
  </div>
</template>

<style scoped lang="scss">
.preset-manager {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--acu-bg-panel, #1a1a1e);
  border-radius: 12px;
  overflow: hidden;
}

</style>
