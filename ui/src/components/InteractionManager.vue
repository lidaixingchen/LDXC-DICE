<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { MapInteraction, MapInteractionAction, MapInteractionTrigger } from '@map/types';
import { interactionRuleManager, INTERACTION_TEMPLATES } from '@data/interaction-rule-manager';
import type { InteractionPreset } from '@data/interaction-rule-manager';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const presets = ref<InteractionPreset[]>([]);
const currentPreset = ref<InteractionPreset | null>(null);
const selectedRuleId = ref<string>('');
const showRuleEditor = ref(false);
const editingRule = ref<MapInteraction | null>(null);

const gridCol = computed({
  get: () => ((editingRule.value?.trigger.data as any)?.gridCell?.col) ?? 0,
  set: (val: number) => {
    if (!editingRule.value) return;
    const data = editingRule.value.trigger.data as any;
    if (!data) editingRule.value.trigger.data = {} as any;
    const d = (editingRule.value.trigger.data as any);
    if (!d.gridCell) d.gridCell = {} as any;
    d.gridCell.col = val;
  }
});

const gridRow = computed({
  get: () => ((editingRule.value?.trigger.data as any)?.gridCell?.row) ?? 0,
  set: (val: number) => {
    if (!editingRule.value) return;
    const data = editingRule.value.trigger.data as any;
    if (!data) editingRule.value.trigger.data = {} as any;
    const d = (editingRule.value.trigger.data as any);
    if (!d.gridCell) d.gridCell = {} as any;
    d.gridCell.row = val;
  }
});

const showImportModal = ref(false);
const importJson = ref('');
const importError = ref('');

const rules = computed(() => currentPreset.value?.rules || []);

function loadPresets() {
  presets.value = interactionRuleManager.getAllPresets();
  currentPreset.value = interactionRuleManager.getCurrentPreset();
}

function selectPreset(preset: InteractionPreset) {
  interactionRuleManager.setCurrentPreset(preset.id);
  currentPreset.value = preset;
}

function createPreset() {
  const name = prompt('请输入预设名称：');
  if (!name) return;

  const preset = interactionRuleManager.createPreset(name);
  presets.value = interactionRuleManager.getAllPresets();
  selectPreset(preset);
}

function deletePreset(preset: InteractionPreset) {
  if (confirm(`确定要删除预设 "${preset.name}" 吗？`)) {
    interactionRuleManager.deletePreset(preset.id);
    loadPresets();
  }
}

function duplicatePreset(preset: InteractionPreset) {
  const newName = prompt('请输入新预设名称：', `${preset.name} (副本)`);
  if (!newName) return;

  const duplicated = interactionRuleManager.duplicatePreset(preset.id, newName);
  if (duplicated) {
    presets.value = interactionRuleManager.getAllPresets();
  }
}

