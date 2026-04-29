<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDashboard } from '../composables/useDashboard';
import { settingsManager } from '@data/settings-manager';
import { isRowHighlighted, isCellHighlighted } from '@data/snapshot-manager';

const props = defineProps<{
  initialTable: string;
  showTableList?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { getTableData } = useDashboard();
const currentTableKey = ref(props.initialTable);
const searchTerm = ref('');
const currentPage = ref(1);

// 行内编辑状态
const editingCell = ref<{ rowIdx: number; colIdx: number } | null>(null);
const editingValue = ref('');

// 新行添加
const showAddRow = ref(false);
const newRowData = ref<string[]>([]);

const legacySettings = computed(() => settingsManager.getLegacySettings());
const itemsPerPage = computed(() => legacySettings.value.itemsPerPage || 50);
const highlightNew = computed(() => legacySettings.value.highlightNew);

watch(
  () => props.initialTable,
  newVal => {
    currentTableKey.value = newVal;
    editingCell.value = null;
    showAddRow.value = false;
  },
);

const allTables = computed(() => {
  const data = getTableData();
  if (!data) return [];

  return Object.entries(data)
    .filter(([key, table]: [string, any]) => key.startsWith('sheet_') && table?.name)
    .map(([key, table]: [string, any]) => ({
      key,
      name: table.name,
      rowCount: table.content?.length - 1 || 0,
    }));
});

const tableData = computed(() => {
  const data = getTableData();
  return data ? data[currentTableKey.value] : null;
});

const headers = computed(() => {
  if (!tableData.value?.content?.length) return [];
  return tableData.value.content[0] as string[];
});

function isSpecialTable(tableName: string): boolean {
  const name = tableName.toLowerCase();
  return name.includes('纪要') || name.includes('选项') || name.includes('summary') || name.includes('option');
}

const isVerticalLayout = computed(() => {
  if (!tableData.value?.name) return false;
  return isSpecialTable(tableData.value.name);
});

const processedRows = computed(() => {
  if (!tableData.value?.content) return [];
  const rows = tableData.value.content.slice(1);

  let result = rows.map((r: any, idx: number) => ({ data: r, originalIndex: idx }));

  if (searchTerm.value.trim()) {
    const s = searchTerm.value.toLowerCase();
    result = result.filter((r: any) => r.data.some((cell: any) => String(cell).toLowerCase().includes(s)));
  }

  return result;
});

const paginatedRows = computed(() => {
  const perPage = itemsPerPage.value;
  const start = (currentPage.value - 1) * perPage;
  return processedRows.value.slice(start, start + perPage);
});

const totalPages = computed(() => Math.ceil(processedRows.value.length / itemsPerPage.value));

function isInvalidValue(val: any): boolean {
  const s = String(val || '')
    .trim()
    .toLowerCase();
  return ['-', '--', '—', 'null', 'none', '无', '空', 'n/a', 'undefined', '/', 'nil'].includes(s);
}

function parseAttr(val: string) {
  const match = String(val).match(/^([^:：]+)[:：]\s*(\d+)$/);
  return match ? { name: match[1], value: match[2] } : null;
}

function handleDiceClick(name: string, val: string) {
  (window as any).AcuDice?.check({ attribute: name, attributeValue: Number(val) });
}

function getRowHighlightClass(rowIndex: number): string {
  if (!highlightNew.value) return '';
  const tableName = tableData.value?.name || '';
  if (isRowHighlighted(tableName, rowIndex)) return 'acu-highlight-row';
  return '';
}

function isEditing(rowIdx: number, colIdx: number): boolean {
  return editingCell.value?.rowIdx === rowIdx && editingCell.value?.colIdx === colIdx;
}

function getCellClass(rowIdx: number, colIdx: number): string {
  const highlight = getCellHighlightClass(rowIdx, colIdx);
  const edit = isEditing(rowIdx, colIdx) ? 'acu-cell-editing' : '';
  return [highlight, edit].filter(Boolean).join(' ');
}

function getCellHighlightClass(rowIndex: number, colIndex: number): string {
  if (!highlightNew.value) return '';
  const tableName = tableData.value?.name || '';
  if (isCellHighlighted(tableName, rowIndex, colIndex)) return 'acu-highlight-cell';
  return '';
}

// ========== 行内编辑 ==========

function startEdit(rowIdx: number, colIdx: number): void {
  editingCell.value = { rowIdx, colIdx };
  editingValue.value = String(tableData.value?.content?.[rowIdx + 1]?.[colIdx] ?? '');
}

function confirmEdit(): void {
  if (!editingCell.value || !tableData.value?.content) return;
  const { rowIdx, colIdx } = editingCell.value;
  const contentRow = rowIdx + 1;
  if (contentRow < tableData.value.content.length) {
    tableData.value.content[contentRow][colIdx] = editingValue.value;
    // 触发响应式更新
    tableData.value.content = [...tableData.value.content];
  }
  editingCell.value = null;
}

function cancelEdit(): void {
  editingCell.value = null;
}

function onEditKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    confirmEdit();
  } else if (e.key === 'Escape') {
    cancelEdit();
  }
}

