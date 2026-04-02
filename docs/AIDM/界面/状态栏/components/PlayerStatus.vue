<template>
  <div class="player-status">
    <div class="status-header">
      <span class="player-name">{{ store.data.玩家.名称 }}</span>
      <span class="player-rank">{{ store.data.玩家.等级 }}</span>
      <span class="player-race">{{ store.data.玩家.种族 }}</span>
    </div>

    <div class="hp-shield-row">
      <div class="stat-bar hp-bar">
        <span class="stat-label">HP</span>
        <div class="bar-track">
          <div class="bar-fill hp-fill" :style="{ width: hpPercent + '%' }"></div>
        </div>
        <span class="stat-value">{{ store.data.玩家.战斗属性.HP.当前 }}/{{ store.data.玩家.战斗属性.HP.最大 }}</span>
      </div>
      <div v-if="store.data.玩家.战斗属性.护盾 > 0" class="stat-bar shield-bar">
        <span class="stat-label">护盾</span>
        <div class="bar-track">
          <div class="bar-fill shield-fill" :style="{ width: '100%' }"></div>
        </div>
        <span class="stat-value">{{ store.data.玩家.战斗属性.护盾 }}</span>
      </div>
    </div>

    <div class="currency-row">
      <span class="currency-item">
        <span class="currency-icon">💰</span>
        兑换点: {{ store.data.玩家.兑换点 }}
      </span>
      <span class="currency-item">
        <span class="currency-icon">⭐</span>
        沉淀点: {{ store.data.玩家.沉淀点 }}
      </span>
      <span class="currency-item">
        <span class="currency-icon">🌍</span>
        完成世界: {{ store.data.进度.完成世界数 }}
      </span>
    </div>

    <div class="attributes-grid">
      <div v-for="(value, attr) in store.data.玩家.基础属性" :key="attr" class="attr-item">
        <span class="attr-name">{{ attr }}</span>
        <span class="attr-value">{{ value }}</span>
      </div>
    </div>

    <div class="combat-stats">
      <div class="stat-item">
        <span class="stat-name">物攻</span>
        <span class="stat-num">{{ store.data.玩家.战斗属性.物理攻击 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">法攻</span>
        <span class="stat-num">{{ store.data.玩家.战斗属性.法术攻击 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">物防</span>
        <span class="stat-num">{{ store.data.玩家.战斗属性.物理防御 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">法防</span>
        <span class="stat-num">{{ store.data.玩家.战斗属性.法术防御 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">DDC</span>
        <span class="stat-num">{{ store.data.玩家.战斗属性.DDC }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">暴击</span>
        <span class="stat-num">{{ store.data.玩家.战斗属性.暴击率 }}%</span>
      </div>
    </div>

    <div v-if="!_.isEmpty(store.data.玩家.状态)" class="status-effects">
      <span class="status-label">状态效果:</span>
      <span v-for="status in store.data.玩家.状态" :key="status.名称" class="status-tag">
        {{ status.名称 }}({{ status.剩余回合 }})
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();

const hpPercent = computed(() => {
  const hp = store.data.玩家.战斗属性.HP;
  return Math.max(0, Math.min(100, (hp.当前 / hp.最大) * 100));
});
</script>

<style lang="scss" scoped>
.player-status {
  padding: 10px;
  border-bottom: 2px dashed var(--c-granite);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.player-name {
  font-weight: bold;
  font-size: 1.1rem;
}

.player-rank {
  background: var(--c-celadon);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: bold;
}

.player-race {
  color: var(--c-grey-olive);
  font-size: 0.85rem;
}

.hp-shield-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.stat-bar {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  font-weight: bold;
  font-size: 0.8rem;
  min-width: 40px;
}

.bar-track {
  flex: 1;
  height: 12px;
  border: 1.5px solid var(--c-granite);
  background: #fff;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  transition: width 0.25s ease;
}

.hp-fill {
  background: #27ae60;
}

.shield-fill {
  background: #3498db;
}

.stat-value {
  font-size: 0.8rem;
  min-width: 60px;
  text-align: right;
}

.currency-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed var(--c-grey-olive);
  margin-bottom: 8px;
}

.currency-item {
  font-size: 0.85rem;
}

.currency-icon {
  margin-right: 4px;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.attr-item {
  text-align: center;
  border: 1px solid var(--c-granite);
  padding: 4px;
  background: #fff;
}

.attr-name {
  display: block;
  font-size: 0.7rem;
  color: var(--c-grey-olive);
}

.attr-value {
  display: block;
  font-weight: bold;
  font-size: 0.9rem;
}

.combat-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.stat-item {
  text-align: center;
  padding: 4px;
}

.stat-name {
  display: block;
  font-size: 0.7rem;
  color: var(--c-grey-olive);
}

.stat-num {
  display: block;
  font-weight: bold;
  font-size: 0.85rem;
}

.status-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.status-label {
  font-size: 0.8rem;
  color: var(--c-grey-olive);
}

.status-tag {
  background: #9b59b6;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
}

@media (max-width: 600px) {
  .attributes-grid,
  .combat-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .currency-row {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
