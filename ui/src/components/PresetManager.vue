<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AdvancedDicePreset } from '@core/types';
import { presetManager } from '@data/preset-manager';
import { presetFileLoader } from '@presets/preset-file-loader';

type PresetType = 'dice' | 'attribute' | 'validation';
type ViewMode = 'main' | 'dice-list' | 'dice-editor' | 'attribute-list' | 'attribute-editor' | 'validation-list' | 'validation-editor';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const viewMode = ref<ViewMode>('main');
const activeTab = ref<PresetType>('dice');

const dicePresets = ref<AdvancedDicePreset[]>([]);
const attributePresets = ref<any[]>([]);
const validationPresets = ref<any[]>([]);

const editingPresetId = ref<string | null>(null);
const editingPresetType = ref<PresetType>('dice');
const editingPresetName = ref('');
const editingPresetDesc = ref('');
const editingPresetJson = ref('');
const jsonError = ref('');
const searchQuery = ref('');
const draggedId = ref<string | null>(null);

const hideDiceResultFromUser = ref(false);
const hideDiceResultInChat = ref(false);

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

const filteredAttributePresets = computed(() => {
  if (!searchQuery.value) return attributePresets.value;
  const query = searchQuery.value.toLowerCase();
  return attributePresets.value.filter(
    p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
  );
});

const filteredValidationPresets = computed(() => {
  if (!searchQuery.value) return validationPresets.value;
  const query = searchQuery.value.toLowerCase();
  return validationPresets.value.filter(
    p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
  );
});

function loadAllPresets() {
  dicePresets.value = presetManager.getAllPresets().filter(p => (p as AdvancedDicePreset).kind === 'advanced' || p.kind === 'dice');
  attributePresets.value = [];
  validationPresets.value = [];
}

}

}
</script>

<template>
  <div class="preset-manager">
    <div class="preset-header">
      <div class="preset-title">
        <i class="fa-solid fa-sliders-h"></i>
        <span>预设管理器</span>
      </div>
      <div class="preset-tabs">
        <button
          v-for="tab in ['dice', 'attribute', 'validation']"
          :key="tab"
          :class="['active', activeTab === tab]"
          @click="activeTab = tab"
        >
          {{ tab === 'dice' ? '🎲 检定' : (tab === 'attribute' ? '📊 属性' : '✅ 验证') }}
        </button>
      </div>

      <div class="preset-body">
        <template v-if="activeTab === 'dice'">
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

          <template v-else-if="activeTab === 'attribute'">
            <div class="attribute-section">
              <div class="section-header">
              <span>属性预设</span>
              <button class="add-btn" @click="openAttributeEditor(null)">
                <i class="fa-solid fa-plus"></i> 新建
              </button>
            </div>
            <div class="preset-toolbar">
              <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索属性预设..." />
            </div>
            <div class="preset-list">
              <div
                v-for="preset in filteredAttributePresets"
                :key="preset.id"
                class="preset-item"
                @click="selectAttributePreset(preset)"
              >
                <div class="preset-info">
                  <div class="preset-name">{{ preset.name }}</div>
                  <div class="preset-desc">{{ preset.description || '无描述' }}</div>
                </div>
              </div>
              <div v-if="filteredAttributePresets.length === 0" class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <span>暂无属性预设</span>
              </div>
            </div>
          </div>

          <template v-else-if="activeTab === 'validation'">
            <div class="validation-section">
              <div class="section-header">
              <span>验证预设</span>
              <button class="add-btn" @click="openValidationEditor(null)">
                <i class="fa-solid fa-plus"></i> 新建
              </button>
            </div>
            <div class="preset-toolbar">
              <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索验证预设..." />
            </div>
            <div class="preset-list">
              <div
                v-for="preset in filteredValidationPresets"
                :key="preset.id"
                class="preset-item"
                @click="selectValidationPreset(preset)"
              >
                <div class="preset-info">
                  <div class="preset-name">{{ preset.name }}</div>
                  <div class="preset-desc">{{ preset.description || '无描述' }}</div>
                </div>
              </div>
              <div v-if="filteredValidationPresets.length === 0" class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <span>暂无验证预设</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="viewMode === 'dice-editor'" class="editor-overlay">
      <div class="editor-modal">
        <div class="editor-header">
          <span>{{ editingPresetId ? '编辑检定预设' : '新建检定预设' }}</span>
          <button class="editor-close" @click="viewMode = 'dice-list'">
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
          <button class="footer-btn" @click="viewMode = 'dice-list'">
            <i class="fa-solid fa-times"></i> 取消
          </button>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'attribute-editor'" class="editor-overlay">
      <div class="editor-modal">
        <div class="editor-header">
          <span>{{ editingPresetId ? '编辑属性预设' : '新建属性预设' }}</span>
          <button class="editor-close" @click="viewMode = 'attribute-list'">
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
              placeholder="属性预设JSON配置..."
              rows="12"
            ></textarea>
          </div>
          <div v-if="jsonError" class="error-message">{{ jsonError }}</div>
        </div>
        <div class="editor-footer">
          <button class="footer-btn primary" @click="saveAttributePreset">
            <i class="fa-solid fa-check"></i> 保存
          </button>
          <button class="footer-btn" @click="viewMode = 'attribute-list'">
            <i class="fa-solid fa-times"></i> 取消
          </button>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'validation-editor'" class="editor-overlay">
      <div class="editor-modal">
        <div class="editor-header">
          <span>{{ editingPresetId ? '编辑验证预设' : '新建验证预设' }}</span>
          <button class="editor-close" @click="viewMode = 'validation-list'">
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
              placeholder="验证预设JSON配置..."
              rows="12"
            ></textarea>
          </div>
          <div v-if="jsonError" class="error-message">{{ jsonError }}</div>
        </div>
        <div class="editor-footer">
          <button class="footer-btn primary" @click="saveValidationPreset">
            <i class="fa-solid fa-check"></i> 保存
          </button>
          <button class="footer-btn" @click="viewMode = 'validation-list'">
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
