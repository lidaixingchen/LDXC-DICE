<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { RegexRuleCategory } from '@core/validation/regex-engine';
import { regexRuleManager } from '@data/regex-rule-manager';
import type { RegexPreset, RegexRuleConfig } from '@data/regex-rule-manager';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const presets = ref<RegexPreset[]>([]);
const currentPreset = ref<RegexPreset | null>(null);
const showRuleEditor = ref(false);
const editingRule = ref<RegexRuleConfig | null>(null);
const isNewRule = ref(false);
const showImportModal = ref(false);
const importJson = ref('');
const importError = ref('');
const showTestPanel = ref(false);
const testInput = ref('');
const testOutput = ref('');

const categories: { value: RegexRuleCategory; label: string }[] = [
  { value: 'dice', label: '骰子' },
  { value: 'variable', label: '变量' },
  { value: 'condition', label: '条件' },
  { value: 'template', label: '模板' },
  { value: 'output', label: '输出' },
  { value: 'custom', label: '自定义' },
];

const rules = computed(() => currentPreset.value?.rules || []);

function loadPresets() {
  presets.value = regexRuleManager.getAllPresets();
  currentPreset.value = regexRuleManager.getCurrentPreset();
}

function selectPreset(preset: RegexPreset) {
  regexRuleManager.setCurrentPreset(preset.id);
  currentPreset.value = preset;
  regexRuleManager.applyCurrentPreset();
}

function createPreset() {
  const name = prompt('请输入预设名称：');
  if (!name) return;

  const preset = regexRuleManager.createPreset(name);
  presets.value = regexRuleManager.getAllPresets();
  selectPreset(preset);
}

function deletePreset(preset: RegexPreset) {
  if (confirm(`确定要删除预设 "${preset.name}" 吗？`)) {
    regexRuleManager.deletePreset(preset.id);
    loadPresets();
  }
}

function duplicatePreset(preset: RegexPreset) {
  const newName = prompt('请输入新预设名称：', `${preset.name} (副本)`);
  if (!newName) return;

  const duplicated = regexRuleManager.duplicatePreset(preset.id, newName);
  if (duplicated) {
    presets.value = regexRuleManager.getAllPresets();
  }
}

function exportPreset(preset: RegexPreset) {
  const json = regexRuleManager.exportPreset(preset.id);
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `regex_${preset.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToSillyTavern(preset: RegexPreset) {
  const json = regexRuleManager.exportToSillyTavern(preset.id);
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sillytavern_regex_${preset.id}.json`;
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

  const result = regexRuleManager.importPreset(importJson.value);
  if (result.success && result.preset) {
    showImportModal.value = false;
    loadPresets();
  } else {
    importError.value = result.error || '导入失败';
  }
}

