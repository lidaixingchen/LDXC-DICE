<script setup lang="ts">
import {
  attributePresetManager,
  type StoredAttributePreset,
  type AttributePresetConfig,
} from '@data/attribute-preset-manager';
import { computed, onMounted, ref } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const presets = ref<StoredAttributePreset[]>([]);
const activePresetId = ref<string | null>(null);
const editingPreset = ref<StoredAttributePreset | null>(null);
const showEditor = ref(false);
const editingAttribute = ref<AttributePresetConfig | null>(null);
const editingAttributeType = ref<'base' | 'special'>('base');
const showAttributeEditor = ref(false);

function loadPresets() {
  presets.value = attributePresetManager.getAllPresets();
  activePresetId.value = attributePresetManager.getActivePreset()?.id || null;
}

function setActivePreset(id: string | null) {
  attributePresetManager.setActivePreset(id);
  activePresetId.value = id;
}

function createNewPreset() {
  const newPreset = attributePresetManager.createPreset({
    name: '新属性预设',
    description: '自定义属性生成规则',
    baseAttributes: [],
    specialAttributes: [],
  });
  loadPresets();
  editPreset(newPreset);
}

function editPreset(preset: StoredAttributePreset) {
  editingPreset.value = JSON.parse(JSON.stringify(preset));
  showEditor.value = true;
}

function savePreset() {
  if (!editingPreset.value) return;

  if (editingPreset.value.builtin) {
    const newPreset = attributePresetManager.duplicatePreset(editingPreset.value.id);
    if (newPreset) {
      attributePresetManager.updatePreset(newPreset.id, {
        name: editingPreset.value.name + ' (修改版)',
        description: editingPreset.value.description,
        baseAttributes: editingPreset.value.baseAttributes,
        specialAttributes: editingPreset.value.specialAttributes,
        levelPresets: editingPreset.value.levelPresets,
      });
    }
  } else {
    attributePresetManager.updatePreset(editingPreset.value.id, {
      name: editingPreset.value.name,
      description: editingPreset.value.description,
      baseAttributes: editingPreset.value.baseAttributes,
      specialAttributes: editingPreset.value.specialAttributes,
      levelPresets: editingPreset.value.levelPresets,
    });
  }

  loadPresets();
  showEditor.value = false;
  editingPreset.value = null;
}

function deletePreset(id: string) {
  if (!confirm('确定要删除此预设吗？')) return;
  attributePresetManager.deletePreset(id);
  loadPresets();
}

function duplicatePreset(id: string) {
  const newPreset = attributePresetManager.duplicatePreset(id);
  if (newPreset) {
    loadPresets();
    editPreset(newPreset);
  }
}

function exportPreset(id: string) {
  const json = attributePresetManager.exportPreset(id);
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attribute_preset_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importPreset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const json = e.target?.result as string;
    const imported = attributePresetManager.importPreset(json, true);
    if (imported) {
      loadPresets();
      alert(`成功导入预设：${imported.name}`);
    } else {
      alert('导入失败：格式不正确');
    }
  };
  reader.readAsText(file);
}

function addAttribute(type: 'base' | 'special') {
  editingAttribute.value = {
    name: '',
    formula: '3d6',
    range: [3, 18],
  };
  editingAttributeType.value = type;
  showAttributeEditor.value = true;
}

function editAttribute(attr: AttributePresetConfig, type: 'base' | 'special', index: number) {
  editingAttribute.value = { ...attr, _index: index } as any;
  editingAttributeType.value = type;
  showAttributeEditor.value = true;
}

function saveAttribute() {
  if (!editingAttribute.value || !editingPreset.value) return;

  const index = (editingAttribute.value as any)._index;
  const attr = { ...editingAttribute.value };
  delete (attr as any)._index;

  if (index !== undefined) {
    if (editingAttributeType.value === 'base') {
      editingPreset.value.baseAttributes[index] = attr;
    } else {
      editingPreset.value.specialAttributes[index] = attr;
    }
  } else {
    if (editingAttributeType.value === 'base') {
      editingPreset.value.baseAttributes.push(attr);
    } else {
      editingPreset.value.specialAttributes.push(attr);
    }
  }

  showAttributeEditor.value = false;
  editingAttribute.value = null;
}

function deleteAttribute(type: 'base' | 'special', index: number) {
  if (!editingPreset.value) return;
  if (!confirm('确定要删除此属性吗？')) return;

  if (type === 'base') {
    editingPreset.value.baseAttributes.splice(index, 1);
  } else {
    editingPreset.value.specialAttributes.splice(index, 1);
  }
}

