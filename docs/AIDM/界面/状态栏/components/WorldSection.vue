<template>
  <div class="world-section">
    <div class="meta-row">
      <span>场景: {{ store.data.世界.当前场景 }}</span>
      <span v-if="store.data.世界.当前世界.名称">世界: {{ store.data.世界.当前世界.名称 }}</span>
      <span v-if="store.data.世界.当前世界.等级">等级: {{ store.data.世界.当前世界.等级 }}</span>
      <span v-if="store.data.世界.当前世界.类型">类型: {{ store.data.世界.当前世界.类型 }}</span>
    </div>
    <div v-if="store.data.世界.战斗状态" class="battle-info">
      <span class="battle-badge">⚔️ 战斗中</span>
      <span>回合: {{ store.data.世界.回合数 }}</span>
      <span v-if="store.data.世界.环境侵蚀" class="erosion-warning">⚠️ 环境侵蚀</span>
    </div>
    <div v-if="!_.isEmpty(store.data.世界.关键NPC)" class="npc-list">
      <div v-for="npc in store.data.世界.关键NPC" :key="npc.名称" class="npc-badge">
        <span class="npc-name">{{ npc.名称 }}</span>
        <span class="npc-relation">{{ npc.关系 }}</span>
        <span class="npc-status" :class="{ dead: npc.状态 !== '存活' }">{{ npc.状态 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();
</script>

<style lang="scss" scoped>
.world-section {
  border-bottom: 3px solid var(--c-granite);
  padding: 10px;
  background-color: var(--c-mint-cream);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: bold;
  font-size: 0.9rem;
  border-bottom: 1.5px dashed var(--c-grey-olive);
  padding-bottom: 6px;
  flex-wrap: wrap;
  gap: 6px;
}

.battle-info {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 6px 0;
  font-size: 0.85rem;
}

.battle-badge {
  background: #c0392b;
  color: white;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: bold;
}

.erosion-warning {
  color: #e74c3c;
  font-weight: bold;
}

.npc-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-top: 6px;
}

.npc-badge {
  background: #fff;
  border: 1.5px solid var(--c-granite);
  padding: 6px 8px;
  min-width: 120px;
  flex: 1;
  position: relative;
}

.npc-badge::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: var(--c-celadon);
}

.npc-name {
  display: block;
  font-weight: bold;
  margin-bottom: 2px;
  padding-left: 6px;
}

.npc-relation {
  display: block;
  font-size: 0.75rem;
  color: var(--c-grey-olive);
  padding-left: 6px;
}

.npc-status {
  display: inline-block;
  font-size: 0.7rem;
  background: var(--c-celadon);
  color: white;
  padding: 1px 4px;
  margin-left: 6px;
  margin-top: 2px;
  border-radius: 2px;
}

.npc-status.dead {
  background: #c0392b;
}

@media (max-width: 600px) {
  .meta-row {
    flex-direction: column;
    gap: 5px;
  }

  .npc-list {
    flex-direction: column;
  }

  .npc-badge {
    min-width: auto;
  }
}
</style>
