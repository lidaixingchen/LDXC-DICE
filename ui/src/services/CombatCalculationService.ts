import { WorldConfigService } from './WorldConfigService'

export class CombatCalculationService {
  static computeAttributeModifier(attr: number): number {
    return WorldConfigService.getAttributeModifier(attr)
  }

  static computeDamageReduction(defense: number, attackPower: number): number {
    return WorldConfigService.getDamageReduction(defense, attackPower)
  }

  static computeBaseDamage(attackPower: number, defense: number): number {
    const rules = WorldConfigService.getCombatRules()
    const reduction = CombatCalculationService.computeDamageReduction(defense, attackPower)
    return Math.max(rules.minDamage, Math.floor(attackPower * (1 - reduction)))
  }

  static computeCritDamage(baseDamage: number): number {
    const rules = WorldConfigService.getCombatRules()
    return baseDamage * rules.critDamageMultiplier
  }

  static computeCritRate(charisma: number): number {
    const rules = WorldConfigService.getCombatRules()
    return Math.min(rules.critRateCap, rules.critRateBase + Math.floor(charisma / rules.critRateCharismaDivisor))
  }

  static isCritHit(rollValue: number, critRatePercent: number, didHit: boolean): boolean {
    if (!didHit) return false
    const rules = WorldConfigService.getCombatRules()
    const threshold = Math.floor(critRatePercent / rules.critHitDivisor)
    return rollValue <= threshold
  }

  static computeDDC(agiMod: number, dodgeBonus: number): number {
    const rules = WorldConfigService.getCombatRules()
    return rules.ddcBase + agiMod + dodgeBonus
  }

  static computeMaxHP(endurance: number, level: string, hpBonus: number): number {
    const rules = WorldConfigService.getCombatRules()
    const hpBase = WorldConfigService.getHpBase(level)
    return Math.max(1, endurance * rules.hpEnduranceMultiplier + hpBase + hpBonus)
  }

  static computeErosionDamage(maxHP: number): number {
    const rules = WorldConfigService.getCombatRules()
    return Math.max(1, Math.floor(maxHP * rules.erosionDamageRatio))
  }

  static computeHPPenalty(target: number, finalValue: number): number {
    const rules = WorldConfigService.getCombatRules()
    return Math.max(rules.hpPenaltyMin, Math.min(rules.hpPenaltyMax, target - finalValue))
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
  }

  static findAttrValue(attrs: Record<string, number>, keys: string[]): number | null {
    for (const key of keys) {
      if (attrs[key] !== undefined) return attrs[key]
    }
    return null
  }

  static deriveCombatStats(
    attrs: Record<string, number>,
    level: string,
    equipment: { physDmg: number; magicDmg: number; physDef: number; magicDef: number; hpBonus: number; dodgeBonus: number },
  ): { physAtk: number; magicAtk: number; physDef: number; magicDef: number; hp: number; ddc: number; critRate: number } {
    const str = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.strength) || 0
    const agi = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.agility) || 0
    const end = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.endurance) || 0
    const intVal = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.intelligence) || 0
    const per = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.perception) || 0
    const cha = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.charisma) || 0

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
    }
  }
}
