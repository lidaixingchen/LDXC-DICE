import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const projectDir = path.resolve(rootDir, '..')
const aidmDir = path.resolve(projectDir, 'docs', 'AIDM', '世界书')

interface SyncConfig {
  difficultyMod: { normal: number; hard: number; extreme: number }
  levels: Record<string, LevelConfig>
  attributeModifiers: AttributeModifierEntry[]
  damageReduction: DamageReductionEntry[]
  checkRules: Record<string, number>
  combatRules: Record<string, number>
  skillRules: SkillRules
  equipmentRules: EquipmentRules
  statusEffectRules: StatusEffectRules
  economy: Economy
}

interface LevelConfig { spv: number; baseDC: number; masteryBonus: number; hpBase: number; singleAttrMax: number; totalAttrMin: number; totalAttrMax: number | null }
interface AttributeModifierEntry { rangeMin: number; rangeMax: number | null; modifier: number; fallbackIncrement?: number; fallbackStep?: number }
interface DamageReductionEntry { ratioMin: number; ratioMax: number | null; reduction: number }
interface SkillRules { spvMultiplierActive: number; spvMultiplierPassive: number; cooldownMin: number; cooldownMax: number; activeSkillTable: Record<string, Record<string, number>>; passiveSkillTable: Record<string, Record<string, number>> }
interface EquipmentRules { spvMultiplierWeapon: number; spvMultiplierArmor: number; weaponTable: Record<string, Record<string, number>>; armorTable: Record<string, Record<string, number>>; accessoryTable: Record<string, unknown>[] }
interface StatusEffectRules { stackingRules: string; intensities: Record<string, Record<string, number>> }
interface Economy { taskRewards: TaskRewards; promotionCosts: Record<string, number>; exchangePrices: ExchangePrices }
interface TaskRewards { itemRarityRules: Record<string, string>; attrPointRewards: Record<string, Record<string, { min: number; max: number }>>; exchangePointRewards: Record<string, Record<string, number>> }
interface ExchangePrices { equipment: Record<string, Record<string, number>>; skills: Record<string, Record<string, number>>; services: Record<string, string> }

