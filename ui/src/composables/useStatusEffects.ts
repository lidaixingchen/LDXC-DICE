import { ref, type Ref } from 'vue';
import type { StatusEffect } from '../services';

let statusIdCounter = 0;
const activeStatuses = ref<StatusEffect[]>([]);

export function useStatusEffects() {

  function addStatus(
    name: string,
    type: StatusEffect['type'],
    intensity: StatusEffect['intensity'],
    value: number,
    remainingRounds: number,
  ): void {
    statusIdCounter++;
    activeStatuses.value.push({
      id: statusIdCounter,
      name,
      type,
      intensity,
      value,
      remainingRounds,
      totalRounds: remainingRounds,
      description: '',
    });
  }

  function removeStatus(id: number): void {
    activeStatuses.value = activeStatuses.value.filter(s => s.id !== id);
  }

  function decayStatuses(): void {
    activeStatuses.value = activeStatuses.value
      .map(s => ({ ...s, remainingRounds: s.remainingRounds - 1 }))
      .filter(s => s.remainingRounds > 0);
  }

  function clearAllStatuses(): void {
    activeStatuses.value = [];
  }

  function getStatusEnvModifier(): { advantage: number; disadvantage: number } {
    let advantage = 0;
    let disadvantage = 0;

    for (const s of activeStatuses.value) {
      if (s.type === 'buff') advantage += s.intensity === 'weak' ? 1 : (s.intensity === 'medium' ? 2 : 3);
      if (s.type === 'debuff') disadvantage += s.intensity === 'weak' ? 1 : (s.intensity === 'medium' ? 2 : 3);
    }

    return { advantage, disadvantage };
  }

  return {
    activeStatuses,
    addStatus,
    removeStatus,
    decayStatuses,
    clearAllStatuses,
    getStatusEnvModifier,
  };
}
