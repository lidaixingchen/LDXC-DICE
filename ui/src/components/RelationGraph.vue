<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDashboard } from '../composables/useDashboard';
import type { RelationNode, RelationEdge } from '../types/dashboard';

const { getTableData, findTableByKeywords, parseRelationData } = useDashboard();

const isVisible = ref(false);
const nodes = ref<RelationNode[]>([]);
const edges = ref<RelationEdge[]>([]);
const selectedNode = ref<RelationNode | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const nodePositions = ref<Map<string, { x: number; y: number }>>(new Map());

function loadData() {
  const rawData = getTableData();
  if (!rawData) return;

  const npcTable = findTableByKeywords(rawData, 'npc');
  if (!npcTable) return;

  const result = parseRelationData(npcTable);
  nodes.value = result.nodes;
  edges.value = result.edges;

  calculatePositions();
}

function calculatePositions() {
  const centerX = 200;
  const centerY = 200;
  const radius = 150;

  nodePositions.value.clear();

  nodes.value.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / nodes.value.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    nodePositions.value.set(node.id, { x, y });
  });
}

function drawGraph() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(137, 180, 250, 0.3)';
  ctx.lineWidth = 1;

  edges.value.forEach(edge => {
    const sourcePos = nodePositions.value.get(edge.source) || nodePositions.value.get(`node_${edge.source}`);
    const targetPos = nodePositions.value.get(edge.target) || nodePositions.value.get(`node_${edge.target}`);

    if (sourcePos && targetPos) {
      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();

      const midX = (sourcePos.x + targetPos.x) / 2;
      const midY = (sourcePos.y + targetPos.y) / 2;
      ctx.fillStyle = 'rgba(108, 112, 134, 0.8)';
      ctx.font = '9px sans-serif';
      ctx.fillText(edge.relation, midX - 10, midY);
    }
  });

  nodes.value.forEach(node => {
    const pos = nodePositions.value.get(node.id);
    if (!pos) return;

    const isSelected = selectedNode.value?.id === node.id;
    const isConnected =
      selectedNode.value &&
      edges.value.some(
        e =>
          (e.source === selectedNode.value?.name && e.target === node.name) ||
          (e.target === selectedNode.value?.name && e.source === node.name)
      );

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, isSelected ? 24 : 20, 0, 2 * Math.PI);

    if (isSelected) {
      ctx.fillStyle = '#89b4fa';
    } else if (isConnected) {
      ctx.fillStyle = '#45475a';
    } else {
      ctx.fillStyle = '#313244';
    }
    ctx.fill();

    ctx.strokeStyle = isSelected ? '#89b4fa' : '#45475a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isSelected || isConnected ? '#1e1e2e' : '#cdd6f4';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayName = node.name.length > 4 ? node.name.slice(0, 4) + '..' : node.name;
    ctx.fillText(displayName, pos.x, pos.y);
  });
}

function handleCanvasClick(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  for (const node of nodes.value) {
    const pos = nodePositions.value.get(node.id);
    if (!pos) continue;

    const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
    if (dist < 20) {
      selectedNode.value = selectedNode.value?.id === node.id ? null : node;
      drawGraph();
      return;
    }
  }

  selectedNode.value = null;
  drawGraph();
}

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

watch(isVisible, val => {
  if (val) {
    setTimeout(() => {
      drawGraph();
    }, 100);
  }
});

defineExpose({ show, hide, toggle });
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" class="acu-relation-graph">
      <div class="acu-panel-header">
        <div class="acu-header-title">
          <i class="fa-solid fa-project-diagram"></i>
          <span class="acu-title-text">人物关系图</span>
        </div>
        <div class="acu-header-sub">{{ nodes.length }}人 · {{ edges.length }}条关系</div>
        <div class="acu-header-actions">
          <button class="acu-header-btn acu-btn-close" title="关闭" @click="hide">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      </div>

      <div class="acu-panel-body">
        <div class="acu-graph-container">
          <canvas
            ref="canvasRef"
            width="400"
            height="400"
            class="acu-graph-canvas"
            @click="handleCanvasClick"
          ></canvas>
        </div>

        <div v-if="selectedNode" class="acu-node-detail">
          <h4 class="acu-detail-title">
            <i class="fa-solid fa-user"></i>
            {{ selectedNode.name }}
          </h4>
          <div v-if="relatedNodes.length > 0" class="acu-related-list">
            <div v-for="item in relatedNodes" :key="item.node.id + item.relation" class="acu-related-item">
              <span class="acu-relation">{{ item.relation }}</span>
              <i class="fa-solid fa-arrow-right"></i>
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
          <span>点击节点查看关系详情</span>
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
  width: 450px;
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
}

.acu-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--acu-text-main, #cdd6f4);
  font-weight: 600;
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
}

.acu-graph-container {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.acu-graph-canvas {
  background: var(--acu-bg-btn, #313244);
  border-radius: 8px;
  cursor: pointer;
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
  margin-bottom: 12px;
}

.acu-related-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.acu-related-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--acu-bg-main, #1e1e2e);
  border-radius: 4px;
  font-size: 12px;
}

.acu-relation {
  color: var(--acu-text-sub, #6c7086);
}

.acu-related-item i {
  font-size: 10px;
  color: var(--acu-text-sub, #6c7086);
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
