export interface StatusEffect {
  id: number;
  name: string;
  type: 'buff' | 'debuff' | 'dot' | 'control' | 'shield';
  intensity: 'weak' | 'medium' | 'strong';
  value: number;
  remainingRounds: number;
  totalRounds?: number;
  description: string;
}

export interface CombatState {
  active: boolean;
  round: number;
  enemyName: string;
  enemyMaxHP: number;
  enemyCurrentHP: number;
  playerMaxHP: number;
  playerCurrentHP: number;
  playerShield: number;
}

export interface EquipmentSlot {
  name: string;
  physDmg: number;
  magicDmg: number;
  physDef: number;
  magicDef: number;
  hpBonus: number;
  dodgeBonus: number;
}

export interface SaveData {
  playerName: string;
  level: string;
  attrs: Record<string, number>;
  combat: CombatState;
  equipment: EquipmentSlot;
  statuses: StatusEffect[];
  worldName: string;
  location: string;
}

export interface SaveSlot {
  id: number;
  timestamp: string;
  data: SaveData;
}

const SAVE_KEY = 'aidm_save_slots';

export class SaveService {
  static loadSaveSlots(): SaveSlot[] {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch { /* ignore */ }
    return [];
  }

  static persistSaveSlots(slots: SaveSlot[]): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(slots));
  }

  static saveGame(
    slotId: number,
    slots: SaveSlot[],
    data: SaveData,
  ): SaveSlot[] {
    const existingIdx = slots.findIndex(s => s.id === slotId);
    const slot: SaveSlot = {
      id: slotId,
      timestamp: new Date().toLocaleString(),
      data,
    };

    const newSlots = [...slots];
    if (existingIdx >= 0) {
      newSlots[existingIdx] = slot;
    } else {
      newSlots.push(slot);
    }

    SaveService.persistSaveSlots(newSlots);
    return newSlots;
  }

  static loadGame(slots: SaveSlot[], slotId: number): SaveData | null {
    const slot = slots.find(s => s.id === slotId);
    return slot ? slot.data : null;
  }

  static exportSaveText(
    playerName: string,
    level: string,
    combat: CombatState,
    equipment: EquipmentSlot,
    statuses: StatusEffect[],
    derivedStats: { physAtk: number; magicAtk: number; physDef: number; magicDef: number; hp: number; ddc: number; critRate: number },
  ): string {
    return `═════════════════════════════════
【轮回者存档】
═════════════════════════════════

【角色信息】
名称：${playerName}
等级：${level}

【战斗属性】
HP：${combat.playerCurrentHP}/${combat.playerMaxHP}
护盾：${combat.playerShield}
物攻：${derivedStats.physAtk + equipment.physDmg} | 法攻：${derivedStats.magicAtk + equipment.magicDmg}
物防：${derivedStats.physDef + equipment.physDef} | 法防：${derivedStats.magicDef + equipment.magicDef}
DDC：${derivedStats.ddc} | 暴击率：${derivedStats.critRate}%

${statuses.length > 0 ? `【状态效果】\n${statuses.map(s => `・${s.name}(${s.type}) ${s.intensity} 剩余${s.remainingRounds}回合`).join('\n')}` : ''}

${combat.active ? `【战斗中】第${combat.round}回合 | 敌人:${combat.enemyName} HP:${combat.enemyCurrentHP}/${combat.enemyMaxHP}` : ''}
═════════════════════════════════`;
  }

  static importSave(text: string): boolean {
    if (!text.includes('轮回者存档')) {
      return false;
    }
    return true;
  }
}