// ========== 增删行 ==========

function addRow(): void {
  showAddRow.value = true;
  newRowData.value = headers.value.map(() => '');
}

function confirmAddRow(): void {
  if (!tableData.value?.content) return;
  tableData.value.content.push([...newRowData.value]);
  tableData.value.content = [...tableData.value.content];
  showAddRow.value = false;
  newRowData.value = [];
  // 跳转到最后一页
  currentPage.value = totalPages.value;
}

function cancelAddRow(): void {
  showAddRow.value = false;
  newRowData.value = [];
}

function deleteRow(rowIdx: number): void {
  const tableName = tableData.value?.name || '';
  const rowLabel = tableData.value?.content?.[rowIdx + 1]?.[1] || tableData.value?.content?.[rowIdx + 1]?.[0] || `行 ${rowIdx + 1}`;
  if (!confirm(`确定删除「${tableName}」中的「${rowLabel}」？\n此操作将立即保存到数据库。`)) return;
  if (!tableData.value?.content) return;

  tableData.value.content.splice(rowIdx + 1, 1);
  tableData.value.content = [...tableData.value.content];

  // 如果删除后当前页为空，回到上一页
  const total = Math.ceil((tableData.value.content.length - 1) / itemsPerPage.value);
  if (currentPage.value > total && total > 0) {
    currentPage.value = total;
  }
  editingCell.value = null;
}

// ========== 导出 ==========

