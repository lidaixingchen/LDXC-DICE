<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import type { LogEntry, LogLevel, DebugCommand } from '@core/debug-console';
import { debugConsole } from '@core/debug-console';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const logs = ref<LogEntry[]>([]);
const commandInput = ref('');
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);
const output = ref<string[]>([]);
const filterLevel = ref<LogLevel | 'all'>('all');
const searchQuery = ref('');
const autoScroll = ref(true);
const logsContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

const isEnabled = computed(() => debugConsole.isEnabled());
const currentLogLevel = computed(() => debugConsole.getLogLevel());
const commands = computed(() => debugConsole.getCommands());

const filteredLogs = computed(() => {
  let result = logs.value;

  if (filterLevel.value !== 'all') {
    result = result.filter(log => log.level === filterLevel.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      log =>
        log.message.toLowerCase().includes(query) ||
        log.source?.toLowerCase().includes(query)
    );
  }

  return result;
});

const levelColors: Record<LogLevel, string> = {
  debug: '#9e9e9e',
  info: '#2196f3',
  warn: '#ff9800',
  error: '#f44336',
};

function loadLogs() {
  logs.value = debugConsole.getLogs(undefined, 500);
}

function scrollToBottom() {
  if (autoScroll.value && logsContainer.value) {
    nextTick(() => {
      logsContainer.value!.scrollTop = logsContainer.value!.scrollHeight;
    });
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

function formatData(data: unknown): string {
  if (data === undefined) return '';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

async function executeCommand() {
  const command = commandInput.value.trim();
  if (!command) return;

  commandHistory.value.unshift(command);
  if (commandHistory.value.length > 50) {
    commandHistory.value.pop();
  }
  historyIndex.value = -1;

  output.value.push(`> ${command}`);

  try {
    const result = await debugConsole.executeCommand(command);
    output.value.push(result);
  } catch (e) {
    output.value.push(`错误: ${e instanceof Error ? e.message : '未知错误'}`);
  }

  commandInput.value = '';
  scrollToBottom();
}

function navigateHistory(direction: 'up' | 'down') {
  if (commandHistory.value.length === 0) return;

  if (direction === 'up') {
    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++;
      commandInput.value = commandHistory.value[historyIndex.value];
    }
  } else {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      commandInput.value = commandHistory.value[historyIndex.value];
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1;
      commandInput.value = '';
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    executeCommand();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    navigateHistory('up');
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    navigateHistory('down');
  }
}

function toggleDebug() {
  debugConsole.setEnabled(!debugConsole.isEnabled());
}

function setLogLevel(level: LogLevel) {
  debugConsole.setLogLevel(level);
}

function clearLogs() {
  debugConsole.clearLogs();
  logs.value = [];
  output.value.push('日志已清除');
}

function clearOutput() {
  output.value = [];
}

function exportLogs() {
  const json = debugConsole.exportLogs();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debug_logs_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function focusInput() {
  inputRef.value?.focus();
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  loadLogs();
  focusInput();

  refreshInterval = setInterval(() => {
    loadLogs();
    if (autoScroll.value) {
      scrollToBottom();
    }
  }, 1000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>

<template>
  <div class="acu-debug-console" @click="focusInput">
    <div class="acu-panel-header">
      <div class="acu-panel-title">
        <i class="fa-solid fa-terminal"></i> Debug 控制台
        <span class="acu-status" :class="{ enabled: isEnabled }">
          {{ isEnabled ? '已启用' : '已禁用' }}
        </span>
      </div>
      <button class="acu-close-btn" @click="emit('close')"><i class="fa-solid fa-times"></i></button>
    </div>

    <div class="acu-toolbar">
      <button class="acu-toolbar-btn" :class="{ active: isEnabled }" @click="toggleDebug">
        <i class="fa-solid" :class="isEnabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
        {{ isEnabled ? '禁用' : '启用' }}
      </button>

      <select v-model="filterLevel" class="acu-filter-select">
        <option value="all">全部级别</option>
        <option value="debug">Debug</option>
        <option value="info">Info</option>
        <option value="warn">Warn</option>
        <option value="error">Error</option>
      </select>

      <select
        :value="currentLogLevel"
        class="acu-filter-select"
        @change="setLogLevel(($event.target as HTMLSelectElement).value as LogLevel)"
      >
        <option value="debug">Debug+</option>
        <option value="info">Info+</option>
        <option value="warn">Warn+</option>
        <option value="error">Error+</option>
      </select>

      <input v-model="searchQuery" type="text" class="acu-search-input" placeholder="搜索日志..." />

      <button class="acu-toolbar-btn" @click="clearLogs">
        <i class="fa-solid fa-eraser"></i>
      </button>
      <button class="acu-toolbar-btn" @click="exportLogs">
        <i class="fa-solid fa-download"></i>
      </button>
    </div>

    <div class="acu-console-layout">
      <div class="acu-logs-panel">
        <div class="acu-panel-label">日志</div>
        <div ref="logsContainer" class="acu-logs-container">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="acu-log-entry"
            :class="log.level"
          >
            <span class="acu-log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="acu-log-level" :style="{ color: levelColors[log.level] }">
              [{{ log.level.toUpperCase() }}]
            </span>
            <span v-if="log.source" class="acu-log-source">[{{ log.source }}]</span>
            <span class="acu-log-message">{{ log.message }}</span>
            <pre v-if="log.data" class="acu-log-data">{{ formatData(log.data) }}</pre>
          </div>

          <div v-if="filteredLogs.length === 0" class="acu-empty-logs">
            暂无日志
          </div>
        </div>
      </div>

      <div class="acu-output-panel">
        <div class="acu-panel-label">
          输出
          <button class="acu-clear-btn" @click="clearOutput">清除</button>
        </div>
        <div class="acu-output-container">
          <div v-for="(line, index) in output" :key="index" class="acu-output-line">
            {{ line }}
          </div>
        </div>

        <div class="acu-command-input">
          <span class="acu-prompt">&gt;</span>
          <input
            ref="inputRef"
            v-model="commandInput"
            type="text"
            placeholder="输入命令... (help 查看帮助)"
            @keydown="handleKeydown"
          />
        </div>
      </div>
    </div>

    <div class="acu-commands-panel">
      <div class="acu-panel-label">可用命令</div>
      <div class="acu-commands-list">
        <div v-for="cmd in commands" :key="cmd.name" class="acu-command-item">
          <span class="acu-command-name">{{ cmd.name }}</span>
          <span class="acu-command-desc">{{ cmd.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-debug-console {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

.acu-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #3c3c3c;
  background: #252526;
}

.acu-panel-title {
  font-weight: 700;
  color: #ffffff;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.acu-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  background: #5a5a5a;
  color: #999;

  &.enabled {
    background: #1e4620;
    color: #89d185;
  }
}

.acu-close-btn {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  &:hover {
    background: #3c3c3c;
    color: #fff;
  }
}

.acu-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #3c3c3c;
  background: #252526;
}

.acu-toolbar-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
  background: #3c3c3c;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #4a4a4a;
  }

  &.active {
    background: #1e4620;
    border-color: #89d185;
    color: #89d185;
  }
}

.acu-filter-select {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
  background: #3c3c3c;
  color: #d4d4d4;
  font-size: 12px;
  cursor: pointer;
}

.acu-search-input {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
  background: #3c3c3c;
  color: #d4d4d4;
  font-size: 12px;

  &::placeholder {
    color: #666;
  }
}

.acu-console-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.acu-logs-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #3c3c3c;
}

.acu-panel-label {
  padding: 6px 12px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.acu-clear-btn {
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 10px;
  &:hover {
    color: #d4d4d4;
  }
}

.acu-logs-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.acu-log-entry {
  padding: 4px 8px;
  border-radius: 2px;
  margin-bottom: 2px;

  &.debug {
    color: #9e9e9e;
  }

  &.info {
    color: #d4d4d4;
  }

  &.warn {
    background: #3a2a1a;
    color: #ff9800;
  }

  &.error {
    background: #3a1a1a;
    color: #f44336;
  }
}

.acu-log-time {
  color: #666;
  margin-right: 8px;
}

.acu-log-level {
  font-weight: 600;
  margin-right: 4px;
}

.acu-log-source {
  color: #569cd6;
  margin-right: 4px;
}

.acu-log-message {
  word-break: break-all;
}

.acu-log-data {
  margin: 4px 0 0 16px;
  padding: 8px;
  background: #2d2d2d;
  border-radius: 4px;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}

.acu-empty-logs {
  text-align: center;
  color: #666;
  padding: 20px;
}

.acu-output-panel {
  width: 350px;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.acu-output-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: #0d0d0d;
}

.acu-output-line {
  padding: 2px 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #d4d4d4;
}

.acu-command-input {
  display: flex;
  align-items: center;
  padding: 8px;
  background: #252526;
  border-top: 1px solid #3c3c3c;

  .acu-prompt {
    color: #89d185;
    margin-right: 8px;
    font-weight: 600;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    color: #d4d4d4;
    font-size: 12px;
    font-family: inherit;
    outline: none;

    &::placeholder {
      color: #666;
    }
  }
}

.acu-commands-panel {
  border-top: 1px solid #3c3c3c;
  background: #252526;
  max-height: 120px;
  overflow-y: auto;
}

.acu-commands-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
}

.acu-command-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #3c3c3c;
  border-radius: 4px;
  font-size: 11px;
}

.acu-command-name {
  color: #569cd6;
  font-weight: 600;
}

.acu-command-desc {
  color: #999;
}
</style>