function exportPreset(preset: InteractionPreset) {
  const json = interactionRuleManager.exportPreset(preset.id);
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interaction_${preset.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function showImportDialog() {
  importJson.value = '';
  importError.value = '';
  showImportModal.value = true;
}

function importFromJson() {
  if (!importJson.value.trim()) {
    importError.value = '请输入JSON内容';
    return;
  }

  const result = interactionRuleManager.importPreset(importJson.value);
  if (result.success && result.preset) {
    showImportModal.value = false;
    loadPresets();
  } else {
    importError.value = result.error || '导入失败';
  }
}

function createRuleFromTemplate(templateId: string) {
  if (!currentPreset.value) return;

  const rule = interactionRuleManager.createRuleFromTemplate(templateId);
  if (!rule) return;

  const newRule = interactionRuleManager.addRuleToPreset(currentPreset.value.id, rule);
  if (newRule) {
    loadPresets();
    editRule(newRule);
  }
}

function editRule(rule: MapInteraction) {
  editingRule.value = JSON.parse(JSON.stringify(rule));
  showRuleEditor.value = true;
}

function saveRule() {
  if (!editingRule.value || !currentPreset.value) return;

  interactionRuleManager.updateRuleInPreset(
    currentPreset.value.id,
    editingRule.value.id,
    editingRule.value
  );
  showRuleEditor.value = false;
  editingRule.value = null;
  loadPresets();
}

function deleteRule(rule: MapInteraction) {
  if (!currentPreset.value) return;

  if (confirm(`确定要删除规则吗？`)) {
    interactionRuleManager.removeRuleFromPreset(currentPreset.value.id, rule.id);
    loadPresets();
  }
}

function toggleRule(rule: MapInteraction) {
  if (!currentPreset.value) return;

  interactionRuleManager.updateRuleInPreset(currentPreset.value.id, rule.id, {
    enabled: !rule.enabled,
  });
  loadPresets();
}

function getTriggerDescription(trigger: MapInteractionTrigger): string {
  switch (trigger.type) {
    case 'token':
      return `令牌: ${trigger.tokenId || '任意'}`;
    case 'region':
      return `区域: ${trigger.regionId || '任意'}`;
    case 'grid':
      return `格子: ${trigger.data?.gridCell ? `(${(trigger.data.gridCell as { col: number; row: number }).col}, ${(trigger.data.gridCell as { col: number; row: number }).row})` : '任意'}`;
    case 'custom':
      return `自定义条件`;
    default:
      return '未知';
  }
}

function getActionDescription(actions: MapInteractionAction[]): string {
  if (!actions.length) return '无动作';
  const action = actions[0];
  switch (action.type) {
    case 'dice_roll':
      return `掷骰: ${action.data?.presetId || '默认'}`;
    case 'message':
      return `消息: ${String(action.data?.text || '').slice(0, 20)}...`;
    case 'effect':
      return `效果: ${action.data?.effectType || '未知'}`;
    case 'move_token':
      return `移动令牌`;
    case 'change_layer':
      return `更改图层`;
    case 'custom':
      return `自定义: ${action.data?.handler || '未知'}`;
    default:
      return '未知动作';
  }
}

function addAction() {
  if (!editingRule.value) return;
  const newAction: MapInteractionAction = {
    type: 'dice_roll',
    data: {} as Record<string, unknown>,
  };
  editingRule.value = { ...editingRule.value, actions: [...editingRule.value.actions, newAction] };
}

function removeAction(index: number) {
  if (!editingRule.value) return;
  const actions = [...editingRule.value.actions];
  actions.splice(index, 1);
  editingRule.value = { ...editingRule.value, actions };
}

function updateActionField(index: number, field: string, value: unknown) {
  if (!editingRule.value) return;
  const actions = editingRule.value.actions.map((a, i) => {
    if (i !== index) return a;
    return { ...a, data: { ...(a.data || {}), [field]: value } };
  });
  editingRule.value = { ...editingRule.value, actions };
}

function updateActionType(index: number, newType: string) {
  if (!editingRule.value) return;
  const actions = editingRule.value.actions.map((a, i) => {
    if (i !== index) return a;
    return { ...a, type: newType as MapInteractionAction['type'], data: {} as Record<string, unknown> };
  });
  editingRule.value = { ...editingRule.value, actions };
}

onMounted(() => {
  loadPresets();
});
</script>

<template>
  <div class="acu-interaction-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title"><i class="fa-solid fa-exchange-alt"></i> 交互规则管理器</div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-interaction-layout">
      <aside class="acu-preset-sidebar">
        <div class="acu-sidebar-header">
          <span>预设列表</span>
          <button @click="createPreset"><i class="fa-solid fa-plus"></i></button>
        </div>
        <div class="acu-preset-list">
          <div
            v-for="preset in presets"
            :key="preset.id"
            class="acu-preset-item"
            :class="{ active: currentPreset?.id === preset.id }"
            @click="selectPreset(preset)"
          >
            <div class="acu-preset-name">{{ preset.name }}</div>
            <div class="acu-preset-meta">{{ preset.rules.length }} 条规则</div>
          </div>
          <div v-if="presets.length === 0" class="acu-empty-hint">
            点击 + 创建新预设
          </div>
        </div>
        <div class="acu-sidebar-actions">
          <button @click="showImportDialog"><i class="fa-solid fa-file-import"></i> 导入</button>
        </div>
      </aside>

      <main class="acu-rule-main">
        <template v-if="currentPreset">
          <div class="acu-rule-header">
            <div class="acu-rule-title">
              <h3>{{ currentPreset.name }}</h3>
              <span class="acu-rule-count">{{ rules.length }} 条规则</span>
            </div>
            <div class="acu-rule-actions">
              <button @click="duplicatePreset(currentPreset)"><i class="fa-solid fa-copy"></i></button>
              <button @click="exportPreset(currentPreset)"><i class="fa-solid fa-download"></i></button>
              <button class="danger" @click="deletePreset(currentPreset)"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>

          <div class="acu-template-section">
            <div class="acu-section-title">从模板创建</div>
            <div class="acu-template-grid">
              <button
                v-for="template in INTERACTION_TEMPLATES"
                :key="template.id"
                class="acu-template-btn"
                @click="createRuleFromTemplate(template.id)"
              >
                <i class="fa-solid fa-magic"></i>
                <span>{{ template.name }}</span>
              </button>
            </div>
          </div>

          <div class="acu-rule-list">
            <div class="acu-section-title">规则列表</div>
            <div
              v-for="rule in rules"
              :key="rule.id"
              class="acu-rule-item"
              :class="{ disabled: !rule.enabled }"
            >
              <div class="acu-rule-info">
                <div class="acu-rule-trigger">
                  <i class="fa-solid fa-bolt"></i>
                  {{ getTriggerDescription(rule.trigger) }}
                </div>
                <div class="acu-rule-action">
                  <i class="fa-solid fa-arrow-right"></i>
                  {{ getActionDescription(rule.actions) }}
                </div>
              </div>
              <div class="acu-rule-actions">
                <button
                  :class="{ active: rule.enabled }"
                  title="启用/禁用"
                  @click="toggleRule(rule)"
                >
                  <i class="fa-solid" :class="rule.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
                </button>
                <button title="编辑" @click="editRule(rule)">
                  <i class="fa-solid fa-edit"></i>
                </button>
                <button class="danger" title="删除" @click="deleteRule(rule)">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
            <div v-if="rules.length === 0" class="acu-empty-hint">
              从模板创建或导入规则
            </div>
          </div>
        </template>
        <div v-else class="acu-empty-state">
          <i class="fa-solid fa-mouse-pointer"></i>
          <p>选择或创建一个预设</p>
        </div>
      </main>
    </div>

    <div v-if="showRuleEditor && editingRule" class="acu-modal-overlay" @click.self="showRuleEditor = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>编辑规则</span>
          <button @click="showRuleEditor = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row">
            <label>规则名称</label>
            <input v-model="editingRule.name" type="text" placeholder="给规则起个名字..." />
          </div>
          <div class="acu-form-row">
            <label>触发类型</label>
            <select v-model="editingRule.trigger.type">
              <option value="token">令牌</option>
              <option value="region">区域</option>
              <option value="grid">格子</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <template v-if="editingRule.trigger.type === 'token'">
            <div class="acu-form-row">
              <label>令牌 ID</label>
              <input v-model="editingRule.trigger.tokenId" type="text" placeholder="留空表示任意令牌" />
            </div>
          </template>
          <template v-if="editingRule.trigger.type === 'region'">
            <div class="acu-form-row">
              <label>区域 ID</label>
              <input v-model="editingRule.trigger.regionId" type="text" placeholder="留空表示任意区域" />
            </div>
          </template>
          <template v-if="editingRule.trigger.type === 'grid'">
            <div class="acu-form-row">
              <label>格子位置 (col, row)</label>
              <div class="acu-inline-fields">
                <input v-model.number="gridCol" type="number" placeholder="列" min="0" />
                <input v-model.number="gridRow" type="number" placeholder="行" min="0" />
              </div>
            </div>
          </template>
          <div class="acu-form-row">
            <label>优先级</label>
            <input v-model.number="editingRule.priority" type="number" min="0" max="1000" />
          </div>
          <div class="acu-form-row checkbox">
            <label>启用</label>
            <input v-model="editingRule.enabled" type="checkbox" />
          </div>

          <div class="acu-form-section">
            <div class="acu-section-header">
              <label>动作列表</label>
              <button class="acu-add-btn" @click="addAction"><i class="fa-solid fa-plus"></i> 添加动作</button>
            </div>
            <div
              v-for="(action, idx) in editingRule.actions"
              :key="idx"
              class="acu-action-card"
            >
              <div class="acu-action-header">
                <span class="acu-action-num">动作 {{ idx + 1 }}</span>
                <button class="acu-remove-btn danger" @click="removeAction(idx)">
                  <i class="fa-solid fa-times"></i>
                </button>
              </div>
              <div class="acu-form-row">
                <label>动作类型</label>
                <select
                  :value="action.type"
                  @change="updateActionType(idx, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="dice_roll">掷骰</option>
                  <option value="message">消息</option>
                  <option value="effect">效果</option>
                  <option value="move_token">移动令牌</option>
                  <option value="change_layer">更改图层</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <template v-if="action.type === 'dice_roll'">
                <div class="acu-form-row">
                  <label>预设 ID</label>
                  <input
                    :value="action.data?.presetId"
                    @input="updateActionField(idx, 'presetId', ($event.target as HTMLInputElement).value)"
                    type="text"
                    placeholder="检定预设标识"
                  />
                </div>
              </template>
              <template v-if="action.type === 'message'">
                <div class="acu-form-row">
                  <label>消息文本</label>
                  <textarea
                    :value="String(action.data?.text ?? '')"
                    @input="updateActionField(idx, 'text', ($event.target as HTMLTextAreaElement).value)"
                    placeholder="要发送的消息内容..."
                    rows="2"
                  ></textarea>
                </div>
              </template>
              <template v-if="action.type === 'effect'">
                <div class="acu-form-row">
                  <label>效果类型</label>
                  <input
                    :value="action.data?.effectType"
                    @input="updateActionField(idx, 'effectType', ($event.target as HTMLInputElement).value)"
                    type="text"
                    placeholder="如: damage, buff, status..."
                  />
                </div>
              </template>
              <template v-if="action.type === 'custom'">
                <div class="acu-form-row">
                  <label>处理函数</label>
                  <input
                    :value="action.data?.handler"
                    @input="updateActionField(idx, 'handler', ($event.target as HTMLInputElement).value)"
                    type="text"
                    placeholder="自定义处理函数名"
                  />
                </div>
              </template>
            </div>
            <div v-if="editingRule.actions.length === 0" class="acu-empty-hint">
              暂无动作，点击上方按钮添加
            </div>
          </div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-half-btn" @click="showRuleEditor = false">取消</button>
          <button class="acu-half-btn primary" @click="saveRule">保存</button>
        </div>
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
            <label>JSON内容</label>
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
.acu-interaction-manager {
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

.acu-interaction-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.acu-preset-sidebar {
  width: 200px;
  border-right: 1px solid var(--acu-border);
  display: flex;
  flex-direction: column;
}

.acu-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--acu-text-sub);
  border-bottom: 1px solid var(--acu-border);

  button {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: none;
    background: var(--acu-accent);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
  }
}

.acu-preset-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.acu-preset-item {
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 4px;

  &:hover {
    background: var(--acu-bg-header);
  }

  &.active {
    background: var(--acu-accent-light);
    border-left: 3px solid var(--acu-accent);
  }
}

.acu-preset-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-preset-meta {
  font-size: 10px;
  color: var(--acu-text-sub);
  margin-top: 2px;
}

.acu-sidebar-actions {
  padding: 8px;
  border-top: 1px solid var(--acu-border);

  button {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    color: var(--acu-text-main);
    cursor: pointer;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    &:hover {
      background: var(--acu-accent-light);
      border-color: var(--acu-accent);
    }
  }
}

.acu-rule-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.acu-rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-rule-title {
  display: flex;
  align-items: center;
  gap: 8px;

  h3 {
    font-size: 14px;
    font-weight: 700;
    color: var(--acu-text-main);
    margin: 0;
  }
}

.acu-rule-count {
  font-size: 10px;
  color: var(--acu-text-sub);
  background: var(--acu-bg-header);
  padding: 2px 6px;
  border-radius: 10px;
}

.acu-rule-actions {
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

    &:hover {
      background: var(--acu-accent-light);
      color: var(--acu-accent);
    }

    &.danger:hover {
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
      color: var(--acu-error-text, #e74c3c);
    }
  }
}

.acu-template-section {
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-section-title {
  font-size: 10px;
  font-weight: 900;
  color: var(--acu-accent);
  margin-bottom: 8px;
}

.acu-template-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.acu-template-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }
}

