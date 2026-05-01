<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { mapManager, type DiceMap, type MapToken, type MapViewport, type MapTool, MAP_TOOLS } from '@map';
import { THEME_COLORS } from '../utils/theme-utils';
import { mapRenderer } from '@map/map-renderer';
import { interactionEngine, type InteractionContext, type InteractionResult } from '@map/interaction-engine';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const currentMap = ref<DiceMap | null>(null);
const viewport = ref<MapViewport>({ x: 0, y: 0, zoom: 1, rotation: 0 });
const selectedTool = ref<string>('select');
const selectedTokens = ref<string[]>([]);
const showMapList = ref(false);
const showTokenEditor = ref(false);
const editingToken = ref<MapToken | null>(null);

const maps = computed(() => mapManager.getAllMaps());
const tools = ref<MapTool[]>(MAP_TOOLS);

const isPanning = ref(false);
const isDrawing = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });
const drawStartPos = ref({ x: 0, y: 0 });

function initializeRenderer(): void {
  if (!canvasRef.value) return;

  mapRenderer.attach(canvasRef.value);
  mapRenderer.setOptions({
    showGrid: currentMap.value?.grid.enabled ?? true,
    showTokens: true,
    showShapes: true,
    showFog: currentMap.value?.fog.enabled ?? false,
    showCoordinates: currentMap.value?.settings.showCoordinates ?? true,
    showTokenNames: currentMap.value?.settings.showTokenNames ?? true,
    showTokenHealth: currentMap.value?.settings.showTokenHealth ?? true,
    selectedTokens: selectedTokens.value,
  });

  render();
}

function render(): void {
  if (!currentMap.value) return;
  mapRenderer.render(currentMap.value, viewport.value);
}

function handleResize(): void {
  mapRenderer.resize();
  render();
}

