<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AdvancedDicePreset } from '@core/types';
import { presetManager } from '@data/preset-manager';
import { presetFileLoader } from '@presets/preset-file-loader';

type ViewMode = 'main' | 'preset-list' | 'preset-editor';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const viewMode = ref<ViewMode>('main');
const presets = ref<AdvancedDicePreset[]>([]);
const editingPresetId = ref<string | null>(null);
const editingPresetName = ref('');
const editingPresetDesc = ref('');
const editingPresetJson = ref('');
const jsonError = ref('');
const searchQuery = ref('');
const draggedId = ref<string | null>(null);

const hideDiceResultFromUser = ref(false);
const hideDiceResultInChat = ref(false);

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

const sortedPresets = computed(() => {
  return [...filteredPresets.value].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
});

function loadPresets() {
  presets.value = presetManager.getAllPresets();
}

function togglePresetVisibility(preset: AdvancedDicePreset) {
  const newVisible = preset.visible === false ? true : false;
  presetManager.updatePreset(preset.id, { visible: newVisible });
  loadPresets();
}

function startDrag(id: string) {
  draggedId.value = id;
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
}

function onDrop(targetId: string) {
  if (!draggedId.value || draggedId.value === targetId) {
    draggedId.value = null;
    return;
  }

  const draggedIndex = presets.value.findIndex(p => p.id === draggedId.value);
  const targetIndex = presets.value.findIndex(p => p.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) {
    draggedId.value = null;
    return;
  }

  const newOrder = [...presets.value];
  const [draggedItem] = newOrder.splice(draggedIndex, 1);
  newOrder.splice(targetIndex, 0, draggedItem);

  newOrder.forEach((p, idx) => {
    presetManager.updatePreset(p.id, { order: idx });
  });

  loadPresets();
  draggedId.value = null;
}

function openPresetEditor(presetId: string | null) {
  editingPresetId.value = presetId;

  if (presetId) {
    const preset = presets.value.find(p => p.id === presetId);
    if (preset) {
      editingPresetName.value = preset.name;
      editingPresetDesc.value = preset.description || '';
      editingPresetJson.value = JSON.stringify(preset, null, 2);
    }
  } else {
    editingPresetName.value = '新检定预设';
    editingPresetDesc.value = '自定义检定规则';
    editingPresetJson.value = JSON.stringify(getDefaultPreset(), null, 2);
  }

  jsonError.value = '';
  viewMode.value = 'preset-editor';
}

function getDefaultPreset(): AdvancedDicePreset {
  return {
    name: '新检定预设',
    description: '自定义检定规则示例',
    diceExpression: '1d20',
    attribute: {
      label: '属性值',
      placeholder: '留空=10',
      defaultValue: 10,
      key: '属性值',
    },
    dc: {
      label: '难度等级(DC)',
      placeholder: '留空=10',
      defaultValue: 10,
    },
    mod: {
      label: '修正值',
      placeholder: '留空=0',
      defaultValue: 0,
    },
    customFields: [
      {
        id: 'advantage',
        type: 'select',
        label: '优势/劣势',
        defaultValue: 0,
        options: [
          { label: '正常', value: 0 },
          { label: '优势', value: 1 },
          { label: '劣势', value: -1 },
        ],
      },
    ],
    derivedVars: [{ id: 'attrMod', expr: 'floor(($attr - 10) / 2)' }],
    dicePatches: [
      { when: '$advantage > 0', op: 'replace', template: '2d20kh1' },
      { when: '$advantage < 0', op: 'replace', template: '2d20kl1' },
    ],
    outcomes: [
      {
        id: 'crit_success',
        name: '大成功',
        condition: "$roll.hasTag('nat20')",
        priority: 1,
        rank: 3,
        contestRank: 100,
      },
      {
        id: 'success',
        name: '成功',
        condition: '$roll.total + $attrMod + $mod >= $dc',
        priority: 10,
        rank: 1,
        contestRank: 60,
      },
      {
        id: 'failure',
        name: '失败',
        condition: '$roll.total + $attrMod + $mod < $dc',
        priority: 50,
        rank: 0,
        contestRank: 40,
      },
      {
        id: 'crit_failure',
        name: '大失败',
        condition: "$roll.hasTag('nat1')",
        priority: 2,
        rank: -1,
        contestRank: 20,
      },
    ],
    contestRule: {
      mode: 'rank',
      tieBreakers: ['higher_roll', 'initiator_wins'],
    },
    outputTemplate:
      '<meta:检定结果>\n$outcomeText\n元叙事：$initiator 发起了 $attrName 检定，$formula=$roll，判定 $conditionExpr？$judgeResult，判定为【$outcomeName】\n</meta:检定结果>',
    builtin: false,
    visible: true,
  };
}

