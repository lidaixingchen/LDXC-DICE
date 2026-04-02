<template>
  <div>
    <div class="section-head">武器</div>
    <div v-if="store.data.玩家.装备.武器.名称" class="equipment-card weapon">
      <div class="equip-header">
        <span class="equip-name">{{ store.data.玩家.装备.武器.名称 }}</span>
        <span class="equip-rank">{{ store.data.玩家.装备.武器.等级 }}</span>
      </div>
      <div class="equip-stats">
        <span v-if="store.data.玩家.装备.武器.物伤加成 > 0">物伤+{{ store.data.玩家.装备.武器.物伤加成 }}</span>
        <span v-if="store.data.玩家.装备.武器.法伤加成 > 0">法伤+{{ store.data.玩家.装备.武器.法伤加成 }}</span>
      </div>
    </div>
    <div v-else class="empty-equip">未装备武器</div>

    <div class="section-head">防具</div>
    <div v-if="store.data.玩家.装备.防具.名称" class="equipment-card armor">
      <div class="equip-header">
        <span class="equip-name">{{ store.data.玩家.装备.防具.名称 }}</span>
        <span class="equip-rank">{{ store.data.玩家.装备.防具.等级 }}</span>
      </div>
      <div class="equip-stats">
        <span v-if="store.data.玩家.装备.防具.物防加成 > 0">物防+{{ store.data.玩家.装备.防具.物防加成 }}</span>
        <span v-if="store.data.玩家.装备.防具.法防加成 > 0">法防+{{ store.data.玩家.装备.防具.法防加成 }}</span>
        <span v-if="store.data.玩家.装备.防具.HP加成 > 0">HP+{{ store.data.玩家.装备.防具.HP加成 }}</span>
      </div>
    </div>
    <div v-else class="empty-equip">未装备防具</div>

    <div class="section-head">饰品</div>
    <div v-if="!_.isEmpty(store.data.玩家.装备.饰品)" class="accessory-list">
      <div v-for="(acc, index) in store.data.玩家.装备.饰品" :key="index" class="equipment-card accessory">
        <div class="equip-header">
          <span class="equip-name">{{ acc.名称 }}</span>
        </div>
        <div class="equip-effect">{{ acc.效果 }}</div>
      </div>
    </div>
    <div v-else class="empty-equip">未装备饰品</div>

    <div class="section-head">血脉</div>
    <div v-if="store.data.玩家.血脉 !== '无'" class="bloodline-card">
      <span class="bloodline-name">{{ store.data.玩家.血脉 }}</span>
    </div>
    <div v-else class="empty-equip">无血脉觉醒</div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();
</script>

<style lang="scss" scoped>
.equipment-card {
  border: 2px solid var(--c-granite);
  padding: 10px;
  background: #fff;
  box-shadow: 2px 2px 0 var(--c-ash-grey);
  margin-bottom: 8px;
}

.equipment-card.weapon {
  border-left: 4px solid #e74c3c;
}

.equipment-card.armor {
  border-left: 4px solid #3498db;
}

.equipment-card.accessory {
  border-left: 4px solid #9b59b6;
}

.equip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.equip-name {
  font-weight: bold;
  font-size: 1rem;
}

.equip-rank {
  background: var(--c-celadon);
  color: white;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.7rem;
}

.equip-stats {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--c-granite);
}

.equip-effect {
  font-size: 0.85rem;
  color: var(--c-grey-olive);
}

.accessory-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.bloodline-card {
  border: 2px solid #9b59b6;
  padding: 10px;
  background: #f3e5f5;
}

.bloodline-name {
  font-weight: bold;
  font-size: 1rem;
  color: #7b1fa2;
}

.empty-equip {
  text-align: center;
  color: var(--c-grey-olive);
  padding: 10px;
  font-style: italic;
  font-size: 0.85rem;
  border: 1px dashed var(--c-grey-olive);
  margin-bottom: 16px;
}

.section-head {
  font-size: 0.95rem;
  border-bottom: 3px solid var(--c-celadon);
  display: inline-block;
  margin-bottom: 8px;
  font-weight: bold;
}
</style>
