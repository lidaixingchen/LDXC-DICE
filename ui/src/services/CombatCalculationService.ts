import { WorldConfigService } from './WorldConfigService';

export class CombatCalculationService {
  static computeAttributeModifier(attr: number): number {
    if (attr <= 15) return 0;
    if (attr <= 25) return 1;
    if (attr <= 35) return 2;
    if (attr <= 45) return 3;
    if (attr <= 55) return 4;
    if (attr <= 65) return 5;
    if (attr <= 75) return 6;
    if (attr <= 85) return 7;
    if (attr <= 95) return 8;
    if (attr <= 105) return 9;
    if (attr <= 120) return 10;
    if (attr <= 140) return 11;
    if (attr <= 160) return 12;
    if (attr <= 185) return 13;
    if (attr <= 210) return 14;
    if (attr <= 240) return 15;
    if (attr <= 270) return 16;
    if (attr <= 305) return 17;
    if (attr <= 340) return 18;
    if (attr <= 380) return 19;
    return 19 + Math.floor((attr - 381) / 40);
  }

  static computeDamageReduction(defense: number, attackPower: number): number {
    if (attackPower <= 0) return 0;
    const ratio = defense / attackPower;
    if (ratio < 0.5) return 0;
    if (ratio < 0.8) return 0.2;
    if (ratio < 1) return 0.4;
    if (ratio < 1.5) return 0.6;
    return 0.8;
  }

  static computeBaseDamage(attackPower: number, defense: number): number {
    const reduction = CombatCalculationService.computeDamageReduction(defense, attackPower);
    return Math.max(1, Math.floor(attackPower * (1 - reduction)));
  }

  static computeCritDamage(baseDamage: number): number {
    return baseDamage * 2;
  }

  static computeCritRate(charisma: number): number {
    return Math.min(50, 5 + Math.floor(charisma / 2));
  }

  static isCritHit(rollValue: number, critRatePercent: number, didHit: boolean): boolean {
    if (!didHit) return false;
    const threshold = Math.floor(critRatePercent / 5);
    return rollValue <= threshold;
  }

  static computeDDC(agiMod: number, dodgeBonus: number): number {
    return 10 + agiMod + dodgeBonus;
  }

  static computeMaxHP(endurance: number, level: string, hpBonus: number): number {
    const hpBase = WorldConfigService.getHpBase(level);
    return Math.max(1, endurance * 5 + hpBase + hpBonus);
  }

  static computeErosionDamage(maxHP: number): number {
    return Math.max(1, Math.floor(maxHP * 0.05));
  }

  static computeHPPenalty(target: number, finalValue: number): number {
    return Math.max(1, Math.min(10, target - finalValue));
  }

  static readonly ATTR_MAPPING: Record<string, string[]> = {
    strength: ['力量', 'STR', 'Str', 'str', '力量值', '体力', '物理攻击力'],
    agility: ['敏捷', 'AGI', 'Agi', 'agi', '敏捷值', '速度', 'SPD', 'Spd', '闪避'],
    endurance: ['体质', 'END', 'End', 'end', '耐力', '耐力值', '体力上限', 'HP', 'Hp', 'hp', '生命值', '血量', '物防', '防御力'],
    intelligence: ['智力', 'INT', 'Int', 'int', '智力值', '智慧', '魔力', '法攻', '法术攻击力'],
    perception: ['感知', 'PER', 'Per', 'per', '感知值', '洞察', '察觉', '法防', '法术防御'],
    charisma: ['魅力', 'CHA', 'Cha', 'cha', '魅力值', '魅力属性', 'CHR', 'Chr', '暴击率'],
    attackPower: ['攻击力', '攻击', 'ATK', 'Atk', 'atk', '物攻', '物理攻击', '法攻', '法术攻击'],
    defense: ['防御力', '防御', 'DEF', 'Def', 'def', '物防', '物理防御', '法防', '法术防御', '护甲', '防御值'],
  };

  static findAttrValue(attrs: Record<string, number>, keys: string[]): number | null {
    for (const key of keys) {
      if (attrs[key] !== undefined) return attrs[key];
    }
    return null;
  }

  static deriveCombatStats(
    attrs: Record<string, number>,
    level: string,
    equipment: { physDmg: number; magicDmg: number; physDef: number; magicDef: number; hpBonus: number; dodgeBonus: number },
  ): { physAtk: number; magicAtk: number; physDef: number; magicDef: number; hp: number; ddc: number; critRate: number } {
    const str = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.strength) || 0;
    const agi = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.agility) || 0;
    const end = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.endurance) || 0;
    const intVal = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.intelligence) || 0;
    const per = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.perception) || 0;
    const cha = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.charisma) || 0;

    return {
      physAtk: str + equipment.physDmg,
      magicAtk: intVal + equipment.magicDmg,
      physDef: end + equipment.physDef,
      magicDef: per + equipment.magicDef,
      hp: CombatCalculationService.computeMaxHP(end, level, equipment.hpBonus),
      ddc: CombatCalculationService.computeDDC(
        Math.max(CombatCalculationService.computeAttributeModifier(agi), CombatCalculationService.computeAttributeModifier(per)),
        equipment.dodgeBonus,
      ),
      critRate: CombatCalculationService.computeCritRate(cha),
    };
  }
}