function handleMouseDown(event: MouseEvent): void {
  if (!currentMap.value || !canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const worldPos = mapRenderer.screenToWorld(screenX, screenY, viewport.value);

  lastMousePos.value = { x: event.clientX, y: event.clientY };

  switch (selectedTool.value) {
    case 'select':
      handleSelect(worldPos, event.shiftKey);
      break;
    case 'pan':
      isPanning.value = true;
      break;
    case 'token_place':
      handleTokenPlace(worldPos);
      break;
    case 'draw_rect':
    case 'draw_circle':
      isDrawing.value = true;
      drawStartPos.value = worldPos;
      break;
    case 'interact':
      handleInteract(worldPos);
      break;
  }
}

function handleMouseMove(event: MouseEvent): void {
  if (!canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  if (isPanning.value) {
    const dx = event.clientX - lastMousePos.value.x;
    const dy = event.clientY - lastMousePos.value.y;
    viewport.value.x -= dx / viewport.value.zoom;
    viewport.value.y -= dy / viewport.value.zoom;
    lastMousePos.value = { x: event.clientX, y: event.clientY };
    render();
  }

  if (isDrawing.value) {
    const worldPos = mapRenderer.screenToWorld(screenX, screenY, viewport.value);
    render();
    drawPreview(worldPos);
  }
}

function handleMouseUp(event: MouseEvent): void {
  if (isPanning.value) {
    isPanning.value = false;
  }

  if (isDrawing.value && currentMap.value) {
    const rect = canvasRef.value!.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const worldPos = mapRenderer.screenToWorld(screenX, screenY, viewport.value);

    finishDrawing(worldPos);
    isDrawing.value = false;
  }
}

function handleWheel(event: WheelEvent): void {
  event.preventDefault();

  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  viewport.value.zoom = Math.max(0.1, Math.min(5, viewport.value.zoom * zoomFactor));

  render();
}

function handleSelect(worldPos: { x: number; y: number }, addToSelection: boolean): void {
  if (!currentMap.value) return;

  const token = mapManager.getTokenAt(currentMap.value.id, worldPos);

  if (token) {
    if (addToSelection) {
      const idx = selectedTokens.value.indexOf(token.id);
      if (idx >= 0) {
        selectedTokens.value.splice(idx, 1);
      } else {
        selectedTokens.value.push(token.id);
      }
    } else {
      selectedTokens.value = [token.id];
    }
  } else {
    selectedTokens.value = [];
  }

  mapRenderer.setOptions({ selectedTokens: selectedTokens.value });
  render();
}

function handleTokenPlace(worldPos: { x: number; y: number }): void {
  if (!currentMap.value) return;

  const snappedPos = mapRenderer.snapToGrid(worldPos, currentMap.value.grid);

  const token = mapManager.addToken(currentMap.value.id, {
    name: '新令牌',
    type: 'character',
    position: snappedPos,
    size: { width: 50, height: 50 },
    rotation: 0,
    color: THEME_COLORS.accent(),
    borderColor: THEME_COLORS.bgPanel(),
    borderWidth: 2,
    opacity: 1,
    locked: false,
    hidden: false,
    layerId: 'layer_tokens',
    metadata: {},
    effects: [],
  });

  if (token) {
    selectedTokens.value = [token.id];
    mapRenderer.setOptions({ selectedTokens: selectedTokens.value });
    render();
  }
}

function handleInteract(worldPos: { x: number; y: number }): void {
  if (!currentMap.value) return;

  const token = mapManager.getTokenAt(currentMap.value.id, worldPos);

  const context: InteractionContext = {
    mapId: currentMap.value.id,
    token: token || undefined,
    position: worldPos,
    eventType: 'click',
    timestamp: Date.now(),
  };

  interactionEngine.process(context, currentMap.value).then((result: InteractionResult) => {
    if (result.handled) {
      console.log('[MapPanel] 交互处理结果:', result);
      render();
    }
  }).catch((err: unknown) => {
    console.warn('[MapPanel] 交互处理失败:', err);
  });
}

function drawPreview(endPos: { x: number; y: number }): void {
  if (!canvasRef.value || !currentMap.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.strokeStyle = THEME_COLORS.accent();
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

  const startPos = drawStartPos.value;

  switch (selectedTool.value) {
    case 'draw_rect':
      ctx.strokeRect(startPos.x, startPos.y, endPos.x - startPos.x, endPos.y - startPos.y);
      break;
    case 'draw_circle': {
      const radius = Math.sqrt((endPos.x - startPos.x) ** 2 + (endPos.y - startPos.y) ** 2);
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function finishDrawing(endPos: { x: number; y: number }): void {
  if (!currentMap.value) return;

  const startPos = drawStartPos.value;

  switch (selectedTool.value) {
    case 'draw_rect':
      mapManager.addShape(currentMap.value.id, {
        type: 'rect',
        position: { x: Math.min(startPos.x, endPos.x), y: Math.min(startPos.y, endPos.y) },
        size: { width: Math.abs(endPos.x - startPos.x), height: Math.abs(endPos.y - startPos.y) },
        color: THEME_COLORS.accent(),
        borderColor: THEME_COLORS.accent(),
        borderWidth: 2,
        opacity: 0.5,
        rotation: 0,
        layerId: 'layer_drawings',
      });
      break;

    case 'draw_circle': {
      const radius = Math.sqrt((endPos.x - startPos.x) ** 2 + (endPos.y - startPos.y) ** 2);
      mapManager.addShape(currentMap.value.id, {
        type: 'circle',
        position: { x: startPos.x - radius, y: startPos.y - radius },
        size: { width: radius * 2, height: radius * 2 },
        color: THEME_COLORS.accent(),
        borderColor: THEME_COLORS.accent(),
        borderWidth: 2,
        opacity: 0.5,
        rotation: 0,
        layerId: 'layer_drawings',
      });
      break;
    }
  }

  render();
}

function selectTool(toolId: string): void {
  selectedTool.value = toolId;
}

function createNewMap(): void {
  const map = mapManager.createMap({
    name: `新地图 ${maps.value.length + 1}`,
    size: { width: 1920, height: 1080 },
  });

  loadMap(map.id);
  showMapList.value = false;
}

function loadMap(mapId: string): void {
  mapManager.setCurrentMap(mapId);
  currentMap.value = mapManager.getCurrentMap();
  viewport.value = mapManager.getViewport();
  selectedTokens.value = [];
  showMapList.value = false;

  nextTick(() => {
    initializeRenderer();
  });
}

function deleteMap(mapId: string): void {
  if (confirm('确定要删除这个地图吗？')) {
    mapManager.deleteMap(mapId);
    if (currentMap.value?.id === mapId) {
      currentMap.value = null;
    }
  }
}

function zoomIn(): void {
  viewport.value.zoom = Math.min(5, viewport.value.zoom * 1.2);
  render();
}

function zoomOut(): void {
  viewport.value.zoom = Math.max(0.1, viewport.value.zoom * 0.8);
  render();
}

function resetView(): void {
  viewport.value = { x: 0, y: 0, zoom: 1, rotation: 0 };
  render();
}

function editToken(token: MapToken): void {
  editingToken.value = { ...token };
  showTokenEditor.value = true;
}

function editSelectedToken(): void {
  if (!currentMap.value) return;
  const token = currentMap.value.tokens.find(t => t.id === selectedTokens.value[0]);
  if (token) editToken(token);
}

function saveTokenEdit(): void {
  if (!currentMap.value || !editingToken.value) return;

  mapManager.updateToken(currentMap.value.id, editingToken.value.id, editingToken.value);
  showTokenEditor.value = false;
  editingToken.value = null;
  render();
}

function deleteSelectedTokens(): void {
  if (!currentMap.value) return;

  for (const tokenId of selectedTokens.value) {
    mapManager.removeToken(currentMap.value.id, tokenId);
  }

  selectedTokens.value = [];
  mapRenderer.setOptions({ selectedTokens: [] });
  render();
}

function handleExport(): void {
  if (!currentMap.value) return;

  const json = mapManager.exportMap(currentMap.value.id);
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentMap.value.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const map = mapManager.importMap(reader.result as string);
    if (map) {
      loadMap(map.id);
    }
  };
  reader.readAsText(file);
  input.value = '';
}

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'tokenSelect', token: MapToken): void;
  (e: 'interaction', result: unknown): void;
}>();

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  const maps = mapManager.getAllMaps();
  if (maps.length > 0) {
    loadMap(maps[0].id);
  }

  unsubscribe = mapManager.onChange((map: DiceMap | null) => {
    currentMap.value = map;
    render();
  });

  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  mapRenderer.detach();
  if (unsubscribe) unsubscribe();
  window.removeEventListener('resize', handleResize);
});

watch(selectedTokens, () => {
  mapRenderer.setOptions({ selectedTokens: selectedTokens.value });
});
</script>

<template>
  <div class="acu-map-panel">
    <div class="acu-panel-header">
      <div class="acu-header-title">
        <i class="fa-solid fa-map"></i>
        <span>{{ currentMap?.name || '地图' }}</span>
      </div>
      <div class="acu-header-actions">
        <button class="acu-btn acu-btn-sm" @click="showMapList = !showMapList">
          <i class="fa-solid fa-list"></i>
        </button>
        <button class="acu-btn acu-btn-sm" @click="handleExport">
          <i class="fa-solid fa-download"></i>
        </button>
        <label class="acu-btn acu-btn-sm">
          <i class="fa-solid fa-upload"></i>
          <input type="file" accept=".json" hidden @change="handleImport" />
        </label>
        <button class="acu-btn acu-btn-icon acu-btn-close" @click="$emit('close')">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>

    <div class="acu-panel-body">
      <div class="acu-toolbar">
        <div class="acu-tool-groups">
          <div class="acu-tool-group">
            <button
              v-for="tool in tools.filter(t => t.category === 'select')"
              :key="tool.id"
              class="acu-tool-btn"
              :class="{ active: selectedTool === tool.id }"
              :title="tool.name"
              @click="selectTool(tool.id)"
            >
              <i :class="tool.icon"></i>
            </button>
          </div>

          <div class="acu-tool-group">
            <button
              v-for="tool in tools.filter(t => t.category === 'token')"
              :key="tool.id"
              class="acu-tool-btn"
              :class="{ active: selectedTool === tool.id }"
              :title="tool.name"
              @click="selectTool(tool.id)"
            >
              <i :class="tool.icon"></i>
            </button>
          </div>

          <div class="acu-tool-group">
            <button
              v-for="tool in tools.filter(t => t.category === 'draw')"
              :key="tool.id"
              class="acu-tool-btn"
              :class="{ active: selectedTool === tool.id }"
              :title="tool.name"
              @click="selectTool(tool.id)"
            >
              <i :class="tool.icon"></i>
            </button>
          </div>

          <div class="acu-tool-group">
            <button
              v-for="tool in tools.filter(t => t.category === 'fog')"
              :key="tool.id"
              class="acu-tool-btn"
              :class="{ active: selectedTool === tool.id }"
              :title="tool.name"
              @click="selectTool(tool.id)"
            >
              <i :class="tool.icon"></i>
            </button>
          </div>

          <div class="acu-tool-group">
            <button
              v-for="tool in tools.filter(t => t.category === 'interact')"
              :key="tool.id"
              class="acu-tool-btn"
              :class="{ active: selectedTool === tool.id }"
              :title="tool.name"
              @click="selectTool(tool.id)"
            >
              <i :class="tool.icon"></i>
            </button>
          </div>
        </div>

        <div class="acu-zoom-controls">
          <button class="acu-btn acu-btn-sm" @click="zoomOut">
            <i class="fa-solid fa-minus"></i>
          </button>
          <span class="acu-zoom-level">{{ Math.round(viewport.zoom * 100) }}%</span>
          <button class="acu-btn acu-btn-sm" @click="zoomIn">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button class="acu-btn acu-btn-sm" @click="resetView">
            <i class="fa-solid fa-compress"></i>
          </button>
        </div>
      </div>

      <div class="acu-canvas-container">
        <canvas
          ref="canvasRef"
          class="acu-map-canvas"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @wheel="handleWheel"
        ></canvas>

        <div v-if="!currentMap" class="acu-empty-overlay">
          <i class="fa-solid fa-map"></i>
          <p>暂无地图</p>
          <button class="acu-btn acu-btn-primary" @click="createNewMap">
            <i class="fa-solid fa-plus"></i>
            创建地图
          </button>
        </div>
      </div>

      <div v-if="selectedTokens.length > 0" class="acu-selection-bar">
        <span>已选择 {{ selectedTokens.length }} 个令牌</span>
        <button class="acu-btn acu-btn-sm" @click="editSelectedToken">
          <i class="fa-solid fa-edit"></i>
          编辑
        </button>
        <button class="acu-btn acu-btn-sm acu-btn-danger" @click="deleteSelectedTokens">
          <i class="fa-solid fa-trash"></i>
          删除
        </button>
      </div>
    </div>

    <div v-if="showMapList" class="acu-map-list-panel">
      <div class="acu-list-header">
        <span>地图列表</span>
        <button class="acu-btn acu-btn-sm" @click="createNewMap">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
      <div class="acu-list-content">
        <div
          v-for="map in maps"
          :key="map.id"
          class="acu-map-item"
          :class="{ active: currentMap?.id === map.id }"
          @click="loadMap(map.id)"
        >
          <div class="acu-map-info">
            <span class="acu-map-name">{{ map.name }}</span>
            <span class="acu-map-size">{{ map.size.width }} x {{ map.size.height }}</span>
          </div>
          <button
            class="acu-btn acu-btn-sm acu-btn-danger"
            @click.stop="deleteMap(map.id)"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <div v-if="maps.length === 0" class="acu-empty">
          暂无地图
        </div>
      </div>
    </div>

    <div v-if="showTokenEditor && editingToken" class="acu-modal-overlay" @click.self="showTokenEditor = false">
      <div class="acu-modal">
        <div class="acu-modal-header">
          <span>编辑令牌</span>
          <button class="acu-btn acu-btn-icon" @click="showTokenEditor = false">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
        <div class="acu-modal-body">
          <div class="acu-form-group">
            <label>名称</label>
            <input v-model="editingToken.name" type="text" />
          </div>
          <div class="acu-form-row">
            <div class="acu-form-group">
              <label>X</label>
              <input v-model.number="editingToken.position.x" type="number" />
            </div>
            <div class="acu-form-group">
              <label>Y</label>
              <input v-model.number="editingToken.position.y" type="number" />
            </div>
          </div>
          <div class="acu-form-row">
            <div class="acu-form-group">
              <label>宽度</label>
              <input v-model.number="editingToken.size.width" type="number" />
            </div>
            <div class="acu-form-group">
              <label>高度</label>
              <input v-model.number="editingToken.size.height" type="number" />
            </div>
          </div>
          <div class="acu-form-group">
            <label>旋转角度</label>
            <input v-model.number="editingToken.rotation" type="number" min="0" max="360" />
          </div>
          <div class="acu-form-group">
            <label>颜色</label>
            <input v-model="editingToken.color" type="color" />
          </div>
          <div class="acu-form-group acu-toggle-group">
            <label>锁定</label>
            <input v-model="editingToken.locked" type="checkbox" class="acu-toggle" />
          </div>
          <div class="acu-form-group acu-toggle-group">
            <label>隐藏</label>
            <input v-model="editingToken.hidden" type="checkbox" class="acu-toggle" />
          </div>
        </div>
        <div class="acu-modal-footer">
          <button class="acu-btn" @click="showTokenEditor = false">取消</button>
          <button class="acu-btn acu-btn-primary" @click="saveTokenEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.acu-map-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--acu-bg-panel, #1e1e2e);
  border-radius: 12px;
  overflow: hidden;
}

