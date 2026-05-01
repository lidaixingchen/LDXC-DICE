<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { BlacklistEntry } from '@data/blacklist-manager';
import { blacklistManager } from '@data/blacklist-manager';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const entries = ref<BlacklistEntry[]>([]);
const showEditor = ref(false);
const editingEntry = ref<BlacklistEntry | null>(null);
const isNewEntry = ref(false);
const showImportModal = ref(false);
const importJson = ref('');
const importError = ref('');
const showTestPanel = ref(false);
const testInput = ref('');
const testOutput = ref<{ matches: string[]; nonMatches: string[] } | null>(null);

const stats = computed(() => blacklistManager.getStatistics());

const typeOptions = [
  { value: 'exact', label: '精确匹配' },
  { value: 'wildcard', label: '通配符' },
  { value: 'regex', label: '正则表达式' },
];

const scopeOptions = [
  { value: 'global', label: '全局' },
  { value: 'preset', label: '预设' },
  { value: 'table', label: '表格' },
];

function loadEntries() {
  entries.value = blacklistManager.getAllEntries();
}

function createEntry() {
  isNewEntry.value = true;
  editingEntry.value = {
    id: '',
    name: '新黑名单项',
    pattern: '',
    type: 'wildcard',
    scope: 'global',
    enabled: true,
    description: '',
    createdAt: 0,
    updatedAt: 0,
    hitCount: 0,
  };
  showEditor.value = true;
}

function editEntry(entry: BlacklistEntry) {
  isNewEntry.value = false;
  editingEntry.value = { ...entry };
  showEditor.value = true;
}

function saveEntry() {
  if (!editingEntry.value) return;

  if (!editingEntry.value.pattern) {
    alert('请输入匹配模式');
    return;
  }

  if (isNewEntry.value) {
    blacklistManager.addEntry({
      name: editingEntry.value.name,
      pattern: editingEntry.value.pattern,
      type: editingEntry.value.type,
      scope: editingEntry.value.scope,
      scopeTarget: editingEntry.value.scopeTarget,
      enabled: editingEntry.value.enabled,
      description: editingEntry.value.description,
    });
  } else {
    blacklistManager.updateEntry(editingEntry.value.id, editingEntry.value);
  }

  showEditor.value = false;
  editingEntry.value = null;
  loadEntries();
}

function deleteEntry(entry: BlacklistEntry) {
  if (confirm(`确定要删除黑名单项 "${entry.name}" 吗？`)) {
    blacklistManager.removeEntry(entry.id);
    loadEntries();
  }
}

function toggleEntry(entry: BlacklistEntry) {
  blacklistManager.toggleEntry(entry.id);
  loadEntries();
}

function testPattern() {
  if (!editingEntry.value?.pattern || !testInput.value) return;

  const values = testInput.value.split('\n').filter(v => v.trim());
  testOutput.value = blacklistManager.testPattern(editingEntry.value.pattern, editingEntry.value.type, values);
}

function exportData() {
  const json = blacklistManager.exportData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `blacklist_${Date.now()}.json`;
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

  const result = blacklistManager.importData(importJson.value);
  if (result.success) {
    showImportModal.value = false;
    loadEntries();
    alert(`成功导入 ${result.imported} 条黑名单项`);
  } else {
    importError.value = result.errors.join('\n');
  }
}

function clearAll() {
  if (confirm('确定要清空所有黑名单项吗？此操作不可恢复！')) {
    blacklistManager.clearAll();
    loadEntries();
  }
}

function getTypeLabel(type: BlacklistEntry['type']): string {
  return typeOptions.find(o => o.value === type)?.label || type;
}

function getScopeLabel(scope: BlacklistEntry['scope']): string {
  return scopeOptions.find(o => o.value === scope)?.label || scope;
}

onMounted(() => {
  loadEntries();
});
</script>

