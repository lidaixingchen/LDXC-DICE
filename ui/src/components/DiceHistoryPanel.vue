<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDiceHistory } from '../composables';
import type { HistoryEntry, CheckHistoryEntry, ContestHistoryEntry } from '../types';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { checkHistory, contestHistory, clearHistory, getAllHistory } = useDiceHistory();

const filterStatus = ref<string>('all');
const keyword = ref('');
const expandedIds = ref<Set<string>>(new Set());

const statusTextMap: Record<string, string> = {
  planned: '待执行',
  confirmed: '已确认',
  committed: '已提交',
  failed: '失败',
  cancelled: '已取消',
};

const filteredHistory = computed(() => {
  const all = getAllHistory();
  return all.filter(item => {
    if (filterStatus.value !== 'all') {
      const status = (item as unknown as Record<string, unknown>).effectStatus;
      if (!status || status !== filterStatus.value) return false;
    }
    const kw = keyword.value.trim().toLowerCase();
    if (!kw) return true;
    const raw = item as unknown as Record<string, unknown>;
    const left = (raw.left || {}) as Record<string, unknown>;
    const right = (raw.right || {}) as Record<string, unknown>;
    const haystack = [
      raw.attrName,
      raw.message,
      raw.outcomeText || raw.outcome,
      raw.initiatorName,
      left.name,
      right.name,
      raw.effectStatus,
    ]
      .map(text => String(text || '').toLowerCase())
      .join(' ');
    return haystack.includes(kw);
  }).slice(0, 80);
});

function isCheck(entry: HistoryEntry): entry is CheckHistoryEntry {
  return entry.historyType === 'check';
}

function isContest(entry: HistoryEntry): entry is ContestHistoryEntry {
  return entry.historyType === 'contest';
}

function toggleExpand(detailId: string | undefined) {
  if (!detailId) return;
  if (expandedIds.value.has(detailId)) {
    expandedIds.value.delete(detailId);
  } else {
    expandedIds.value.add(detailId);
  }
}

function isExpanded(detailId: string | undefined): boolean {
  return detailId ? expandedIds.value.has(detailId) : false;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function copyDetail(entry: HistoryEntry) {
  const lines: string[] = [];
  if (isCheck(entry)) {
    lines.push(`[普通] ${entry.initiatorName || '检定'} · ${entry.attributeName || '属性'}`);
    lines.push(`时间: ${formatTime(entry.timestamp)}`);
    lines.push(`结果: ${entry.outcome}`);
    lines.push(`数值: ${entry.total}/${entry.target}`);
    if (entry.detailLines?.length) {
      lines.push('--- 检定详情 ---');
      lines.push(...entry.detailLines);
    }
  } else {
    lines.push(`[对抗] ${entry.playerName || '发起方'} vs ${entry.opponentName || '对抗方'}`);
    lines.push(`时间: ${formatTime(entry.timestamp)}`);
    lines.push(`结果: ${entry.outcome || (entry.success ? '胜利' : '失败')}`);
    lines.push(`数值: ${entry.playerRoll}:${entry.opponentRoll}`);
    if (entry.detailLines?.length) {
      lines.push('--- 检定详情 ---');
      lines.push(...entry.detailLines);
    }
  }
  navigator.clipboard?.writeText(lines.join('\n'));
}

function handleClear() {
  if (confirm('确定清理所有检定历史？')) {
    clearHistory();
  }
}
</script>

<template>
  <div class="history-panel">
    <div class="history-header">
      <div class="history-title">
        <i class="fa-solid fa-history"></i>
        <span>检定历史</span>
      </div>
      <button class="history-close" @click="emit('close')" title="关闭">
        <i class="fa-solid fa-times"></i>
      </button>
    </div>

    <div class="history-toolbar">
      <select v-model="filterStatus" class="history-filter">
        <option value="all">全部状态</option>
        <option value="confirmed">已确认</option>
        <option value="committed">已提交</option>
        <option value="planned">待执行</option>
        <option value="failed">失败</option>
      </select>
      <input
        v-model="keyword"
        type="text"
        class="history-search"
        placeholder="搜索关键词..."
      />
      <button class="history-clear-btn" @click="handleClear" title="清理历史">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>

    <div class="history-body">
      <div v-if="filteredHistory.length === 0" class="history-empty">
        <i class="fa-solid fa-dice-d20"></i>
        <span>暂无检定历史</span>
      </div>

      <div v-else class="history-list">
        <div
          v-for="item in filteredHistory"
          :key="item.detailId || item.timestamp"
          class="history-item"
        >
          <div class="history-item-header">
            <span class="history-type-tag" :class="item.historyType">
              {{ item.historyType === 'check' ? '普通' : '对抗' }}
            </span>
            <span class="history-title-text">
              <template v-if="isCheck(item)">
                {{ item.initiatorName || '检定' }} · {{ item.attributeName || '属性' }}
              </template>
              <template v-else-if="isContest(item)">
                {{ item.playerName || '发起方' }} vs {{ item.opponentName || '对抗方' }}
              </template>
            </span>
            <span
              class="history-status"
              v-if="item.effectStatus"
              :style="{ color: item.effectStatus === 'confirmed' ? 'var(--acu-accent)' : 'var(--acu-text-sub)' }"
            >
              {{ statusTextMap[item.effectStatus] || item.effectStatus }}
            </span>
          </div>

          <div class="history-item-body">
            <div class="history-result" :class="{ success: item.success, fail: !item.success }">
              <template v-if="isCheck(item)">
                <span class="result-text">{{ item.outcome }}</span>
                <span class="result-value">{{ item.total }}/{{ item.target }}</span>
              </template>
              <template v-else-if="isContest(item)">
                <span class="result-text">{{ item.outcome || (item.success ? '胜利' : '失败') }}</span>
                <span class="result-value">{{ item.playerRoll }} : {{ item.opponentRoll }}</span>
              </template>
            </div>
            <div class="history-time">{{ formatTime(item.timestamp) }}</div>
          </div>

          <div v-if="item.detailLines?.length || item.effectTrace?.length" class="history-detail-section">
            <button
              class="history-expand-btn"
              @click="toggleExpand(item.detailId)"
            >
              <i :class="isExpanded(item.detailId) ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
              {{ isExpanded(item.detailId) ? '收起详情' : '展开详情' }}
            </button>
            <button class="history-copy-btn" @click="copyDetail(item)" title="复制详情">
              <i class="fa-solid fa-copy"></i>
            </button>
          </div>

          <div
            v-if="isExpanded(item.detailId) && (item.detailLines?.length || item.effectTrace?.length)"
            class="history-detail-content"
          >
            <div v-if="item.detailLines?.length" class="detail-block">
              <div class="detail-label">检定详情</div>
              <div v-for="(line, idx) in item.detailLines" :key="idx" class="detail-line">{{ line }}</div>
            </div>
            <div v-if="item.effectTrace?.length" class="detail-block">
              <div class="detail-label">效果链路</div>
              <div v-for="(line, idx) in item.effectTrace" :key="idx" class="detail-line">{{ line }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.history-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--acu-bg-panel, #1a1a1e);
  border-radius: 12px;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--acu-bg-header, #252525);
  border-bottom: 1px solid var(--acu-border, rgba(255,255,255,0.08));
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--acu-accent, #e87e22);

  i { font-size: 16px; }
}

.history-close {
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

.history-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--acu-border, rgba(255,255,255,0.08));
}