function exportTableJson(): void {
  if (!tableData.value) return;
  const blob = new Blob([JSON.stringify(tableData.value.content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableData.value.name || currentTableKey.value}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="acu-table-browser">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <div class="acu-title-main">
          <i class="fa-solid fa-table"></i>
          <span class="acu-title-text">{{ showTableList ? '全部表格' : tableData?.name || '未知表格' }}</span>
        </div>
        <div class="acu-title-sub">
          (共 {{ showTableList ? allTables.length : processedRows.length }} {{ showTableList ? '张表' : '项' }})
        </div>
      </div>
      <div class="acu-header-actions">
        <div class="acu-search-wrapper">
          <i class="fa-solid fa-search acu-search-icon"></i>
          <input v-model="searchTerm" type="text" class="acu-search-input" placeholder="搜索..." />
        </div>
        <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
      </div>
    </div>

    <div class="acu-panel-content acu-scroll-y">
      <!-- 表格列表模式 -->
      <div v-if="showTableList" class="acu-table-list">
        <div v-for="table in allTables" :key="table.key" class="acu-table-item" @click="currentTableKey = table.key">
          <i class="fa-solid fa-table"></i>
          <div class="table-info">
            <div class="table-name">{{ table.name }}</div>
            <div class="table-meta">{{ table.rowCount }} 行数据</div>
          </div>
          <i class="fa-solid fa-chevron-right"></i>
        </div>
      </div>

      <!-- 单个表格内容 -->
      <template v-else>
        <!-- 工具栏 -->
        <div class="acu-table-toolbar">
          <button class="acu-toolbar-btn" title="添加行" @click="addRow">
            <i class="fa-solid fa-plus"></i> 添加行
          </button>
          <button class="acu-toolbar-btn" title="导出JSON" @click="exportTableJson">
            <i class="fa-solid fa-file-export"></i> 导出
          </button>
        </div>

        <!-- 新行编辑 -->
        <div v-if="showAddRow" class="acu-add-row-panel">
          <div class="acu-add-row-title"><i class="fa-solid fa-plus-circle"></i> 新行</div>
          <div class="acu-add-row-fields">
            <div v-for="(h, hIdx) in headers" :key="hIdx" class="acu-add-field">
              <label class="acu-add-label">{{ h }}</label>
              <input
                v-model="newRowData[hIdx]"
                type="text"
                class="acu-add-input"
                :placeholder="h"
                @keydown.enter="confirmAddRow"
                @keydown.escape="cancelAddRow"
              />
            </div>
          </div>
          <div class="acu-add-row-actions">
            <button class="acu-btn-primary" @click="confirmAddRow">
              <i class="fa-solid fa-check"></i> 确认
            </button>
            <button class="acu-btn-cancel" @click="cancelAddRow">
              <i class="fa-solid fa-times"></i> 取消
            </button>
          </div>
        </div>

        <div v-if="isVerticalLayout" class="acu-vertical-list">
          <div v-for="rowItem in paginatedRows" :key="rowItem.originalIndex" class="acu-vertical-card" :class="getRowHighlightClass(rowItem.originalIndex)">
            <div class="acu-card-header">
              <span class="acu-card-index">#{{ rowItem.originalIndex + 1 }}</span>
              <span class="acu-card-title">{{ rowItem.data[1] || rowItem.data[0] || '未命名' }}</span>
              <button class="acu-card-delete-btn" title="删除行" @click.stop="deleteRow(rowItem.originalIndex)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="acu-card-body">
              <template v-for="(cell, cIdx) in rowItem.data" :key="cIdx">
                <div v-if="Number(cIdx) > 0 && !isInvalidValue(cell)" class="acu-field-row">
                  <span class="acu-field-label">
                    {{ headers[cIdx]?.replace(/[\(（\[【][^)）\]】]*[\)）\]】]/g, '').trim() || '字段' }}
                  </span>
                  <span class="acu-field-value" :class="getCellClass(rowItem.originalIndex, cIdx)">
                    <template v-if="isEditing(rowItem.originalIndex, cIdx)">
                      <input
                        v-model="editingValue"
                        type="text"
                        class="acu-inline-edit"
                        @blur="confirmEdit"
                        @keydown="onEditKeydown"
                        autofocus
                      />
                    </template>
                    <template v-else-if="parseAttr(String(cell))">
                      <span class="acu-attr-val" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                        {{ parseAttr(String(cell))?.value }}
                      </span>
                      <i
                        class="fa-solid fa-dice-d20 acu-dice-icon"
                        @click="handleDiceClick(parseAttr(String(cell))!.name, parseAttr(String(cell))!.value)"
                      ></i>
                    </template>
                    <template v-else>
                      <span class="acu-cell-display" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                        {{ cell }}
                      </span>
                    </template>
                    <span v-if="!isEditing(rowItem.originalIndex, cIdx)" class="acu-edit-hint" @click="startEdit(rowItem.originalIndex, cIdx)">
                      <i class="fa-solid fa-pencil"></i>
                    </span>
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="acu-horizontal-grid">
          <div v-for="rowItem in paginatedRows" :key="rowItem.originalIndex" class="acu-horizontal-card" :class="getRowHighlightClass(rowItem.originalIndex)">
            <div class="acu-card-header">
              <span class="acu-card-index">#{{ rowItem.originalIndex + 1 }}</span>
              <span class="acu-card-title">{{ rowItem.data[1] || rowItem.data[0] || '未命名' }}</span>
              <button class="acu-card-delete-btn" title="删除行" @click.stop="deleteRow(rowItem.originalIndex)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="acu-card-body">
              <template v-for="(cell, cIdx) in rowItem.data" :key="cIdx">
                <div v-if="Number(cIdx) > 0 && !isInvalidValue(cell)" class="acu-field-row">
                  <span class="acu-field-label">
                    {{ headers[cIdx]?.replace(/[\(（\[【][^)）\]】]*[\)）\]】]/g, '').trim() || '字段' }}
                  </span>
                  <span class="acu-field-value" :class="getCellClass(rowItem.originalIndex, cIdx)">
                    <template v-if="isEditing(rowItem.originalIndex, cIdx)">
                      <input
                        v-model="editingValue"
                        type="text"
                        class="acu-inline-edit"
                        @blur="confirmEdit"
                        @keydown="onEditKeydown"
                        autofocus
                      />
                    </template>
                    <template v-else-if="parseAttr(String(cell))">
                      <span class="acu-attr-val" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                        {{ parseAttr(String(cell))?.value }}
                      </span>
                      <i
                        class="fa-solid fa-dice-d20 acu-dice-icon"
                        @click="handleDiceClick(parseAttr(String(cell))!.name, parseAttr(String(cell))!.value)"
                      ></i>
                    </template>
                    <template v-else>
                      <span class="acu-cell-display" @dblclick="startEdit(rowItem.originalIndex, cIdx)">
                        {{ cell }}
                      </span>
                    </template>
                    <span v-if="!isEditing(rowItem.originalIndex, cIdx)" class="acu-edit-hint" @click="startEdit(rowItem.originalIndex, cIdx)">
                      <i class="fa-solid fa-pencil"></i>
                    </span>
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <div v-if="totalPages > 1 && !showTableList" class="acu-panel-footer">
        <button class="acu-page-btn" :disabled="currentPage === 1" @click="currentPage--">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <span class="acu-page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="acu-page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-table-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.acu-vertical-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  max-height: 100%;
}

