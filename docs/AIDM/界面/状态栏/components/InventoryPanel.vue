<template>
  <div>
    <div class="section-head">物品清单</div>
    <div v-if="!_.isEmpty(store.data.玩家.物品栏)" class="inventory-grid">
      <div v-for="(item, name) in store.data.玩家.物品栏" :key="name" class="item-row">
        <div class="item-icon" :class="getItemTypeClass(item.类型)">{{ getItemIcon(name as string) }}</div>
        <div class="item-detail">
          <span class="item-name">{{ name }}</span>
          <span class="item-desc">{{ item.描述 }}</span>
          <span class="item-type">{{ item.类型 }}</span>
        </div>
        <span class="item-count">x{{ item.数量 }}</span>
      </div>
    </div>
    <div v-else class="empty-state">背包空空如也...</div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();

function getItemIcon(name: string): string {
  if (name.includes('药水') || name.includes('药')) return '💊';
  if (name.includes('火把') || name.includes('灯')) return '🔥';
  if (name.includes('钥匙')) return '🔑';
  if (name.includes('钱') || name.includes('币')) return '💰';
  if (name.includes('书') || name.includes('卷')) return '📖';
  if (name.includes('武器') || name.includes('剑') || name.includes('刀')) return '⚔️';
  if (name.includes('盾') || name.includes('甲')) return '🛡️';
  if (name.includes('食物') || name.includes('粮')) return '🍖';
  return '📦';
}

function getItemTypeClass(type: string): string {
  switch (type) {
    case '消耗品':
      return 'type-consumable';
    case '材料':
      return 'type-material';
    case '任务道具':
      return 'type-quest';
    case '特殊':
      return 'type-special';
    default:
      return '';
  }
}
</script>

<style lang="scss" scoped>
.inventory-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--c-granite);
  padding: 8px;
  background: #fff;
  transition: transform 0.2s;
}

.item-row:hover {
  transform: translateX(5px);
  background: var(--c-mint-cream);
}

.item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 1.2rem;
  border-radius: 4px;
}

.item-icon.type-consumable {
  background: #e8f5e9;
}

.item-icon.type-material {
  background: #fff3e0;
}

.item-icon.type-quest {
  background: #fce4ec;
}

.item-icon.type-special {
  background: #f3e5f5;
}

.item-detail {
  flex: 1;
}

.item-name {
  font-weight: bold;
  display: block;
}

.item-desc {
  font-size: 0.76rem;
  color: var(--c-grey-olive);
  display: block;
}

.item-type {
  font-size: 0.7rem;
  color: var(--c-ash-grey);
  display: inline-block;
  padding: 1px 4px;
  background: var(--c-mint-cream);
  border-radius: 2px;
  margin-top: 2px;
}

.item-count {
  background: var(--c-granite);
  color: #fff;
  padding: 2px 8px;
  font-size: 0.8rem;
  border-radius: 3px;
}

.empty-state {
  text-align: center;
  color: var(--c-grey-olive);
  padding: 18px;
  font-style: italic;
  font-size: 0.85rem;
}

.section-head {
  font-size: 0.95rem;
  border-bottom: 3px solid var(--c-celadon);
  display: inline-block;
  margin-bottom: 8px;
  font-weight: bold;
}
</style>