const builtinPresets = computed(() => presets.value.filter(p => p.builtin));
const customPresets = computed(() => presets.value.filter(p => !p.builtin));

onMounted(() => {
  loadPresets();
});
</script>

<template>
  <div class="acu-attribute-preset-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main">
          <i class="fa-solid fa-atom"></i>
          <span class="acu-title-text">属性规则管理器</span>
        </div>
        <div class="acu-title-sub">管理属性生成预设（COC7、DND5e等）</div>
      </div>
      <div class="acu-header-actions">
        <button class="acu-close-btn" @click="emit('close')">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <div class="acu-manager-toolbar">
        <button class="acu-half-btn primary" @click="createNewPreset">
          <i class="fa-solid fa-plus"></i> 新建预设
        </button>
        <label class="acu-half-btn">
          <i class="fa-solid fa-upload"></i> 导入预设
          <input type="file" accept=".json" @change="importPreset" style="display: none" />
        </label>
      </div>

      <div class="acu-preset-section">
        <h3 class="acu-section-title">
          <i class="fa-solid fa-star"></i> 内置预设
        </h3>
        <div class="acu-preset-list">
          <div
            v-for="preset in builtinPresets"
            :key="preset.id"
            class="acu-preset-item"
            :class="{ active: activePresetId === preset.id }"
          >
            <div class="acu-preset-header">
              <div class="acu-preset-info">
                <span class="acu-preset-name">{{ preset.name }}</span>
                <span class="acu-preset-badge builtin">内置</span>
              </div>
              <div class="acu-preset-actions">
                <button
                  v-if="activePresetId !== preset.id"
                  class="acu-icon-btn"
                  @click="setActivePreset(preset.id)"
                  title="激活"
                >
                  <i class="fa-solid fa-check"></i>
                </button>
                <button class="acu-icon-btn" @click="editPreset(preset)" title="查看">
                  <i class="fa-solid fa-eye"></i>
                </button>
                <button class="acu-icon-btn" @click="duplicatePreset(preset.id)" title="复制">
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button class="acu-icon-btn" @click="exportPreset(preset.id)" title="导出">
                  <i class="fa-solid fa-download"></i>
                </button>
              </div>
            </div>
            <div class="acu-preset-desc">{{ preset.description }}</div>
            <div class="acu-preset-stats">
              <span><i class="fa-solid fa-dice"></i> {{ preset.baseAttributes.length }} 基础属性</span>
              <span><i class="fa-solid fa-star"></i> {{ preset.specialAttributes.length }} 特殊属性</span>
            </div>
          </div>
        </div>
      </div>

      <div class="acu-preset-section">
        <h3 class="acu-section-title">
          <i class="fa-solid fa-user"></i> 自定义预设
        </h3>
        <div v-if="customPresets.length === 0" class="acu-empty-state">
          <i class="fa-solid fa-folder-open"></i>
          <p>暂无自定义预设</p>
          <p class="hint">点击"新建预设"或复制内置预设来自定义属性规则</p>
        </div>
        <div v-else class="acu-preset-list">
          <div
            v-for="preset in customPresets"
            :key="preset.id"
            class="acu-preset-item"
            :class="{ active: activePresetId === preset.id }"
          >
            <div class="acu-preset-header">
              <div class="acu-preset-info">
                <span class="acu-preset-name">{{ preset.name }}</span>
                <span class="acu-preset-badge custom">自定义</span>
              </div>
              <div class="acu-preset-actions">
                <button
                  v-if="activePresetId !== preset.id"
                  class="acu-icon-btn"
                  @click="setActivePreset(preset.id)"
                  title="激活"
                >
                  <i class="fa-solid fa-check"></i>
                </button>
                <button class="acu-icon-btn" @click="editPreset(preset)" title="编辑">
                  <i class="fa-solid fa-edit"></i>
                </button>
                <button class="acu-icon-btn" @click="duplicatePreset(preset.id)" title="复制">
                  <i class="fa-solid fa-copy"></i>
                </button>
                <button class="acu-icon-btn" @click="exportPreset(preset.id)" title="导出">
                  <i class="fa-solid fa-download"></i>
                </button>
                <button class="acu-icon-btn danger" @click="deletePreset(preset.id)" title="删除">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
            <div v-if="preset.description" class="acu-preset-desc">{{ preset.description }}</div>
            <div class="acu-preset-stats">
              <span><i class="fa-solid fa-dice"></i> {{ preset.baseAttributes.length }} 基础属性</span>
              <span><i class="fa-solid fa-star"></i> {{ preset.specialAttributes.length }} 特殊属性</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showEditor && editingPreset" class="acu-modal-overlay" @click.self="showEditor = false">
        <div class="acu-modal large">
          <div class="acu-modal-header">
            <span>{{ editingPreset.builtin ? '查看' : '编辑' }}预设：{{ editingPreset.name }}</span>
            <button @click="showEditor = false"><i class="fa-solid fa-times"></i></button>
          </div>
          <div class="acu-modal-body">
            <div class="acu-form-row">
              <label>预设名称</label>
              <input v-model="editingPreset.name" type="text" :disabled="editingPreset.builtin" />
            </div>
            <div class="acu-form-row">
              <label>描述</label>
              <textarea v-model="editingPreset.description" :disabled="editingPreset.builtin"></textarea>
            </div>

            <div class="acu-attributes-section">
              <div class="acu-attributes-header">
                <h4><i class="fa-solid fa-dice"></i> 基础属性 ({{ editingPreset.baseAttributes.length }})</h4>
                <button
                  v-if="!editingPreset.builtin"
                  class="acu-small-btn"
                  @click="addAttribute('base')"
                >
                  <i class="fa-solid fa-plus"></i> 添加
                </button>
              </div>
              <div class="acu-attributes-list">
                <div
                  v-for="(attr, idx) in editingPreset.baseAttributes"
                  :key="idx"
                  class="acu-attribute-item"
                >
                  <div class="acu-attr-info">
                    <span class="name">{{ attr.name }}</span>
                    <code class="formula">{{ attr.formula }}</code>
                    <span class="range">[{{ attr.range[0] }}, {{ attr.range[1] }}]</span>
                  </div>
                  <div v-if="!editingPreset.builtin" class="acu-attr-actions">
                    <button class="acu-icon-btn small" @click="editAttribute(attr, 'base', idx)">
                      <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="acu-icon-btn small danger" @click="deleteAttribute('base', idx)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="acu-attributes-section">
              <div class="acu-attributes-header">
                <h4><i class="fa-solid fa-star"></i> 特殊属性 ({{ editingPreset.specialAttributes.length }})</h4>
                <button
                  v-if="!editingPreset.builtin"
                  class="acu-small-btn"
                  @click="addAttribute('special')"
                >
                  <i class="fa-solid fa-plus"></i> 添加
                </button>
              </div>
              <div class="acu-attributes-list">
                <div
                  v-for="(attr, idx) in editingPreset.specialAttributes"
                  :key="idx"
                  class="acu-attribute-item"
                >
                  <div class="acu-attr-info">
                    <span class="name">{{ attr.name }}</span>
                    <code class="formula">{{ attr.formula }}</code>
                    <span class="range">[{{ attr.range[0] }}, {{ attr.range[1] }}]</span>
                  </div>
                  <div v-if="!editingPreset.builtin" class="acu-attr-actions">
                    <button class="acu-icon-btn small" @click="editAttribute(attr, 'special', idx)">
                      <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="acu-icon-btn small danger" @click="deleteAttribute('special', idx)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="acu-modal-footer">
            <button class="acu-half-btn" @click="showEditor = false">关闭</button>
            <button v-if="!editingPreset.builtin" class="acu-half-btn primary" @click="savePreset">
              保存
            </button>
          </div>
        </div>
      </div>

      <div v-if="showAttributeEditor && editingAttribute" class="acu-modal-overlay" @click.self="showAttributeEditor = false">
        <div class="acu-modal">
          <div class="acu-modal-header">
            <span>{{ (editingAttribute as any)._index !== undefined ? '编辑' : '添加' }}属性</span>
            <button @click="showAttributeEditor = false"><i class="fa-solid fa-times"></i></button>
          </div>
          <div class="acu-modal-body">
            <div class="acu-form-row">
              <label>属性名称</label>
              <input v-model="editingAttribute.name" type="text" placeholder="如：力量、敏捷" />
            </div>
            <div class="acu-form-row">
              <label>生成公式</label>
              <input v-model="editingAttribute.formula" type="text" placeholder="如：3d6、4d6dl1" />
            </div>
            <div class="acu-form-row">
              <label>数值范围</label>
              <div class="acu-range-inputs">
                <input v-model.number="editingAttribute.range[0]" type="number" placeholder="最小值" />
                <span>-</span>
                <input v-model.number="editingAttribute.range[1]" type="number" placeholder="最大值" />
              </div>
            </div>
            <div class="acu-form-row">
              <label>修正值（可选）</label>
              <input v-model="editingAttribute.modifier" type="text" placeholder="如：1d4-2" />
            </div>
          </div>
          <div class="acu-modal-footer">
            <button class="acu-half-btn" @click="showAttributeEditor = false">取消</button>
            <button class="acu-half-btn primary" @click="saveAttribute">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-attribute-preset-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.acu-manager-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-preset-section {
  padding: 12px;
}