.acu-vertical-card {
  background: var(--acu-bg-card);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
  max-height: 200px;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  width: fit-content;
  max-width: 100%;

  &:hover {
    border-color: var(--acu-accent);
  }

  .acu-card-body {
    overflow-y: auto;
    flex: 1;
  }

  .acu-field-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .acu-field-label {
    font-size: 10px;
  }

  .acu-field-value {
    font-size: 11px;
    text-align: right;
  }
}

.acu-horizontal-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 15px;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: flex-start;
  height: 100%;
}

.acu-horizontal-card {
  flex: 0 0 auto;
  min-width: 120px;
  max-width: 280px;
  background: var(--acu-bg-card);
  border: 1px solid var(--acu-border);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  max-height: 300px;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--acu-accent);
    box-shadow: 0 4px 12px var(--acu-shadow);
  }
}

/* 工具栏 */
.acu-table-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border, #313244);
}

.acu-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--acu-border, #45475a);
  border-radius: 6px;
  background: var(--acu-bg-card, #313244);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--acu-accent-light, #45475a);
    border-color: var(--acu-accent, #89b4fa);
  }
}

/* 新行编辑面板 */
.acu-add-row-panel {
  margin: 8px 12px;
  padding: 12px;
  background: var(--acu-bg-card, #313244);
  border: 1px solid var(--acu-accent, #89b4fa);
  border-radius: 8px;
}

.acu-add-row-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--acu-accent, #89b4fa);
  margin-bottom: 8px;
}

.acu-add-row-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.acu-add-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 0 120px;
}