function loadYaml(relativePath: string): Record<string, unknown> {
  const fullPath = path.resolve(aidmDir, relativePath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  const cleaned = content.replace(/^---\n/, '').replace(/\n---$/, '')
  return yaml.load(cleaned) as Record<string, unknown>
}

function parseLevelConfigs(): Record<string, LevelConfig> {
  const dcTable = loadYaml('04-检定系统/DC表.yaml') as { 'DC表': { '基础DC': Record<string, number> } }
  const hpBase = loadYaml('01-数值参考/战斗数值/HP基础值.yaml') as { 'HP基础值': { '各等级HP基础值': Record<string, number> } }
  const masteryTable = loadYaml('00-核心定义/掌握加成表.yaml') as { '掌握加成表': { '对照表': Record<string, string> } }
  const levelSystem = loadYaml('00-核心定义/等级体系.yaml') as { '人物等级体系': { '单项属性上限': Record<string, number>; '等级划分': { '对照表': Record<string, string> } } }
  const spvSystem = loadYaml('00-核心定义/SPV体系.yaml') as { 'SPV体系': { '等级阶位与SPV对照': Record<string, number> } }

  const levels: Record<string, LevelConfig> = {}
  const levelOrder = ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级']

  for (const level of levelOrder) {
    const dc = Number(dcTable['DC表']['基础DC'][level]) || 0
    const hp = Number(hpBase['HP基础值']['各等级HP基础值'][level]) || 0
    const masteryRaw = masteryTable['掌握加成表']['对照表'][level] || '+0'
    const mastery = parseInt(masteryRaw.replace(/[+]/g, ''), 10) || 0
    const attrMax = Number(levelSystem['人物等级体系']['单项属性上限'][level]) || 30
    const spv = Number(spvSystem['SPV体系']['等级阶位与SPV对照'][level]) || 5
    const attrRangeRaw = levelSystem['人物等级体系']['等级划分']['对照表'][level] || '0-0'
    const [attrMin, attrMaxStr] = attrRangeRaw.split('-')
    const totalMin = parseInt(attrMin, 10) || 0
    const totalMax = attrMaxStr === '+' ? null : (parseInt(attrMaxStr, 10) || null)

    levels[level] = { spv, baseDC: dc, masteryBonus: mastery, hpBase: hp, singleAttrMax: attrMax, totalAttrMin: totalMin, totalAttrMax: totalMax }
  }
  return levels
}

function parseAttributeModifiers(): AttributeModifierEntry[] {
  const attrTable = loadYaml('00-核心定义/属性加成表.yaml') as { '属性加成表': { '对照表': Record<string, string> } }
  const entries: AttributeModifierEntry[] = []
  for (const [key, value] of Object.entries(attrTable['属性加成表']['对照表'])) {
    if (key === '381+') {
      entries.push({ rangeMin: 381, rangeMax: null, modifier: 19, fallbackIncrement: 1, fallbackStep: 40 })
      continue
    }
    const [min, max] = key.split('-').map(Number)
    const mod = parseInt(value.replace(/[+]/g, ''), 10) || 0
    entries.push({ rangeMin: min, rangeMax: max, modifier: mod })
  }
  entries.sort((a, b) => a.rangeMin - b.rangeMin)
  return entries
}

function parseDamageReduction(): DamageReductionEntry[] {
  return [
    { ratioMin: 0, ratioMax: 0.5, reduction: 0 },
    { ratioMin: 0.5, ratioMax: 0.8, reduction: 0.2 },
    { ratioMin: 0.8, ratioMax: 1, reduction: 0.4 },
    { ratioMin: 1, ratioMax: 1.5, reduction: 0.6 },
    { ratioMin: 1.5, ratioMax: null, reduction: 0.8 },
  ]
}

function parseSkillRules(): SkillRules {
  const activeYaml = loadYaml('01-数值参考/技能数值/主动技能.yaml') as { '主动技能数值': { '说明': string; '伤害与治疗数值': Record<string, Record<string, string>>; '冷却时间': string; '消耗': string } }
  const passiveYaml = loadYaml('01-数值参考/技能数值/被动技能.yaml') as { '被动技能数值': { '说明': string; '属性加成数值': Record<string, Record<string, string>> } }

  const activeTable: Record<string, Record<string, number>> = {}
  for (const [level, vals] of Object.entries(activeYaml['主动技能数值']['伤害与治疗数值'])) {
    activeTable[level] = {
      physMagicDamage: parseInt(String(vals['物伤法伤']).replace(/[+]/g, ''), 10) || 0,
      enduranceHeal: parseInt(String(vals['体质治疗']).replace(/[+]/g, ''), 10) || 0,
      intelligenceHeal: parseInt(String(vals['智力治疗']).replace(/[+]/g, ''), 10) || 0,
      lifesteal: parseInt(String(vals['吸血']).replace(/[+]/g, ''), 10) || 0,
      shield: parseInt(String(vals['护盾']).replace(/[+]/g, ''), 10) || 0,
    }
  }

  const passiveTable: Record<string, Record<string, number>> = {}
  for (const [level, vals] of Object.entries(passiveYaml['被动技能数值']['属性加成数值'])) {
    passiveTable[level] = {
      statBonus: parseInt(String(vals['属性']).replace(/[+]/g, ''), 10) || 0,
      physMagicDamage: parseInt(String(vals['物伤法伤']).replace(/[+]/g, ''), 10) || 0,
      physMagicDefense: parseInt(String(vals['物防法防']).replace(/[+]/g, ''), 10) || 0,
      hpBonus: parseInt(String(vals['HP加成']).replace(/[+]/g, ''), 10) || 0,
    }
  }

  return {
    spvMultiplierActive: 2.0,
    spvMultiplierPassive: 0.4,
    cooldownMin: 1,
    cooldownMax: 3,
    activeSkillTable: activeTable,
    passiveSkillTable: passiveTable,
  }
}

function parseEquipmentRules(): EquipmentRules {
  const weaponYaml = loadYaml('01-数值参考/装备数值/武器数值.yaml') as { '武器数值': { '说明': string; '攻击装备数值': Record<string, Record<string, string>>; '词条数量': Record<string, string> } }
  const armorYaml = loadYaml('01-数值参考/装备数值/防具数值.yaml') as { '防具数值': { '说明': string; '防御装备数值': Record<string, Record<string, string>>; '词条数量': Record<string, string> } }

  const weaponTable: Record<string, Record<string, number>> = {}
  for (const [level, vals] of Object.entries(weaponYaml['武器数值']['攻击装备数值'])) {
    const wc = weaponYaml['武器数值']['词条数量'][level] || '1项'
    weaponTable[level] = {
      statBonus: parseInt(String(vals['属性加成']).replace(/[+]/g, ''), 10) || 0,
      physMagicDamage: parseInt(String(vals['物伤法伤']).replace(/[+]/g, ''), 10) || 0,
      wordCount: parseInt(wc.replace(/项/, ''), 10) || 1,
    }
  }

  const armorTable: Record<string, Record<string, number>> = {}
  for (const [level, vals] of Object.entries(armorYaml['防具数值']['防御装备数值'])) {
    const wc = armorYaml['防具数值']['词条数量'][level] || '1项'
    armorTable[level] = {
      statBonus: parseInt(String(vals['属性加成']).replace(/[+]/g, ''), 10) || 0,
      physMagicDefense: parseInt(String(vals['物防法防']).replace(/[+]/g, ''), 10) || 0,
      hpBonus: parseInt(String(vals['HP加成']).replace(/[+]/g, ''), 10) || 0,
      wordCount: parseInt(wc.replace(/项/, ''), 10) || 1,
    }
  }

  const accessoryTable: Record<string, unknown>[] = [
    { name: '力量戒指', level: 'F级', price: 50, description: '力量+1' },
    { name: '敏捷护符', level: 'E级', price: 100, description: '敏捷+2' },
    { name: '世界锚点', level: 'B级', price: 400, description: '死亡时保留进度并满血复活（一次性）' },
    { name: '替身人偶', level: 'C级', price: 275, description: '死亡时代替承受惩罚，无惩罚脱离（一次性）' },
  ]

  return { spvMultiplierWeapon: 0.6, spvMultiplierArmor: 0.6, weaponTable, armorTable, accessoryTable }
}

function parseStatusEffectRules(): StatusEffectRules {
  const statusYaml = loadYaml('03-战斗系统/状态效果/状态规则.yaml') as { '状态规则': { '叠加规则': Record<string, string>; '状态强度等级': Record<string, Record<string, string>> } }

  const stacking: string[] = []
  for (const [, v] of Object.entries(statusYaml['状态规则']['叠加规则'])) {
    stacking.push(String(v))
  }

  const intensityKeyMap: Record<string, string> = { '弱效': 'weak', '中效': 'medium', '强效': 'strong' }

  const intensities: Record<string, Record<string, number>> = {}
  for (const [intensity, vals] of Object.entries(statusYaml['状态规则']['状态强度等级'])) {
    const key = intensityKeyMap[intensity] || intensity
    const dotRaw = String(vals['持续伤害']).replace('%最大HP/回合', '')
    const shieldRaw = String(vals['护盾值']).replace('%施法者最大HP', '')
    const statRaw = String(vals['属性增益']).replace('%', '')
    const ddRaw = String(vals['伤害增减']).split('/')

    intensities[key] = {
      dotHpPercent: parseInt(dotRaw, 10) || 0,
      shieldHpPercent: parseInt(shieldRaw, 10) || 0,
      statBuffPercent: parseInt(statRaw.replace(/[+]/g, ''), 10) || 0,
      damageDealtModPercent: parseInt(ddRaw[0].replace(/[+]/g, ''), 10) || 0,
      damageTakenModPercent: -(parseInt(ddRaw[1].replace(/[+%-]/g, ''), 10) || 0),
    }
  }

  return { stackingRules: stacking.join('；'), intensities }
}

function parseEconomy(): Economy {
  const rewardYaml = loadYaml('01-数值参考/经济数值/任务奖励.yaml') as { '任务奖励': { '物品奖励': Record<string, string>; '属性点奖励': Record<string, Record<string, string>>; '兑换点奖励': Record<string, Record<string, number>> } }
  const promoYaml = (loadYaml('01-数值参考/经济数值/晋级消耗.yaml') as Record<string, unknown>)['晋级消耗'] as Record<string, number>
  const priceYaml = loadYaml('01-数值参考/经济数值/兑换价格.yaml') as { '兑换价格': { '装备价格': Record<string, Record<string, number>>; '技能价格': Record<string, Record<string, number>>; '服务价格': Record<string, string> } }

  const questKeyMap: Record<string, string> = { '主线任务': 'mainQuest', '支线任务': 'sideQuest', '隐藏任务': 'hiddenQuest' }

  const attrRewards: Record<string, Record<string, { min: number; max: number }>> = {}
  for (const [level, quests] of Object.entries(rewardYaml['任务奖励']['属性点奖励'])) {
    const q: Record<string, { min: number; max: number }> = {}
    for (const [qType, range] of Object.entries(quests)) {
      const key = questKeyMap[qType] || qType
      const [min, max] = String(range).replace('点', '').split('-').map(Number)
      q[key] = { min: min || 0, max: max || 0 }
    }
    attrRewards[level] = q
  }

  const exchRewards: Record<string, Record<string, number>> = {}
  for (const [level, quests] of Object.entries(rewardYaml['任务奖励']['兑换点奖励'])) {
    const q: Record<string, number> = {}
    for (const [qType, val] of Object.entries(quests)) {
      const key = questKeyMap[qType] || qType
      q[key] = val
    }
    exchRewards[level] = q
  }

  const promoCosts: Record<string, number> = {}
  for (const [key, val] of Object.entries(promoYaml)) {
    if (key.startsWith('晋升')) promoCosts[key] = Number(val) || 0
  }

  return {
    taskRewards: {
      itemRarityRules: {
        mainQuest: String(rewardYaml['任务奖励']['物品奖励']['主线任务']['品级'] || ''),
        sideQuest: String(rewardYaml['任务奖励']['物品奖励']['支线任务品级投掷规则'] || ''),
        hiddenQuest: String(rewardYaml['任务奖励']['物品奖励']['隐藏任务品级投掷规则'] || ''),
      },
      attrPointRewards: attrRewards,
      exchangePointRewards: exchRewards,
    },
    promotionCosts: promoCosts,
    exchangePrices: {
      equipment: mapEquipmentPrices(priceYaml['兑换价格']['装备价格']),
      skills: mapSkillPrices(priceYaml['兑换价格']['技能价格']),
      services: mapServicePrices(priceYaml['兑换价格']['服务价格']),
    },
  }
}

const equipPriceMap: Record<string, string> = { '攻击装备': 'attackGear', '防御装备': 'defenseGear', '其他装备': 'otherGear', '道具': 'consumable' }

function mapEquipmentPrices(yamlPrices: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const [level, items] of Object.entries(yamlPrices)) {
    const mapped: Record<string, number> = {}
    for (const [key, val] of Object.entries(items)) {
      mapped[equipPriceMap[key] || key] = val
    }
    result[level] = mapped
  }
  return result
}

