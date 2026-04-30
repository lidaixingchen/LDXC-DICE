<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useDashboard } from '../composables/useDashboard';
import type { RelationNode, RelationEdge } from '../types/dashboard';

const { getTableData, findTableByKeywords, parseRelationData } = useDashboard();

const isVisible = ref(false);
const nodes = ref<RelationNode[]>([]);
const edges = ref<RelationEdge[]>([]);
const selectedNode = ref<RelationNode | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 布局状态
const nodePositions = ref<Map<string, { x: number; y: number }>>(new Map());
const zoom = ref(1.0);
const offset = ref({ x: 0, y: 0 });

// 拖拽状态
const dragNode = ref<string | null>(null);
const dragOffset = ref({ x: 0, y: 0 });

// 画布尺寸
const canvasSize = computed(() => {
  const count = nodes.value.length;
  const base = 400;
  const extra = Math.max(0, count - 10) * 30;
  const size = Math.min(base + extra, 800);
  return { width: size, height: size };
});

function loadData() {
  const rawData = getTableData();
  if (!rawData) return;

  const npcTable = findTableByKeywords(rawData, 'npc');
  if (!npcTable) return;

  const result = parseRelationData(npcTable);
  nodes.value = result.nodes;
  edges.value = result.edges;

  calculateForceLayout();
}

// ========================================
// 力导向布局算法
// ========================================

function calculateForceLayout() {
  const n = nodes.value.length;
  if (n === 0) return;

  const { width, height } = canvasSize.value;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  // 初始位置：环形均匀分布
  nodePositions.value.clear();
  nodes.value.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
    nodePositions.value.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  // 归一化节点 ID（兼容有无 node_ 前缀两种格式）
  function nodeKey(id: string): string {
    return nodePositions.value.has(id) ? id : `node_${id}`;
  }

  // 简化为导迭代
  const iterations = 50;
  const repulsion = 8000;
  const attraction = 0.005;
  const damping = 0.85;

  for (let iter = 0; iter < iterations; iter++) {
    const forces: Map<string, { fx: number; fy: number }> = new Map();
    nodes.value.forEach(n => {
      forces.set(n.id, { fx: 0, fy: 0 });
      forces.set(`node_${n.id}`, { fx: 0, fy: 0 });
    });

    // 排斥力（所有节点对）
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pi = nodePositions.value.get(nodes.value[i].id)!;
        const pj = nodePositions.value.get(nodes.value[j].id)!;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 10);
        const force = repulsion / (dist * dist);

        const fxi = forces.get(nodes.value[i].id)!;
        const fxj = forces.get(nodes.value[j].id)!;
        fxi.fx += (dx / dist) * force;
        fxi.fy += (dy / dist) * force;
        fxj.fx -= (dx / dist) * force;
        fxj.fy -= (dy / dist) * force;
      }
    }

    // 吸引力（沿着边）
    edges.value.forEach(edge => {
      const sourceKey = nodeKey(edge.source);
      const targetKey = nodeKey(edge.target);
      const sourcePos = nodePositions.value.get(sourceKey) || nodePositions.value.get(`node_${edge.source}`);
      const targetPos = nodePositions.value.get(targetKey) || nodePositions.value.get(`node_${edge.target}`);
      if (!sourcePos || !targetPos) return;

      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = dist * attraction;

      const sourceForce = forces.get(sourceKey);
      const targetForce = forces.get(targetKey);
      if (sourceForce) {
        sourceForce.fx += (dx / dist) * force;
        sourceForce.fy += (dy / dist) * force;
      }
      if (targetForce) {
        targetForce.fx -= (dx / dist) * force;
        targetForce.fy -= (dy / dist) * force;
      }
    });

    // 向心力（拉回中心）
    nodes.value.forEach(node => {
      const pos = nodePositions.value.get(node.id)!;
      const force = forces.get(node.id)!;
      const dx = cx - pos.x;
      const dy = cy - pos.y;
      force.fx += dx * 0.01;
      force.fy += dy * 0.01;
    });

    // 应用力
    nodes.value.forEach(node => {
      const pos = nodePositions.value.get(node.id)!;
      const force = forces.get(node.id)!;
      pos.x += force.fx * damping;
      pos.y += force.fy * damping;

      // 边界约束
      pos.x = Math.max(20, Math.min(width - 20, pos.x));
      pos.y = Math.max(20, Math.min(height - 20, pos.y));
    });
  }

  zoom.value = 1;
  offset.value = { x: 0, y: 0 };
}