.acu-section-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--acu-accent);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.acu-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--acu-text-sub);
  
  i {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.3;
  }
  
  p {
    margin: 4px 0;
    font-size: 14px;
  }
  
  .hint {
    font-size: 12px;
    opacity: 0.7;
  }
}

.acu-preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.acu-preset-item {
  background: var(--acu-card-bg);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--acu-accent);
  }
  
  &.active {
    border-color: var(--acu-accent);
    background: var(--acu-accent-light);
  }
}

.acu-preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.acu-preset-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.acu-preset-name {
  font-weight: bold;
  color: var(--acu-text-main);
  font-size: 14px;
}

.acu-preset-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  
  &.builtin {
    background: #d1ecf1;
    color: #0c5460;
  }
  
  &.custom {
    background: #d4edda;
    color: #155724;
  }
}

.acu-preset-actions {
  display: flex;
  gap: 4px;
}

.acu-icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: var(--acu-btn-hover);
    color: var(--acu-accent);
  }
  
  &.small {
    width: 24px;
    height: 24px;
    font-size: 11px;
  }
  
  &.danger:hover {
    background: var(--acu-error-bg);
    color: var(--acu-error-text);
  }
}

.acu-preset-desc {
  font-size: 12px;
  color: var(--acu-text-sub);
  margin-bottom: 8px;
  line-height: 1.4;
}