.acu-rule-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.acu-rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  margin-bottom: 8px;

  &.disabled {
    opacity: 0.5;
  }
}

.acu-rule-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-rule-trigger,
.acu-rule-action {
  font-size: 11px;
  color: var(--acu-text-main);
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    color: var(--acu-accent);
    font-size: 10px;
  }
}

.acu-empty-hint {
  text-align: center;
  color: var(--acu-text-sub);
  font-size: 12px;
  padding: 20px;
}

.acu-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
  z-index: var(--acu-z-modal, 31100);
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

  input,
  select,
  textarea {
    width: 100%;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    color: var(--acu-text-main);
    font-size: 12px;
  }

  textarea {
    min-height: 60px;
    resize: vertical;
    font-family: 'Courier New', monospace;
  }

  &.checkbox {
    display: flex;
    align-items: center;
    gap: 8px;

    label {
      margin: 0;
    }

    input {
      width: auto;
    }
  }
}

.acu-error-message {
  color: var(--acu-error-text, #e74c3c);
  font-size: 12px;
  padding: 8px;
  background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
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

.acu-form-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--acu-border);
}

.acu-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  label {
    font-size: 11px;
    font-weight: 700;
    color: var(--acu-text-sub);
  }
}

.acu-add-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--acu-accent);
  background: transparent;
  color: var(--acu-accent);
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: var(--acu-accent);
    color: white;
  }
}

.acu-action-card {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  margin-bottom: 8px;
}

.acu-action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.acu-action-num {
  font-size: 10px;
  font-weight: 700;
  color: var(--acu-accent);
}

.acu-remove-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--acu-text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;

  &:hover {
    background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
    color: var(--acu-error-text, #e74c3c);
  }
}

.acu-inline-fields {
  display: flex;
  gap: 8px;

  input {
    flex: 1;
  }
}
</style>
