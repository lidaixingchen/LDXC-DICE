<template>
  <div class="card">
    <WorldSection />

    <PlayerStatus />

    <TabNav v-model="active_tab" :tabs="tabs" />

    <div v-if="active_tab" class="content-area">
      <div v-if="active_tab === '任务'" class="tab-pane active">
        <QuestPanel />
      </div>
      <div v-else-if="active_tab === '物品'" class="tab-pane active">
        <InventoryPanel />
      </div>
      <div v-else-if="active_tab === '技能'" class="tab-pane active">
        <SkillPanel />
      </div>
      <div v-else-if="active_tab === '装备'" class="tab-pane active">
        <EquipmentPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import InventoryPanel from './components/InventoryPanel.vue';
import EquipmentPanel from './components/EquipmentPanel.vue';
import PlayerStatus from './components/PlayerStatus.vue';
import QuestPanel from './components/QuestPanel.vue';
import SkillPanel from './components/SkillPanel.vue';
import TabNav from './components/TabNav.vue';
import WorldSection from './components/WorldSection.vue';

const tabs = [
  { id: '任务', label: '任务' },
  { id: '物品', label: '物品' },
  { id: '技能', label: '技能' },
  { id: '装备', label: '装备' },
];

const active_tab = useLocalStorage<string | null>('status_bar:active_tab', null);
</script>

<style lang="scss" scoped>
.card {
  width: 100%;
  max-width: 720px;
  background-color: var(--c-mint-cream);
  border: 3px solid var(--c-granite);
  box-shadow: 5px 5px 0px rgba(60, 73, 63, 0.16);
  display: flex;
  flex-direction: column;
  font-family: var(--font-archive);
  color: var(--c-granite);
  font-size: 13px;
  line-height: 1.35;
  margin: 0 auto;
}

.content-area {
  padding: 12px;
  min-height: 0;
}

.tab-pane {
  display: none;
  animation: fadeEffect 0.4s;
}

.tab-pane.active {
  display: block;
}

@keyframes fadeEffect {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