.acu-preset-stats {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--acu-text-sub);
  
  i {
    margin-right: 4px;
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
  z-index: 32000;
}

.acu-modal {
  background: var(--acu-bg-panel);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  
  &.large {
    max-width: 700px;
  }
}

.acu-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--acu-border);
  font-weight: bold;
  color: var(--acu-text-main);
  
  button {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--acu-text-sub);
    cursor: pointer;
    
    &:hover {
      background: var(--acu-btn-bg);
      color: var(--acu-text-main);
    }
  }
}

.acu-modal-body {
  padding: 16px;
  overflow-y: auto;
}

.acu-form-row {
  margin-bottom: 12px;
  
  label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--acu-text-sub);
  }
  
  input, textarea, select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--acu-border);
    border-radius: 6px;
    background: var(--acu-input-bg);
    color: var(--acu-text-main);
    font-size: 13px;
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
  
  textarea {
    min-height: 60px;
    resize: vertical;
  }
}

.acu-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  
  input {
    flex: 1;
  }
  
  span {
    color: var(--acu-text-sub);
  }
}

.acu-attributes-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--acu-border);
}

.acu-attributes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  h4 {
    font-size: 13px;
    font-weight: bold;
    color: var(--acu-text-main);
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.acu-small-btn {
  padding: 4px 12px;
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  
  &:hover {
    background: var(--acu-btn-hover);
  }
}

.acu-attributes-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.acu-attribute-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
}

.acu-attr-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  
  .name {
    font-weight: bold;
    font-size: 12px;
    color: var(--acu-text-main);
  }
  
  .formula {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: var(--acu-accent);
    background: var(--acu-accent-light);
    padding: 2px 6px;
    border-radius: 3px;
  }
  
  .range {
    font-size: 11px;
    color: var(--acu-text-sub);
  }
}

.acu-attr-actions {
  display: flex;
  gap: 4px;
}

.acu-modal-footer {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--acu-border);
}

.acu-half-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  
  &:hover {
    background: var(--acu-btn-hover);
  }
  
  &.primary {
    background: var(--acu-accent);
    color: var(--acu-button-text-on-accent, #fff);
    border-color: var(--acu-accent);
    
    &:hover {
      background: var(--acu-btn-hover);
      color: var(--acu-accent);
    }
  }
}
</style>