function importFromSillyTavern() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async e => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = ev.target?.result as string;
        const result = regexRuleManager.importFromSillyTavern(json);

        if (result.imported > 0) {
          if (!currentPreset.value) {
            const preset = regexRuleManager.createPreset('酒馆导入');
            currentPreset.value = preset;
          }

          for (const rule of result.rules) {
            regexRuleManager.addRuleToPreset(currentPreset.value.id, rule);
          }

          loadPresets();
          alert(`成功导入 ${result.imported} 条酒馆正则规则`);
        }

        if (result.errors.length > 0) {
          console.warn('导入警告:', result.errors);
        }
      } catch (err) {
        alert('导入失败：' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  input.click();
}

function createRule() {
  if (!currentPreset.value) {
    alert('请先选择或创建预设');
    return;
  }

  isNewRule.value = true;
  editingRule.value = {
    id: '',
    name: '新规则',
    description: '',
    pattern: '',
    replacement: '',
    flags: 'g',
    enabled: true,
    priority: 50,
    category: 'custom',
  };
  showRuleEditor.value = true;
}

function editRule(rule: RegexRuleConfig) {
  isNewRule.value = false;
  editingRule.value = { ...rule };
  showRuleEditor.value = true;
}

function saveRule() {
  if (!editingRule.value || !currentPreset.value) return;

  if (!editingRule.value.pattern) {
    alert('请输入正则表达式');
    return;
  }

  try {
    new RegExp(editingRule.value.pattern, editingRule.value.flags || '');
  } catch (e) {
    alert('无效的正则表达式：' + (e as Error).message);
    return;
  }

  if (isNewRule.value) {
    regexRuleManager.addRuleToPreset(currentPreset.value.id, editingRule.value);
  } else {
    regexRuleManager.updateRuleInPreset(currentPreset.value.id, editingRule.value.id, editingRule.value);
  }

  showRuleEditor.value = false;
  editingRule.value = null;
  loadPresets();
}

function deleteRule(rule: RegexRuleConfig) {
  if (!currentPreset.value) return;

  if (confirm(`确定要删除规则 "${rule.name}" 吗？`)) {
    regexRuleManager.removeRuleFromPreset(currentPreset.value.id, rule.id);
    loadPresets();
  }
}

function toggleRule(rule: RegexRuleConfig) {
  if (!currentPreset.value) return;
  regexRuleManager.toggleRule(currentPreset.value.id, rule.id);
  loadPresets();
}

function testRules() {
  if (!testInput.value) return;

  const result = regexRuleManager.transform(testInput.value);
  testOutput.value = result.transformed;
}

function getCategoryLabel(category: RegexRuleCategory): string {
  return categories.find(c => c.value === category)?.label || category;
}

onMounted(() => {
  loadPresets();
});
</script>

<template>
  <div class="acu-regex-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title"><i class="fa-solid fa-code"></i> 正则规则管理器</div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-regex-layout">
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
          <button class="special" @click="importFromSillyTavern">
            <i class="fa-solid fa-magic"></i> 酒馆导入
          </button>
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
              <button @click="createRule"><i class="fa-solid fa-plus"></i></button>
              <button @click="duplicatePreset(currentPreset)"><i class="fa-solid fa-copy"></i></button>
              <button @click="exportPreset(currentPreset)"><i class="fa-solid fa-download"></i></button>
              <button class="special" @click="exportToSillyTavern(currentPreset)">
                <i class="fa-solid fa-file-export"></i>
              </button>
              <button class="danger" @click="deletePreset(currentPreset)"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>

          <div class="acu-test-section">
            <div class="acu-test-header">
              <span>测试面板</span>
              <button @click="showTestPanel = !showTestPanel">
                <i class="fa-solid" :class="showTestPanel ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
              </button>
            </div>
            <div v-if="showTestPanel" class="acu-test-body">
              <div class="acu-test-row">
                <textarea v-model="testInput" placeholder="输入测试文本..."></textarea>
              </div>
              <button class="acu-test-btn" @click="testRules">测试转换</button>
              <div v-if="testOutput" class="acu-test-output">
                <label>输出结果：</label>
                <pre>{{ testOutput }}</pre>
              </div>
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
                <div class="acu-rule-header-row">
                  <span class="acu-rule-name">{{ rule.name }}</span>
                  <span class="acu-rule-category">{{ getCategoryLabel(rule.category) }}</span>
                </div>
                <div class="acu-rule-pattern">
                  <code>{{ rule.pattern }}</code>
                </div>
                <div v-if="rule.description" class="acu-rule-desc">{{ rule.description }}</div>
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
              点击 + 创建新规则
            </div>
          </div>
        </template>
        <div v-else class="acu-empty-state">
          <i class="fa-solid fa-code"></i>
          <p>选择或创建一个预设</p>
        </div>
      </main>
    </div>

    <div v-if="showRuleEditor && editingRule" class="acu-modal-overlay" @click.self="showRuleEditor = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>{{ isNewRule ? '创建规则' : '编辑规则' }}</span>
          <button @click="showRuleEditor = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row">
            <label>规则名称</label>
            <input v-model="editingRule.name" type="text" />
          </div>
          <div class="acu-form-row">
            <label>描述</label>
            <textarea v-model="editingRule.description" rows="2"></textarea>
          </div>
          <div class="acu-form-row">
            <label>正则表达式</label>
            <textarea v-model="editingRule.pattern" rows="3" placeholder="输入正则表达式..."></textarea>
          </div>
          <div class="acu-form-row cols-2">
            <div>
              <label>标志</label>
              <input v-model="editingRule.flags" type="text" placeholder="g, i, m..." />
            </div>
            <div>
              <label>分类</label>
              <select v-model="editingRule.category">
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>
          </div>
          <div class="acu-form-row">
            <label>替换内容</label>
            <textarea v-model="editingRule.replacement" rows="2" placeholder="替换文本或 $1, $2..."></textarea>
          </div>
          <div class="acu-form-row cols-2">
            <div>
              <label>优先级</label>
              <input v-model.number="editingRule.priority" type="number" min="0" max="1000" />
            </div>
            <div class="checkbox">
              <label>启用</label>
              <input v-model="editingRule.enabled" type="checkbox" />
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
.acu-regex-manager {
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

.acu-regex-layout {
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
  display: flex;
  flex-direction: column;
  gap: 4px;

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

    &.special {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
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

    &.special {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    &.danger:hover {
      background: #ffebee;
      color: #e74c3c;
    }
  }
}

.acu-test-section {
  border-bottom: 1px solid var(--acu-border);
}

.acu-test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--acu-text-sub);
  cursor: pointer;

  button {
    background: transparent;
    border: none;
    color: var(--acu-text-sub);
    cursor: pointer;
    padding: 4px;
  }
}

.acu-test-body {
  padding: 12px;
  background: var(--acu-bg-header);
}

.acu-test-row textarea {
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-panel);
  color: var(--acu-text-main);
  font-size: 12px;
  font-family: 'Courier New', monospace;
  resize: vertical;
}

.acu-test-btn {
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  border-radius: 4px;
  border: none;
  background: var(--acu-accent);
  color: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.acu-test-output {
  margin-top: 12px;

  label {
    display: block;
    font-size: 11px;
    color: var(--acu-text-sub);
    margin-bottom: 4px;
  }

  pre {
    background: var(--acu-bg-panel);
    padding: 8px;
    border-radius: 4px;
    border: 1px solid var(--acu-border);
    font-size: 12px;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
  }
}

.acu-rule-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.acu-section-title {
  font-size: 10px;
  font-weight: 900;
  color: var(--acu-accent);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.acu-rule-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
  flex: 1;
  min-width: 0;
}

.acu-rule-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.acu-rule-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-rule-category {
  font-size: 10px;
  color: var(--acu-accent);
  background: var(--acu-accent-light);
  padding: 2px 6px;
  border-radius: 3px;
}

.acu-rule-pattern {
  margin-bottom: 4px;

  code {
    font-size: 11px;
    font-family: 'Courier New', monospace;
    background: var(--acu-bg-panel);
    padding: 2px 6px;
    border-radius: 3px;
    display: block;
    word-break: break-all;
  }
}

.acu-rule-desc {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-rule-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;

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

    &.active {
      color: var(--acu-accent);
    }

    &.danger:hover {
      background: #ffebee;
      color: #e74c3c;
    }
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

  &.cols-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
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
