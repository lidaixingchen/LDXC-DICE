<template>
  <div class="quest-panel">
    <div class="section-head">主线任务</div>
    <div v-if="store.data.任务.主线.名称" class="main-quest">
      <div class="quest-title">{{ store.data.任务.主线.名称 }}</div>
      <div class="quest-desc">{{ store.data.任务.主线.描述 }}</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: store.data.任务.主线.完成度 + '%' }"></div>
      </div>
      <div class="progress-text">完成度: {{ store.data.任务.主线.完成度 }}%</div>
    </div>
    <div v-else class="empty-quest">暂无主线任务</div>

    <div class="section-head">支线任务</div>
    <div v-if="!_.isEmpty(store.data.任务.支线)" class="side-quests">
      <div v-for="(quest, index) in store.data.任务.支线" :key="index" class="side-quest-item">
        <div class="quest-title">{{ quest.名称 }}</div>
        <div class="quest-desc">{{ quest.描述 }}</div>
        <div class="progress-bar small">
          <div class="progress-fill" :style="{ width: quest.完成度 + '%' }"></div>
        </div>
        <div class="progress-text small">{{ quest.完成度 }}%</div>
      </div>
    </div>
    <div v-else class="empty-quest">暂无支线任务</div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { useDataStore } from '../store';

const store = useDataStore();
</script>

<style lang="scss" scoped>
.quest-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-head {
  font-size: 0.95rem;
  border-bottom: 3px solid var(--c-celadon);
  display: inline-block;
  margin-bottom: 8px;
  font-weight: bold;
}

.main-quest {
  border: 2px solid var(--c-granite);
  padding: 10px;
  background: #fff;
  box-shadow: 3px 3px 0 var(--c-ash-grey);
}

.quest-title {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 4px;
}

.quest-desc {
  font-size: 0.85rem;
  color: var(--c-grey-olive);
  margin-bottom: 8px;
}

.progress-bar {
  height: 14px;
  border: 1.5px solid var(--c-granite);
  background: var(--c-mint-cream);
  position: relative;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-bar.small {
  height: 10px;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--c-celadon);
  transition: width 0.25s ease;
}

.progress-text {
  font-size: 0.8rem;
  text-align: right;
}

.progress-text.small {
  font-size: 0.75rem;
}

.side-quests {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.side-quest-item {
  border: 1.5px solid var(--c-granite);
  padding: 8px;
  background: #fff;
}

.empty-quest {
  text-align: center;
  color: var(--c-grey-olive);
  padding: 12px;
  font-style: italic;
  font-size: 0.85rem;
}
</style>