.acu-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--acu-bg-header, #181825);
  border-bottom: 1px solid var(--acu-border, #313244);
}

.acu-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: var(--acu-text-main, #cdd6f4);

  i {
    color: var(--acu-accent, #89b4fa);
  }
}

.acu-header-actions {
  display: flex;
  gap: 4px;
}

.acu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--acu-border, #313244);
  border-radius: 6px;
  background: var(--acu-bg-btn, #313244);
  color: var(--acu-text-main, #cdd6f4);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--acu-bg-btn-hover, #45475a);
  }
}

.acu-btn-icon {
  padding: 6px;
  min-width: 32px;
}

.acu-btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.acu-btn-primary {
  background: var(--acu-accent, #89b4fa);
  border-color: var(--acu-accent, #89b4fa);
  color: var(--acu-btn-active-text, #1e1e2e);
  font-weight: 500;
}

.acu-btn-danger:hover {
  background: var(--acu-danger, #f38ba8);
  border-color: var(--acu-danger, #f38ba8);
  color: white;
}

.acu-btn-close:hover {
  background: var(--acu-danger, #f38ba8);
  color: white;
}

.acu-panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.acu-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--acu-bg-nav, #181825);
  border-bottom: 1px solid var(--acu-border, #313244);
}

.acu-tool-groups {
  display: flex;
  gap: 8px;
}

.acu-tool-group {
  display: flex;
  gap: 2px;
  padding: 4px;
  border-radius: 6px;
  background: var(--acu-bg-btn, #313244);
}

.acu-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--acu-text-sub, #6c7086);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--acu-bg-btn-hover, #45475a);
    color: var(--acu-text-main, #cdd6f4);
  }

  &.active {
    background: var(--acu-accent, #89b4fa);
    color: var(--acu-btn-active-text, #1e1e2e);
  }
}

.acu-zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.acu-zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 12px;
  color: var(--acu-text-sub, #6c7086);
}

.acu-canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.acu-map-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.acu-empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 46, 0.9);
  color: var(--acu-text-sub, #6c7086);

  i {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    margin-bottom: 16px;
  }
}

.acu-selection-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--acu-bg-nav, #181825);
  border-top: 1px solid var(--acu-border, #313244);
  font-size: 13px;
  color: var(--acu-text-sub, #6c7086);
}

.acu-map-list-panel {
  position: absolute;
  top: 60px;
  left: 12px;
  width: 250px;
  border-radius: 8px;
  background: var(--acu-bg-panel, #1e1e2e);
  border: 1px solid var(--acu-border, #313244);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.acu-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--acu-border, #313244);
  font-weight: 600;
  font-size: 14px;
}

.acu-list-content {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.acu-map-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--acu-bg-btn, #313244);
  }

  &.active {
    background: var(--acu-accent, #89b4fa);
    color: var(--acu-btn-active-text, #1e1e2e);
  }
}

.acu-map-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.acu-map-name {
  font-weight: 500;
  font-size: 13px;
}

.acu-map-size {
  font-size: 11px;
  opacity: 0.7;
}

.acu-empty {
  padding: 24px;
  text-align: center;
  color: var(--acu-text-sub, #6c7086);
  font-size: 13px;
}

.acu-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.acu-modal {
  width: 90%;
  max-width: 400px;
  border-radius: 12px;
  background: var(--acu-bg-panel, #1e1e2e);
  border: 1px solid var(--acu-border, #313244);
}

.acu-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--acu-border, #313244);
  font-weight: 600;
}

.acu-modal-body {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.acu-form-group {
  margin-bottom: 16px;

  > label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--acu-text-sub, #6c7086);
  }

  input[type='text'],
  input[type='number'] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--acu-border, #313244);
    border-radius: 8px;
    background: var(--acu-bg-input, #313244);
    color: var(--acu-text-main, #cdd6f4);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--acu-accent, #89b4fa);
    }
  }

  input[type='color'] {
    width: 100%;
    height: 40px;
    padding: 4px;
    border: 1px solid var(--acu-border, #313244);
    border-radius: 8px;
    background: var(--acu-bg-input, #313244);
    cursor: pointer;
  }
}

.acu-form-row {
  display: flex;
  gap: 12px;

  .acu-form-group {
    flex: 1;
  }
}

.acu-toggle-group {
  display: flex;
  align-items: center;
  gap: 12px;

  > label {
    flex: 1;
    margin-bottom: 0;
  }
}

.acu-toggle {
  position: relative;
  width: 42px;
  height: 24px;
  appearance: none;
  background: var(--acu-bg-input, #313244);
  border-radius: 12px;
  cursor: pointer;

  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--acu-text-sub, #6c7086);
    transition: all 0.2s;
  }

  &:checked {
    background: var(--acu-accent, #89b4fa);

    &::before {
      transform: translateX(18px);
      background: var(--acu-btn-active-text, #1e1e2e);
    }
  }
}

.acu-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--acu-border, #313244);
}
</style>