.history-filter {
  padding: 5px 8px;
  border-radius: 5px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: var(--acu-bg-header, #252525);
  color: var(--acu-text-main, #ccc);
  font-size: 11px;
  cursor: pointer;
}

.history-search {
  flex: 1;
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(0, 0, 0, 0.2);
  color: var(--acu-text-main, #ccc);
  font-size: 11px;

  &::placeholder { color: var(--acu-text-sub, #666); }
}

.history-clear-btn {
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  cursor: pointer;
  font-size: 12px;

  &:hover {
    color: #e74c3c;
    border-color: rgba(231, 76, 60, 0.3);
  }
}

.history-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--acu-text-sub, #666);
  gap: 8px;

  i { font-size: 24px; opacity: 0.35; }
  span { font-size: 12px; }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 10px 12px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  border-radius: 10px;
  background: var(--acu-bg-panel, #1e1e22);
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.history-type-tag {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.15));
  color: var(--acu-text-sub, #888);

  &.check { border-color: rgba(52, 152, 219, 0.4); color: #5dade2; }
  &.contest { border-color: rgba(155, 89, 182, 0.4); color: #bb8fce; }
}

.history-title-text {
  font-weight: 700;
  color: var(--acu-text-main, #ddd);
  font-size: 12px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-status {
  font-size: 9px;
}

.history-item-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-result {
  display: flex;
  align-items: center;
  gap: 8px;

  .result-text {
    font-weight: 600;
    font-size: 12px;
  }

  .result-value {
    font-size: 11px;
    color: var(--acu-text-sub, #888);
    font-family: monospace;
  }

  &.success .result-text { color: var(--acu-success-text, #27ae60); }
  &.fail .result-text { color: var(--acu-error-text, #e74c3c); }
}

.history-time {
  font-size: 10px;
  color: var(--acu-text-sub, #666);
}

.history-detail-section {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--acu-border, rgba(255,255,255,0.08));
}

.history-expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  font-size: 10px;
  cursor: pointer;

  &:hover { color: var(--acu-accent, #e87e22); border-color: var(--acu-accent, #e87e22); }
}

.history-copy-btn {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: transparent;
  color: var(--acu-text-sub, #888);
  font-size: 10px;
  cursor: pointer;

  &:hover { color: #5dade2; border-color: rgba(52, 152, 219, 0.4); }
}

.history-detail-content {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  background: rgba(0, 0, 0, 0.2);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  line-height: 1.5;
  color: var(--acu-text-sub, #999);
}

.detail-block {
  &:not(:last-child) {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--acu-border, rgba(255,255,255,0.08));
  }
}

.detail-label {
  font-weight: 700;
  color: var(--acu-text-main, #ccc);
  margin-bottom: 4px;
}

.detail-line {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