<template>
  <div class="acu-blacklist-manager">
    <div class="acu-panel-header">
      <div class="acu-panel-title"><i class="fa-solid fa-ban"></i> 变量黑名单管理器</div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-stats-bar">
      <div class="acu-stat-item">
        <span class="acu-stat-value">{{ stats.totalEntries }}</span>
        <span class="acu-stat-label">总条目</span>
      </div>
      <div class="acu-stat-item">
        <span class="acu-stat-value">{{ stats.enabledEntries }}</span>
        <span class="acu-stat-label">已启用</span>
      </div>
      <div class="acu-stat-item">
        <span class="acu-stat-value">{{ stats.totalHits }}</span>
        <span class="acu-stat-label">总命中</span>
      </div>
    </div>

    <div class="acu-toolbar">
      <button class="acu-toolbar-btn primary" @click="createEntry">
        <i class="fa-solid fa-plus"></i> 添加
      </button>
      <button class="acu-toolbar-btn" @click="showImportDialog">
        <i class="fa-solid fa-file-import"></i> 导入
      </button>
      <button class="acu-toolbar-btn" @click="exportData">
        <i class="fa-solid fa-file-export"></i> 导出
      </button>
      <button class="acu-toolbar-btn danger" @click="clearAll">
        <i class="fa-solid fa-trash"></i> 清空
      </button>
    </div>

    <div class="acu-entry-list">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="acu-entry-item"
        :class="{ disabled: !entry.enabled }"
      >
        <div class="acu-entry-info">
          <div class="acu-entry-header">
            <span class="acu-entry-name">{{ entry.name }}</span>
            <span class="acu-entry-type">{{ getTypeLabel(entry.type) }}</span>
            <span class="acu-entry-scope">{{ getScopeLabel(entry.scope) }}</span>
          </div>
          <div class="acu-entry-pattern">
            <code>{{ entry.pattern }}</code>
          </div>
          <div v-if="entry.description" class="acu-entry-desc">{{ entry.description }}</div>
          <div class="acu-entry-meta">
            <span>命中: {{ entry.hitCount }} 次</span>
          </div>
        </div>
        <div class="acu-entry-actions">
          <button
            :class="{ active: entry.enabled }"
            title="启用/禁用"
            @click="toggleEntry(entry)"
          >
            <i class="fa-solid" :class="entry.enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
          </button>
          <button title="编辑" @click="editEntry(entry)">
            <i class="fa-solid fa-edit"></i>
          </button>
          <button class="danger" title="删除" @click="deleteEntry(entry)">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <div v-if="entries.length === 0" class="acu-empty-state">
        <i class="fa-solid fa-shield-alt"></i>
        <p>暂无黑名单项</p>
      </div>
    </div>

    <div v-if="showEditor && editingEntry" class="acu-modal-overlay" @click.self="showEditor = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>{{ isNewEntry ? '添加黑名单项' : '编辑黑名单项' }}</span>
          <button @click="showEditor = false"><i class="fa-solid fa-times"></i></button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-row">
            <label>名称</label>
            <input v-model="editingEntry.name" type="text" />
          </div>
          <div class="acu-form-row">
            <label>匹配模式</label>
            <textarea v-model="editingEntry.pattern" rows="2" placeholder="输入匹配模式..."></textarea>
          </div>
          <div class="acu-form-row cols-2">
            <div>
              <label>类型</label>
              <select v-model="editingEntry.type">
                <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div>
              <label>作用域</label>
              <select v-model="editingEntry.scope">
                <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
          <div v-if="editingEntry.scope !== 'global'" class="acu-form-row">
            <label>目标ID（可选）</label>
            <input v-model="editingEntry.scopeTarget" type="text" placeholder="留空则应用于所有" />
          </div>
          <div class="acu-form-row">
            <label>描述</label>
            <textarea v-model="editingEntry.description" rows="2"></textarea>
          </div>
          <div class="acu-form-row checkbox">
            <label>启用</label>
            <input v-model="editingEntry.enabled" type="checkbox" />
          </div>

          <div class="acu-test-section">
            <div class="acu-test-header" @click="showTestPanel = !showTestPanel">
              <span>测试模式</span>
              <i class="fa-solid" :class="showTestPanel ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </div>
            <div v-if="showTestPanel" class="acu-test-body">
              <textarea v-model="testInput" placeholder="输入测试变量（每行一个）..." rows="4"></textarea>
              <button class="acu-test-btn" @click="testPattern">测试</button>
              <div v-if="testOutput" class="acu-test-result">
                <div class="acu-test-matches">
                  <strong>匹配 ({{ testOutput.matches.length }}):</strong>
                  <ul>
                    <li v-for="m in testOutput.matches" :key="m">{{ m }}</li>
                  </ul>
                </div>
                <div class="acu-test-non-matches">
                  <strong>不匹配 ({{ testOutput.nonMatches.length }}):</strong>
                  <ul>
                    <li v-for="m in testOutput.nonMatches" :key="m">{{ m }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-half-btn" @click="showEditor = false">取消</button>
          <button class="acu-half-btn primary" @click="saveEntry">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="acu-modal-overlay" @click.self="showImportModal = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>导入黑名单</span>
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
.acu-blacklist-manager {
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

.acu-stats-bar {
  display: flex;
  gap: 16px;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
}

.acu-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.acu-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--acu-accent);
}

.acu-stat-label {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border);
}

.acu-toolbar-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--acu-border);
  background: var(--acu-bg-header);
  color: var(--acu-text-main);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: var(--acu-accent-light);
    border-color: var(--acu-accent);
  }

  &.primary {
    background: var(--acu-accent);
    color: white;
    border-color: var(--acu-accent);
  }

  &.danger {
    color: var(--acu-error-text, #e74c3c);
    &:hover {
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
      border-color: var(--acu-error-text, #e74c3c);
    }
  }
}

.acu-entry-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.acu-entry-item {
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

.acu-entry-info {
  flex: 1;
  min-width: 0;
}

.acu-entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.acu-entry-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-entry-type,
.acu-entry-scope {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--acu-accent-light);
  color: var(--acu-accent);
}

.acu-entry-pattern {
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

.acu-entry-desc {
  font-size: 11px;
  color: var(--acu-text-sub);
  margin-bottom: 4px;
}

.acu-entry-meta {
  font-size: 10px;
  color: var(--acu-text-sub);
}

.acu-entry-actions {
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
      background: var(--acu-error-bg, rgba(231, 76, 60, 0.15));
      color: var(--acu-error-text, #e74c3c);
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

.acu-test-section {
  border: 1px solid var(--acu-border);
  border-radius: 4px;
  margin-top: 12px;
}

.acu-test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--acu-bg-header);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--acu-text-main);
}

.acu-test-body {
  padding: 12px;

  textarea {
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

.acu-test-result {
  margin-top: 12px;
  font-size: 11px;

  ul {
    margin: 4px 0;
    padding-left: 20px;
  }

  li {
    margin: 2px 0;
  }
}

.acu-test-matches {
  color: var(--acu-error-text, #e74c3c);
}

.acu-test-non-matches {
  color: var(--acu-success-text, #27ae60);
  margin-top: 8px;
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
</style>