function savePreset() {
  if (!editingPresetName.value.trim()) {
    jsonError.value = '请输入预设名称';
    return;
  }

  try {
    const jsonData = JSON.parse(editingPresetJson.value);

    if (!jsonData.diceExpression || !jsonData.outcomes || !Array.isArray(jsonData.outcomes) || jsonData.outcomes.length === 0) {
      jsonError.value = '骰子表达式和判定结果列表(outcomes)不能为空';
      return;
    }

    for (const outcome of jsonData.outcomes) {
      if (!outcome.id || !outcome.name || outcome.condition === undefined || outcome.priority === undefined) {
        jsonError.value = `判定结果 "${outcome.name || outcome.id || '未知'}" 缺少必填字段(id, name, condition, priority)`;
        return;
      }
    }

    const preset: AdvancedDicePreset = {
      ...(editingPresetId.value ? presets.value.find(p => p.id === editingPresetId.value) || {} : {}),
      ...jsonData,
      id: editingPresetId.value || `custom_${Date.now()}`,
      name: editingPresetName.value.trim(),
      description: editingPresetDesc.value.trim(),
      builtin: editingPresetId.value ? presets.value.find(p => p.id === editingPresetId.value)?.builtin ?? false : false,
    };

    if (editingPresetId.value) {
      presetManager.updatePreset(editingPresetId.value, preset);
    } else {
      presetManager.registerPreset(preset);
    }

    loadPresets();
    viewMode.value = 'preset-list';
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : '';
    if (errMsg.includes('JSON') || errMsg.includes('position') || errMsg.includes('token')) {
      jsonError.value = 'JSON格式错误：请确保所有键名和字符串值都用双引号包裹';
    } else {
      jsonError.value = '保存失败：' + errMsg;
    }
  }
}

