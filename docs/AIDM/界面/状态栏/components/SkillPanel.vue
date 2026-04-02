<template>
  <div>
    <div class="section-head">技能列表</div>
    <div v-if="!_.isEmpty(store.data.玩家.技能)" class="skill-grid">
      <div
        v-for="(skill, index) in store.data.玩家.技能"
        :key="index"
        class="skill-card"
        :class="{ 'on-cooldown': skill.当前冷却 > 0 }"
      >
        <div class="skill-header">
          <span class="skill-name">{{ skill.名称 }}</span>
          <span class="skill-rank">{{ skill.等级 }}</span>
          <span class="skill-type">{{ skill.类型 }}</span>
        </div>
        <div class="skill-effect">{{ skill.效果 }}</div>
        <div v-if="!_.isEmpty(skill.词条)" class="skill-tags">
          <span v-for="tag in skill.词条" :key="tag" class="skill-tag">{{ tag }}</span>
        </div>
        <div v-if="skill.类型 === '主动'" class="skill-cooldown">
          <span v-if="skill.当前冷却 > 0">冷却: {{ skill.当前冷却 }}/{{ skill.冷却 }}</span>
          <span v-else class="ready">就绪</span>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">尚未习得任何技能...</div>

    <div class="section-head">性格特征</div>
    <div v-if="!_.isEmpty(store.data.玩家.性格特征)" class="trait-list">
      <div v-for="(trait, index) in store.data.玩家.性格特征" :key="index" class="trait-item">
        <span class="trait-name">{{ trait.名称 }}</span>
        <span class="trait-effect">{{ trait.效果 }}</span>
      </div>
    </div>
    <div v-else class="empty-state">尚未确定性格特征...</div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();
</script>

<style lang="scss" scoped>
.skill-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.skill-card {
  border: 2px solid var(--c-granite);
  padding: 10px;
  background: #fff;
  box-shadow: 2px 2px 0 var(--c-ash-grey);
}

.skill-card.on-cooldown {
  opacity: 0.7;
  background: #f5f5f5;
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.skill-name {
  font-weight: bold;
  font-size: 1rem;
}

.skill-rank {
  background: var(--c-celadon);
  color: white;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.7rem;
}

.skill-type {
  background: var(--c-ash-grey);
  color: white;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.7rem;
}

.skill-effect {
  font-size: 0.85rem;
  color: var(--c-granite);
  margin-bottom: 6px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.skill-tag {
  background: var(--c-mint-cream);
  border: 1px solid var(--c-granite);
  padding: 1px 4px;
  font-size: 0.7rem;
}

.skill-cooldown {
  font-size: 0.8rem;
  color: var(--c-grey-olive);
}

.skill-cooldown .ready {
  color: #27ae60;
  font-weight: bold;
}

.trait-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trait-item {
  border: 1.5px solid var(--c-granite);
  padding: 8px;
  background: #fff;
}

.trait-name {
  font-weight: bold;
  display: block;
  margin-bottom: 2px;
}

.trait-effect {
  font-size: 0.85rem;
  color: var(--c-grey-olive);
}

.empty-state {
  text-align: center;
  color: var(--c-grey-olive);
  padding: 12px;
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