// ========================================
// 渲染
// ========================================

function drawGraph() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvasSize.value;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(offset.value.x, offset.value.y);
  ctx.scale(zoom.value, zoom.value);

  // 画边
  edges.value.forEach(edge => {
    const sourcePos = nodePositions.value.get(edge.source) || nodePositions.value.get(`node_${edge.source}`);
    const targetPos = nodePositions.value.get(edge.target) || nodePositions.value.get(`node_${edge.target}`);
    if (!sourcePos || !targetPos) return;

    ctx.beginPath();
    ctx.moveTo(sourcePos.x, sourcePos.y);
    ctx.lineTo(targetPos.x, targetPos.y);
    ctx.strokeStyle = isEdgeHighlighted(edge) ? 'rgba(137, 180, 250, 0.6)' : 'rgba(108, 112, 134, 0.25)';
    ctx.lineWidth = isEdgeHighlighted(edge) ? 2 : 1;
    ctx.stroke();

    // 关系标签（中点）
    const midX = (sourcePos.x + targetPos.x) / 2;
    const midY = (sourcePos.y + targetPos.y) / 2 - 10;
    ctx.fillStyle = isEdgeHighlighted(edge) ? 'rgba(137, 180, 250, 0.8)' : 'rgba(108, 112, 134, 0.6)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rel = edge.relation || '关联';
    ctx.fillText(rel.length > 6 ? rel.slice(0, 6) + '..' : rel, midX, midY);
  });

  // 画节点
  const nodeRadius = Math.max(18, Math.min(24, 400 / nodes.value.length));
  nodes.value.forEach(node => {
    const pos = nodePositions.value.get(node.id);
    if (!pos) return;

    const isSel = selectedNode.value?.id === node.id;
    const isConn = isConnectedToSelected(node);

    // 节点圆圈
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, isSel ? nodeRadius + 4 : nodeRadius, 0, 2 * Math.PI);

    if (isSel) {
      ctx.fillStyle = '#89b4fa';
    } else if (isConn) {
      ctx.fillStyle = '#585b70';
    } else {
      ctx.fillStyle = '#313244';
    }
    ctx.fill();

    ctx.strokeStyle = isSel ? '#89b4fa' : isConn ? '#585b70' : '#45475a';
    ctx.lineWidth = isSel ? 2.5 : 1.5;
    ctx.stroke();

    // 节点名称
    ctx.fillStyle = isSel || isConn ? '#cdd6f4' : '#a6adc8';
    ctx.font = `bold ${Math.max(10, Math.min(12, nodeRadius - 6))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayName = node.name.length > (isSel ? 8 : 4)
      ? node.name.slice(0, isSel ? 8 : 4) + '..'
      : node.name;
    ctx.fillText(displayName, pos.x, pos.y);

    // 选中节点标签
    if (isSel) {
      ctx.fillStyle = '#cdd6f4';
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(node.name, pos.x, pos.y + nodeRadius + 8);
    }
  });

  ctx.restore();
}

function isEdgeHighlighted(edge: RelationEdge): boolean {
  if (!selectedNode.value) return false;
  return edge.source === selectedNode.value.name || edge.target === selectedNode.value.name;
}

function isConnectedToSelected(node: RelationNode): boolean {
  if (!selectedNode.value) return false;
  return edges.value.some(
    e =>
      (e.source === selectedNode.value?.name && e.target === node.name) ||
      (e.target === selectedNode.value?.name && e.source === node.name),
  );
}

// ========================================
// 交互：点击、拖拽、缩放
// ========================================

function handleCanvasClick(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left - offset.value.x) / zoom.value;
  const canvasY = (e.clientY - rect.top - offset.value.y) / zoom.value;

  const nodeRadius = Math.max(18, Math.min(24, 400 / nodes.value.length));

  for (const node of nodes.value) {
    const pos = nodePositions.value.get(node.id);
    if (!pos) continue;

    const dist = Math.sqrt((canvasX - pos.x) ** 2 + (canvasY - pos.y) ** 2);
    if (dist < nodeRadius + 4) {
      selectedNode.value = selectedNode.value?.id === node.id ? null : node;
      drawGraph();
      return;
    }
  }

  // 点击空白取消选中
  if (!e.ctrlKey) {
    selectedNode.value = null;
    drawGraph();
  }
}

function handleMouseDown(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  if (e.button !== 0) return;

  const rect = canvas.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left - offset.value.x) / zoom.value;
  const canvasY = (e.clientY - rect.top - offset.value.y) / zoom.value;

  const nodeRadius = Math.max(18, Math.min(24, 400 / nodes.value.length));

  for (const node of nodes.value) {
    const pos = nodePositions.value.get(node.id);
    if (!pos) continue;

    const dist = Math.sqrt((canvasX - pos.x) ** 2 + (canvasY - pos.y) ** 2);
    if (dist < nodeRadius + 4) {
      dragNode.value = node.id;
      dragOffset.value = { x: canvasX - pos.x, y: canvasY - pos.y };
      return;
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!dragNode.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const pos = nodePositions.value.get(dragNode.value);
  if (!pos) return;

  pos.x = (e.clientX - rect.left - offset.value.x) / zoom.value - dragOffset.value.x;
  pos.y = (e.clientY - rect.top - offset.value.y) / zoom.value - dragOffset.value.y;

  // 边界约束
  const { width, height } = canvasSize.value;
  pos.x = Math.max(10, Math.min(width - 10, pos.x));
  pos.y = Math.max(10, Math.min(height - 10, pos.y));

  drawGraph();
}

function handleMouseUp() {
  if (dragNode.value) {
    dragNode.value = null;
    drawGraph();
  }
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.3, Math.min(3, zoom.value * delta));
  zoom.value = newZoom;
  drawGraph();
}

// ========================================
// 节点详情
// ========================================

const relatedNodes = computed(() => {
  if (!selectedNode.value) return [];
  const related: { node: RelationNode; relation: string; direction: 'from' | 'to' }[] = [];

  edges.value.forEach(edge => {
    if (edge.source === selectedNode.value?.name) {
      const targetNode = nodes.value.find(n => n.name === edge.target);
      if (targetNode) {
        related.push({ node: targetNode, relation: edge.relation, direction: 'to' });
      }
    } else if (edge.target === selectedNode.value?.name) {
      const sourceNode = nodes.value.find(n => n.name === edge.source);
      if (sourceNode) {
        related.push({ node: sourceNode, relation: edge.relation, direction: 'from' });
      }
    }
  });

  return related;
});

// ========================================
// 生命周期
// ========================================

function show() {
  isVisible.value = true;
  loadData();
}

function hide() {
  isVisible.value = false;
}

function toggle() {
  if (isVisible.value) {
    hide();
  } else {
    show();
  }
}

watch(isVisible, async val => {
  if (val) {
    await nextTick();
    setTimeout(() => {
      drawGraph();
    }, 100);
  }
});

defineExpose({ show, hide, toggle });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="acu-relation-graph"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <div class="acu-panel-header">
        <div class="acu-header-title">
          <i class="fa-solid fa-project-diagram"></i>
          <span>人物关系图</span>
        </div>
        <div class="acu-header-sub">
          {{ nodes.length }}人 · {{ edges.length }}条关系
        </div>
        <div class="acu-header-actions">
          <button class="acu-header-btn" title="重置布局" @click="calculateForceLayout">
            <i class="fa-solid fa-arrows-spin"></i>
          </button>
          <button class="acu-header-btn" title="放大" @click="zoom = Math.min(3, zoom + 0.2); nextTick(() => drawGraph())">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button class="acu-header-btn" title="缩小" @click="zoom = Math.max(0.3, zoom - 0.2); nextTick(() => drawGraph())">
            <i class="fa-solid fa-minus"></i>
          </button>
          <button class="acu-header-btn acu-btn-close" title="关闭" @click="hide">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      </div>

      <div class="acu-panel-body">
        <div class="acu-graph-container">
          <canvas
            ref="canvasRef"
            :width="canvasSize.width"
            :height="canvasSize.height"
            class="acu-graph-canvas"
            @click="handleCanvasClick"
            @mousedown="handleMouseDown"
            @wheel.prevent="handleWheel"
          ></canvas>
          <div class="acu-zoom-indicator">{{ Math.round(zoom * 100) }}%</div>
        </div>

        <div v-if="selectedNode" class="acu-node-detail">
          <h4 class="acu-detail-title">
            <i class="fa-solid fa-user"></i>
            {{ selectedNode.name }}
          </h4>
          <div class="acu-detail-meta" v-if="selectedNode.group">
            <i class="fa-solid fa-location-dot"></i> {{ selectedNode.group }}
          </div>
          <div v-if="relatedNodes.length > 0" class="acu-related-list">
            <div v-for="item in relatedNodes" :key="item.node.id + item.relation" class="acu-related-item">
              <i class="fa-solid fa-arrow-right" v-if="item.direction === 'to'"></i>
              <i class="fa-solid fa-arrow-left" v-else></i>
              <span class="acu-relation">{{ item.relation }}</span>
              <span class="acu-target">{{ item.node.name }}</span>
            </div>
          </div>
          <div v-else class="acu-no-relations">
            <i class="fa-solid fa-user-slash"></i>
            <span>暂无关系数据</span>
          </div>
        </div>

        <div v-else class="acu-hint">
          <i class="fa-solid fa-hand-pointer"></i>
          <span>点击节点查看关系 · 拖拽移动节点 · 滚轮缩放</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.acu-relation-graph {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 90vw;
  max-height: 90vh;
  background: var(--acu-bg-main, #1e1e2e);
  border: 1px solid var(--acu-border, #313244);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.acu-panel-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--acu-bg-header, #181825);
  border-bottom: 1px solid var(--acu-border, #313244);
  gap: 12px;
  flex-shrink: 0;
}

.acu-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--acu-text-main, #cdd6f4);
  font-weight: 600;
  font-size: 14px;
}

.acu-header-title i {
  color: var(--acu-accent, #89b4fa);
}

.acu-header-sub {
  font-size: 11px;
  color: var(--acu-text-sub, #6c7086);
  flex: 1;
}

.acu-header-actions {
  display: flex;
  gap: 4px;
}

.acu-header-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--acu-text-sub, #6c7086);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.acu-header-btn:hover {
  background: var(--acu-bg-btn-hover, #45475a);
  color: var(--acu-text-main, #cdd6f4);
}

.acu-header-btn.acu-btn-close:hover {
  background: var(--acu-danger, #f38ba8);
  color: white;
}

.acu-panel-body {
  padding: 16px;
  overflow-y: auto;
}

.acu-graph-container {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  position: relative;
}

.acu-graph-canvas {
  background: var(--acu-bg-btn, #313244);
  border-radius: 8px;
  cursor: pointer;
  max-width: 100%;
}

.acu-zoom-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: var(--acu-text-sub, #6c7086);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}

.acu-node-detail {
  background: var(--acu-bg-btn, #313244);
  border-radius: 8px;
  padding: 12px;
}

.acu-detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--acu-accent, #89b4fa);
  margin-bottom: 4px;
}

.acu-detail-meta {
  font-size: 11px;
  color: var(--acu-text-sub, #6c7086);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 24px;
}

.acu-related-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acu-related-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--acu-bg-main, #1e1e2e);
  border-radius: 4px;
  font-size: 12px;
}

.acu-related-item i {
  font-size: 10px;
  color: var(--acu-text-sub, #6c7086);
}

.acu-relation {
  color: var(--acu-text-sub, #6c7086);
  font-size: 11px;
}

.acu-target {
  color: var(--acu-text-main, #cdd6f4);
  font-weight: 500;
}

.acu-no-relations {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--acu-text-sub, #6c7086);
  font-size: 12px;
}

.acu-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--acu-text-sub, #6c7086);
  font-size: 12px;
}
</style>