function duplicatePreset(preset: AdvancedDicePreset) {
  const copy: AdvancedDicePreset = {
    ...preset,
    id: `custom_${Date.now()}`,
    name: `${preset.name} (副本)`,
    builtin: false,
  };
  presetManager.registerPreset(copy);
  loadPresets();
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
  a.download = `acu_preset_${preset.name}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async e => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || !files[0]) return;

    const result = await presetFileLoader.loadPresetFromFile(files[0]);
    if (result.success) {
      loadPresets();
    } else {
      alert(`导入失败: ${result.error}`);
    }
  };

  input.click();
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

onMounted(() => {
  loadPresets();
});
</script>

<template>
  <div class="preset-manager">
    <div class="preset-header">
      <div class="preset-title">
        <i class="fa-solid fa-dice-d20"></i>
        <span v-if="viewMode === 'main'">检定设置</span>
        <span v-else-if="viewMode === 'preset-list'">检定预设管理</span>
        <span v-else>{{ editingPresetId ? '编辑' : '新建' }}检定预设</span>
      </div>
      <button class="preset-close" @click="emit('close')" title="关闭">
        <i class="fa-solid fa-times"></i>
      </button>
    </div>

    <div class="preset-body">
      <template v-if="viewMode === 'main'">
        <div class="setting-section">
          <div class="setting-row" @click="viewMode = 'preset-list'">
            <div class="setting-info">
              <span class="setting-label"><i class="fa-solid fa-sliders"></i> 检定预设</span>
              <span class="setting-desc">管理检定规则预设</span>
            </div>
            <button class="setting-action-btn">
              <i class="fa-solid fa-cog"></i> 管理
            </button>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label"><i class="fa-solid fa-eye-slash"></i> 隐藏输入栏检定结果</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="hideDiceResultFromUser" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label"><i class="fa-solid fa-comment-slash"></i> 隐藏聊天记录检定结果</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="hideDiceResultInChat" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-hint">
          <i class="fa-solid fa-info-circle"></i>
          点击「检定预设」管理自定义检定规则，支持导入/导出、拖拽排序
        </div>
      </template>

      <template v-else-if="viewMode === 'preset-list'">
        <div class="preset-toolbar">
          <input v-model="searchQuery" type="text" class="search-input" placeholder="搜索预设..." />
          <div class="toolbar-actions">
            <button class="toolbar-btn" title="新建预设" @click="openPresetEditor(null)">
              <i class="fa-solid fa-plus"></i>
            </button>
            <button class="toolbar-btn" title="导入文件" @click="importFromFile">
              <i class="fa-solid fa-file-import"></i>
            </button>
            <button class="toolbar-btn" title="导出全部" @click="exportAllPresets">
              <i class="fa-solid fa-file-export"></i>
            </button>
          </div>
        </div>

        <div class="preset-list-hint">
          <i class="fa-solid fa-info-circle"></i> 点击眼睛图标切换显示，拖拽条目排序
        </div>

        <div class="preset-list">
          <div
            v-for="preset in sortedPresets"
            :key="preset.id"
            class="preset-item"
            :class="{ hidden: preset.visible === false }"
            :draggable="true"
            @dragstart="startDrag(preset.id)"
            @dragover="onDragOver"
            @drop="onDrop(preset.id)"
          >
            <div
              class="preset-visibility"
              :title="preset.visible !== false ? '点击隐藏' : '点击显示'"
              @click="togglePresetVisibility(preset)"
            >
              <i :class="preset.visible !== false ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"></i>
            </div>

            <div class="preset-info">
              <div class="preset-name">
                {{ preset.name }}
                <span v-if="preset.builtin" class="builtin-badge">(内置)</span>
              </div>
              <div v-if="preset.description" class="preset-desc">{{ preset.description }}</div>
              <div class="preset-stats">
                骰子: {{ preset.diceExpression }} | 判定分支: {{ preset.outcomes?.length || 0 }}个
              </div>
            </div>

            <div class="preset-actions">
              <button
                v-if="preset.builtin"
                class="action-btn"
                title="复制为自定义预设"
                @click="duplicatePreset(preset)"
              >
                <i class="fa-solid fa-copy"></i>
              </button>
              <button
                v-else
                class="action-btn"
                title="编辑"
                @click="openPresetEditor(preset.id)"
              >
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="action-btn" title="导出" @click="exportPreset(preset)">
                <i class="fa-solid fa-download"></i>
              </button>
              <button
                v-if="!preset.builtin"
                class="action-btn danger"
                title="删除"
                @click="deletePreset(preset)"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>

            <div class="preset-handle" title="拖拽排序">
              <i class="fa-solid fa-grip-vertical"></i>
            </div>
          </div>

          <div v-if="sortedPresets.length === 0" class="empty-state">
            <i class="fa-solid fa-inbox"></i>
            <span>暂无预设</span>
          </div>
        </div>

        <div class="preset-footer">
          <button class="footer-btn primary" @click="openPresetEditor(null)">
            <i class="fa-solid fa-plus"></i> 新建预设
          </button>
          <button class="footer-btn" @click="viewMode = 'main'">
            <i class="fa-solid fa-arrow-left"></i> 返回
          </button>
        </div>
      </template>

      <template v-else>
        <div class="editor-form">
          <div class="form-row">
            <label>预设名称</label>
            <input v-model="editingPresetName" type="text" class="form-input" placeholder="输入预设名称" />
          </div>

          <div class="form-row">
            <label>描述</label>
            <input v-model="editingPresetDesc" type="text" class="form-input" placeholder="可选描述" />
          </div>

          <div class="form-row">
            <label>JSON配置 <span class="hint">(支持直接编辑)</span></label>
            <textarea
              v-model="editingPresetJson"
              class="form-textarea"
              placeholder="预设JSON配置..."
              rows="12"
            ></textarea>
          </div>

          <div v-if="jsonError" class="error-message">{{ jsonError }}</div>

          <div class="config-hint">
            <strong>配置格式说明：</strong><br />
            <strong>骰子表达式 (diceExpression)</strong><br />
            • 基础: "1d20", "3d6", "4dF" (Fate骰)<br />
            • 保留/舍弃: "4d6kh3" (保留最高3个), "2d20kl1" (保留最低1个)<br />
            • CoC奖惩骰: "1d100b1" (奖励骰), "1d100p2" (惩罚骰)<br />
            <br />
            <strong>判定结果 (outcomes)</strong><br />
            • 数组，每项: { id, name, condition, priority, rank?, contestRank? }<br />
            • condition: 表达式如 "$roll.total >= $dc"<br />
            • priority: 数字越小越优先匹配<br />
            <br />
            <strong>高级功能</strong><br />
            • customFields: 自定义字段 [{ id, type, label, defaultValue, options? }]<br />
            • derivedVars: 派生变量 [{ id, expr }]<br />
            • dicePatches: 条件骰子 [{ when?, op, template }]
          </div>
        </div>

        <div class="preset-footer">
          <button class="footer-btn primary" @click="savePreset">
            <i class="fa-solid fa-check"></i> 保存
          </button>
          <button class="footer-btn" @click="viewMode = 'preset-list'">
            <i class="fa-solid fa-times"></i> 取消
          </button>
        </div>
      </template>
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

.preset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--acu-bg-header, #252525);
  border-bottom: 1px solid var(--acu-border, rgba(255,255,255,0.08));
}

.preset-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--acu-accent, #e87e22);

  i { font-size: 16px; }
}

.preset-close {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 80, 80, 0.15);
    color: #ff6b6b;
    border-color: rgba(255, 80, 80, 0.3);
  }
}

.preset-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: var(--acu-bg-header, #252525);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--acu-accent, #e87e22);
  }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main, #ddd);

  i { margin-right: 6px; color: var(--acu-accent, #e87e22); }
}

.setting-desc {
  font-size: 11px;
  color: var(--acu-text-sub, #888);
}

.setting-action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--acu-accent, #e87e22);
    color: var(--acu-accent, #e87e22);
  }
}

.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;

  input { opacity: 0; width: 0; height: 0; }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: var(--acu-border, rgba(255,255,255,0.15));
    transition: 0.2s;
    border-radius: 22px;

    &:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }
  }

  input:checked + .toggle-slider {
    background-color: var(--acu-accent, #e87e22);

    &:before {
      transform: translateX(18px);
    }
  }
}

.setting-hint {
  font-size: 11px;
  color: var(--acu-text-sub, #888);
  padding: 10px 12px;
  background: rgba(230, 126, 34, 0.08);
  border-radius: 6px;
  margin-top: 12px;
  line-height: 1.5;

  i { margin-right: 4px; }
}

.preset-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(0, 0, 0, 0.2);
  color: var(--acu-text-main, #ccc);
  font-size: 12px;

  &::placeholder { color: var(--acu-text-sub, #666); }
}

.toolbar-actions {
  display: flex;
  gap: 4px;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--acu-accent, #e87e22);
    color: var(--acu-accent, #e87e22);
  }
}

.preset-list-hint {
  font-size: 10px;
  color: var(--acu-text-sub, #888);
  margin-bottom: 8px;

  i { margin-right: 4px; }
}

.preset-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.preset-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: var(--acu-bg-header, #252525);
  transition: all 0.15s;

  &:hover { border-color: var(--acu-accent, #e87e22); }

  &.hidden { opacity: 0.5; }
}

.preset-visibility {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--acu-text-sub, #888);
  cursor: pointer;
  border-radius: 4px;
  margin-right: 8px;

  &:hover {
    background: rgba(255,255,255,0.05);
    color: var(--acu-accent, #e87e22);
  }
}

.preset-info {
  flex: 1;
  min-width: 0;
}

.preset-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main, #ddd);
}

.builtin-badge {
  font-size: 10px;
  color: var(--acu-text-sub, #888);
  margin-left: 6px;
}

.preset-desc {
  font-size: 11px;
  color: var(--acu-text-sub, #888);
  margin-top: 2px;
}

.preset-stats {
  font-size: 10px;
  color: var(--acu-text-sub, #666);
  margin-top: 2px;
}

.preset-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;

  &:hover {
    border-color: var(--acu-accent, #e87e22);
    color: var(--acu-accent, #e87e22);
  }

  &.danger:hover {
    border-color: #e74c3c;
    color: #e74c3c;
    background: rgba(231, 76, 60, 0.1);
  }
}

.preset-handle {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--acu-text-sub, #666);
  cursor: grab;
  margin-left: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--acu-text-sub, #666);
  gap: 8px;

  i { font-size: 32px; opacity: 0.4; }
  span { font-size: 12px; }
}

.preset-footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--acu-border, rgba(255,255,255,0.08));
}

.footer-btn {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-main, #ccc);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;

  &:hover {
    border-color: var(--acu-accent, #e87e22);
    color: var(--acu-accent, #e87e22);
  }

  &.primary {
    background: linear-gradient(135deg, rgba(230, 126, 34, 0.25), rgba(230, 126, 34, 0.1));
    border-color: rgba(230, 126, 34, 0.3);
    color: var(--acu-accent, #e87e22);

    &:hover {
      background: linear-gradient(135deg, rgba(230, 126, 34, 0.35), rgba(230, 126, 34, 0.15));
    }
  }
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 11px;
    color: var(--acu-text-sub, #888);
    font-weight: 600;

    .hint { font-weight: 400; opacity: 0.7; }
  }
}

.form-input {
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(0, 0, 0, 0.2);
  color: var(--acu-text-main, #ccc);
  font-size: 12px;

  &::placeholder { color: var(--acu-text-sub, #666); }
}

.form-textarea {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(0, 0, 0, 0.25);
  color: var(--acu-text-main, #ccc);
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
  resize: vertical;
  line-height: 1.5;
}

.error-message {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
  font-size: 11px;
}

.config-hint {
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  font-size: 10px;
  color: var(--acu-text-sub, #888);
  line-height: 1.6;

  strong { color: var(--acu-text-main, #bbb); }
}
</style>