const skillPriceMap: Record<string, string> = { '主动技能': 'activeSkill', '被动技能': 'passiveSkill' }

function mapSkillPrices(yamlPrices: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const [level, items] of Object.entries(yamlPrices)) {
    const mapped: Record<string, number> = {}
    for (const [key, val] of Object.entries(items)) {
      mapped[skillPriceMap[key] || key] = val
    }
    result[level] = mapped
  }
  return result
}

const servicePriceMap: Record<string, string> = { '技能升级': 'skillUpgrade', '装备强化': 'equipmentEnhance', '沉淀点释放': 'releaseAccumulatedPoints' }

function mapServicePrices(yamlPrices: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(yamlPrices)) {
    result[servicePriceMap[key] || key] = val
  }
  return result
}

function buildConfig(): SyncConfig {
  return {
    difficultyMod: { normal: 0, hard: 3, extreme: 6 },
    levels: parseLevelConfigs(),
    attributeModifiers: parseAttributeModifiers(),
    damageReduction: parseDamageReduction(),
    checkRules: { critSuccessRoll: 20, critFailureRoll: 1, penaltyTriggerChance: 0.5, attrAdvantageCap: 3, escapeBaseDC: 10, escapeSurroundPerEnemy: 2 },
    combatRules: { hpEnduranceMultiplier: 5, ddcBase: 10, critDamageMultiplier: 2, critRateBase: 5, critRateCharismaDivisor: 2, critRateCap: 50, erosionDamageRatio: 0.05, hpPenaltyMax: 10, hpPenaltyMin: 1, critHitDivisor: 5, minDamage: 1 },
    skillRules: parseSkillRules(),
    equipmentRules: parseEquipmentRules(),
    statusEffectRules: parseStatusEffectRules(),
    economy: parseEconomy(),
  }
}