.acu-add-label {
  font-size: 9px;
  color: var(--acu-text-sub, #6c7086);
}

.acu-add-input {
  padding: 4px 6px;
  border: 1px solid var(--acu-border, #45475a);
  border-radius: 4px;
  background: var(--acu-bg-main, #1e1e2e);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 11px;
  outline: none;

  &:focus {
    border-color: var(--acu-accent, #89b4fa);
  }
}

.acu-add-row-actions {
  display: flex;
  gap: 6px;
}

.acu-btn-primary {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background: var(--acu-accent, #89b4fa);
  color: #1e1e2e;
  font-size: 11px;
  cursor: pointer;
}

.acu-btn-cancel {
  padding: 4px 10px;
  border: 1px solid var(--acu-border, #45475a);
  border-radius: 4px;
  background: transparent;
  color: var(--acu-text-main, #cdd6f4);
  font-size: 11px;
  cursor: pointer;
}

/* 行内编辑 */
.acu-inline-edit {
  width: 100%;
  padding: 2px 4px;
  border: 1px solid var(--acu-accent, #89b4fa);
  border-radius: 3px;
  background: var(--acu-bg-main, #1e1e2e);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 10px;
  outline: none;
}

.acu-cell-display {
  cursor: pointer;
}

.acu-edit-hint {
  opacity: 0;
  cursor: pointer;
  padding: 0 2px;
  font-size: 8px;
  color: var(--acu-text-sub, #6c7086);
  transition: opacity 0.15s;
}

.acu-field-value:hover .acu-edit-hint {
  opacity: 1;
}

.acu-cell-editing {
  border-radius: 3px;
  outline: 1px solid var(--acu-accent, #89b4fa);
}

.acu-card-delete-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--acu-text-sub, #6c7086);
  cursor: pointer;
  padding: 2px 4px;
  font-size: 9px;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.15s;

  &:hover {
    background: var(--acu-danger, #f38ba8);
    color: white;
  }
}

.acu-card-header:hover .acu-card-delete-btn {
  opacity: 1;
}

.acu-highlight-row {
  animation: acu-highlight-pulse 2s ease-in-out;
  border-color: rgba(34, 197, 94, 0.5) !important;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
}

.acu-highlight-cell {
  background: rgba(34, 197, 94, 0.15);
  border-radius: 2px;
}

@keyframes acu-highlight-pulse {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
  }
  50% {
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.5);
  }
}

.acu-card-header {
  padding: 4px 6px;
  background: var(--acu-bg-header);
  border-bottom: 1px solid var(--acu-border);
  display: flex;
  align-items: center;
  gap: 4px;

  .acu-card-index {
    font-size: 8px;
    opacity: 0.5;
    font-family: monospace;
  }

  .acu-card-title {
    font-weight: 700;
    font-size: 11px;
    color: var(--acu-accent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.acu-card-body {
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  flex: 1;
}

.acu-field-row {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 2px 0;
  border-bottom: 1px dashed rgba(128, 128, 128, 0.08);

  &:last-child {
    border-bottom: none;
  }
}

.acu-field-label {
  font-size: 8px;
  color: var(--acu-text-sub);
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.7;
}

.acu-field-value {
  font-size: 10px;
  font-weight: 600;
  text-align: left;
  color: var(--acu-text-main);
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 3px;
}

.acu-attr-val {
  font-weight: 800;
  color: var(--acu-accent);
}

.acu-dice-icon {
  cursor: pointer;
  color: var(--acu-accent);
  opacity: 0.6;
  font-size: 10px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.acu-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 8px;

  .acu-search-icon {
    position: absolute;
    left: 8px;
    font-size: 10px;
    opacity: 0.5;
  }

  .acu-search-input {
    height: 26px;
    width: 120px;
    padding: 0 8px 0 24px;
    border-radius: 100px;
    border: 1px solid var(--acu-border);
    background: var(--acu-bg-header);
    font-size: 11px;
    outline: none;
    transition: width 0.3s;

    &:focus {
      width: 180px;
      border-color: var(--acu-accent);
    }
  }
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
  border-radius: 6px;

  &:hover {
    background: var(--acu-accent-light);
    color: var(--acu-accent);
  }
}

.acu-panel-footer {
  padding: 8px;
  border-top: 1px solid var(--acu-border);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;

  .acu-page-btn {
    background: var(--acu-bg-header);
    border: 1px solid var(--acu-border);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    color: var(--acu-text-main);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .acu-page-info {
    font-size: 11px;
    font-weight: bold;
    opacity: 0.7;
  }
}

.acu-table-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.acu-table-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--acu-bg-card);
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--acu-accent);
    background: var(--acu-table-hover);
    transform: translateX(4px);
  }

  i:first-child {
    font-size: 20px;
    color: var(--acu-accent);
    opacity: 0.7;
  }

  .table-info {
    flex: 1;

    .table-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--acu-text-main);
      margin-bottom: 2px;
    }

    .table-meta {
      font-size: 11px;
      color: var(--acu-text-sub);
    }
  }

  i:last-child {
    font-size: 12px;
    color: var(--acu-text-sub);
    opacity: 0.5;
  }
}
</style>
