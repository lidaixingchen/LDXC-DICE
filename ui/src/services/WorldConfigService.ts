import numericalConfig from '@core/config/numerical-config.json'
import type {
  NumericalConfig,
  LevelConfig,
  DifficultyMod,
  AttributeModifierEntry,
  DamageReductionEntry,
  CheckRules,
  CombatRules,
} from '@core/config/numerical-config'

export type { LevelConfig, DifficultyMod, CheckRules, CombatRules }

export class WorldConfigService {
  private static config: NumericalConfig = numericalConfig

  static get CONFIG(): Record<string, LevelConfig> {
    return WorldConfigService.config.levels
  }

  static readonly LEVELS = Object.keys(numericalConfig.levels)

  static getLevelConfig(level: string): LevelConfig | undefined {
    return WorldConfigService.config.levels[level]
  }

  static getBaseDC(level: string): number {
    return WorldConfigService.config.levels[level]?.baseDC ?? 10
  }

  static getMasteryBonus(level: string): number {
    return WorldConfigService.config.levels[level]?.masteryBonus ?? 0
  }

  static getHpBase(level: string): number {
    return WorldConfigService.config.levels[level]?.hpBase ?? 15
  }

  static getSPV(level: string): number {
    return WorldConfigService.config.levels[level]?.spv ?? 5
  }

  static getSingleAttrMax(level: string): number {
    return WorldConfigService.config.levels[level]?.singleAttrMax ?? 30
  }

  static getDifficultyMod(difficulty: string): number {
    return (WorldConfigService.config.difficultyMod as unknown as Record<string, number>)[difficulty] ?? 0
  }

  static getFinalDC(level: string, difficulty: string): number {
    return WorldConfigService.getBaseDC(level) + WorldConfigService.getDifficultyMod(difficulty)
  }

  static getCheckRules(): CheckRules {
    return WorldConfigService.config.checkRules
  }

  static getCombatRules(): CombatRules {
    return WorldConfigService.config.combatRules
  }

  static getAttributeModifier(attr: number): number {
    const entries = WorldConfigService.config.attributeModifiers
    for (const entry of entries) {
      const { rangeMin, rangeMax, modifier, fallbackIncrement, fallbackStep } = entry
      if (rangeMax === null) {
        if (fallbackIncrement != null && fallbackStep != null) {
          return modifier + Math.floor((attr - rangeMin) / fallbackStep) * fallbackIncrement
        }
        return modifier
      }
      if (attr >= rangeMin && attr <= rangeMax) {
        return modifier
      }
    }
    return 0
  }

  static getDamageReduction(defense: number, attackPower: number): number {
    if (attackPower <= 0) return 0
    const ratio = defense / attackPower
    const entries = WorldConfigService.config.damageReduction
    for (const entry of entries) {
      const { ratioMin, ratioMax, reduction } = entry
      if (ratioMax === null) return reduction
      if (ratio >= ratioMin && ratio < ratioMax) return reduction
    }
    return 0
  }
}
