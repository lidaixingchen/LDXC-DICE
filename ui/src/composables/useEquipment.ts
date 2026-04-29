import { ref, type Ref } from 'vue';
import type { EquipmentSlot } from '../services';

const DEFAULT_EQUIPMENT: EquipmentSlot = {
  name: '',
  physDmg: 0,
  magicDmg: 0,
  physDef: 0,
  magicDef: 0,
  hpBonus: 0,
  dodgeBonus: 0,
};

export function useEquipment(initialValue?: EquipmentSlot) {
  const equipment = ref<EquipmentSlot>({ ...(initialValue || DEFAULT_EQUIPMENT) }) as Ref<EquipmentSlot>;

  function updateEquipment(patch: Partial<EquipmentSlot>): void {
    equipment.value = { ...equipment.value, ...patch };
  }

  function resetEquipment(): void {
    equipment.value = { ...DEFAULT_EQUIPMENT };
  }

  return {
    equipment,
    updateEquipment,
    resetEquipment,
  };
}
