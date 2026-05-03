export interface NumericalConfig {
  difficultyMod: DifficultyMod
  levels: Record<string, LevelConfig>
  attributeModifiers: AttributeModifierEntry[]
  damageReduction: DamageReductionEntry[]
  checkRules: CheckRules
  combatRules: CombatRules
  skillRules: SkillRules
  equipmentRules: EquipmentRules
  statusEffectRules: StatusEffectRules
  economy: Economy
}

export interface LevelConfig {
  spv: number
  baseDC: number
  masteryBonus: number
  hpBase: number
  singleAttrMax: number
  totalAttrMin: number
  totalAttrMax: number | null
}

export interface DifficultyMod {
  normal: number
  hard: number
  extreme: number
}

export interface AttributeModifierEntry {
  rangeMin: number
  rangeMax: number | null
  modifier: number
  fallbackIncrement?: number
  fallbackStep?: number
}

export interface DamageReductionEntry {
  ratioMin: number
  ratioMax: number | null
  reduction: number
}

export interface CheckRules {
  critSuccessRoll: number
  critFailureRoll: number
  penaltyTriggerChance: number
  attrAdvantageCap: number
  escapeBaseDC: number
  escapeSurroundPerEnemy: number
}

export interface CombatRules {
  hpEnduranceMultiplier: number
  ddcBase: number
  critDamageMultiplier: number
  critRateBase: number
  critRateCharismaDivisor: number
  critRateCap: number
  erosionDamageRatio: number
  hpPenaltyMax: number
  hpPenaltyMin: number
  critHitDivisor: number
  minDamage: number
}

export interface SkillRules {
  spvMultiplierActive: number
  spvMultiplierPassive: number
  cooldownMin: number
  cooldownMax: number
  activeSkillTable: Record<string, ActiveSkillValues>
  passiveSkillTable: Record<string, PassiveSkillValues>
}

export interface ActiveSkillValues {
  physMagicDamage: number
  enduranceHeal: number
  intelligenceHeal: number
  lifesteal: number
  shield: number
}

export interface PassiveSkillValues {
  statBonus: number
  physMagicDamage: number
  physMagicDefense: number
  hpBonus: number
}

export interface EquipmentRules {
  spvMultiplierWeapon: number
  spvMultiplierArmor: number
  weaponTable: Record<string, WeaponValues>
  armorTable: Record<string, ArmorValues>
  accessoryTable: AccessoryValues[]
}

export interface WeaponValues {
  statBonus: number
  physMagicDamage: number
  wordCount: number
}

export interface ArmorValues {
  statBonus: number
  physMagicDefense: number
  hpBonus: number
  wordCount: number
}

export interface AccessoryValues {
  name: string
  level: string
  price: number
  description: string
}

export interface StatusEffectRules {
  stackingRules: string
  intensities: StatusIntensityLevels
}

export interface StatusIntensityLevels {
  weak: StatusIntensityDetail
  medium: StatusIntensityDetail
  strong: StatusIntensityDetail
}

export interface StatusIntensityDetail {
  dotHpPercent: number
  shieldHpPercent: number
  statBuffPercent: number
  damageDealtModPercent: number
  damageTakenModPercent: number
}

export interface Economy {
  taskRewards: TaskRewardTable
  promotionCosts: Record<string, number>
  exchangePrices: ExchangePriceTable
}

export interface TaskRewardTable {
  itemRarityRules: ItemRarityRules
  attrPointRewards: Record<string, TaskAttrRewards>
  exchangePointRewards: Record<string, TaskExchangeRewards>
}

export interface ItemRarityRules {
  mainQuest: string
  sideQuest: string
  hiddenQuest: string
}

export interface TaskAttrRewards {
  mainQuest: { min: number; max: number }
  sideQuest: { min: number; max: number }
  hiddenQuest: { min: number; max: number }
}

export interface TaskExchangeRewards {
  mainQuest: number
  sideQuest: number
  hiddenQuest: number
}

export interface ExchangePriceTable {
  equipment: Record<string, EquipmentPrices>
  skills: Record<string, SkillPrices>
  services: ServicePrices
}

export interface EquipmentPrices {
  attackGear: number
  defenseGear: number
  otherGear: number
  consumable: number
}

export interface SkillPrices {
  activeSkill: number
  passiveSkill: number
}

export interface ServicePrices {
  skillUpgrade: string
  equipmentEnhance: string
  releaseAccumulatedPoints: string
}