function main() {
  const config = buildConfig()
  const outputPath = path.resolve(projectDir, 'core', 'config', 'numerical-config.json')
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8')
  console.log(`[sync-config] 已生成: ${outputPath}`)
  console.log(`[sync-config] 等级数: ${Object.keys(config.levels).length}`)
  console.log(`[sync-config] 属性加成阶梯: ${config.attributeModifiers.length}`)
  console.log(`[sync-config] 主动技能等级: ${Object.keys(config.skillRules.activeSkillTable).length}`)
  console.log(`[sync-config] 被动技能等级: ${Object.keys(config.skillRules.passiveSkillTable).length}`)
  console.log(`[sync-config] 武器等级: ${Object.keys(config.equipmentRules.weaponTable).length}`)
  console.log(`[sync-config] 防具等级: ${Object.keys(config.equipmentRules.armorTable).length}`)
  console.log(`[sync-config] 状态强度: ${Object.keys(config.statusEffectRules.intensities).length}`)
  console.log(`[sync-config] 经济系统: 任务奖励/${Object.keys(config.economy.taskRewards.attrPointRewards).length}级 + 兑换点/${Object.keys(config.economy.taskRewards.exchangePointRewards).length}级 + 晋级消耗/${Object.keys(config.economy.promotionCosts).length}档`)
}

main()
