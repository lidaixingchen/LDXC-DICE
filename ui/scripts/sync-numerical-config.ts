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

// ============================================================
// Schema 校验层
// ============================================================

type SchemaLeaf = string[]
type SchemaScalar = null
type SchemaNode = SchemaBranch | SchemaLeaf | SchemaScalar
type SchemaBranch = Record<string, SchemaNode>
type SchemaDef = SchemaBranch

function validateSchema(yamlObj: unknown, schema: SchemaDef, yamlFile: string, basePath = ''): void {
  if (typeof yamlObj !== 'object' || yamlObj === null) {
    throw new Error(`[sync-config] YAML 结构错误: ${yamlFile}${basePath ? ' → ' + basePath : ''}\n  期望: 对象\n  实际: ${typeof yamlObj}`)
  }

  const obj = yamlObj as Record<string, unknown>
  const existingKeys = Object.keys(obj)
  const schemaKeys = Object.keys(schema)

  const extraKeys = existingKeys.filter(k => !schemaKeys.includes(k))
  const structuralExtra = extraKeys.filter(k => typeof obj[k] === 'object' && obj[k] !== null)
  if (structuralExtra.length > 0) {
    throw new Error(
      `[sync-config] YAML 包含未知结构化字段:\n  文件: ${yamlFile}${basePath ? ' → ' + basePath : ''}\n  期望字段: ${schemaKeys.join(', ')}\n  未知结构: ${structuralExtra.join(', ')}（世界书可能新增了区块，需同步更新 schema）`,
    )
  }

  for (const [key, subSchema] of Object.entries(schema)) {
    const fullPath = basePath ? `${basePath} → ${key}` : key

    if (!(key in obj)) {
      const schemaDesc = subSchema === null ? '（标量值）' : Array.isArray(subSchema) ? subSchema.join(', ') : Object.keys(subSchema as Record<string, unknown>).join(', ')
      throw new Error(
        `[sync-config] YAML 字段缺失:\n  文件: ${yamlFile}\n  路径: ${fullPath}\n  期望字段: ${schemaDesc}\n  当前顶层字段: ${existingKeys.join(', ')}`,
      )
    }

    if (subSchema === null) {
    } else if (Array.isArray(subSchema)) {
      if (typeof obj[key] !== 'object' || obj[key] === null) {
        throw new Error(`[sync-config] YAML 结构错误: ${yamlFile}\n  路径: ${fullPath}\n  期望: 对象\n  实际: ${typeof obj[key]}`)
      }
      const nestedObj = obj[key] as Record<string, unknown>
      const nestedKeys = Object.keys(nestedObj)
      const missingKeys = subSchema.filter(k => !(k in nestedObj))

      if (missingKeys.length > 0) {
        throw new Error(
          `[sync-config] YAML 字段缺失:\n  文件: ${yamlFile}\n  路径: ${fullPath}\n  期望字段: ${subSchema.join(', ')}\n  实际字段: ${nestedKeys.join(', ')}\n  缺失: ${missingKeys.join(', ')}`,
        )
      }
    } else {
      validateSchema(obj[key], subSchema, yamlFile, fullPath)
    }
  }
}

// ============================================================
// Schema 定义 — 每个 YAML 文件的期望字段结构
// ============================================================

const DC_TABLE_SCHEMA: SchemaDef = {
  'DC表': {
    '说明': null,
    '基础DC': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级'],
    '困难DC': null,
    '极难DC': null,
    '使用说明': null,
  },
}

const HP_BASE_SCHEMA: SchemaDef = {
  'HP基础值': {
    '说明': null,
    '各等级HP基础值': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级'],
    'HP计算公式': null,
  },
}

const MASTERY_SCHEMA: SchemaDef = {
  '掌握加成表': {
    '说明': null,
    '对照表': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级'],
  },
}

const LEVEL_SYSTEM_SCHEMA: SchemaDef = {
  '人物等级体系': {
    '说明': null,
    '等级划分': {
      '说明': null,
      '对照表': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级'],
    },
    '单项属性上限': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级'],
    '属性加成': null,
    '初始设定': null,
  },
}

const SPV_SCHEMA: SchemaDef = {
  'SPV体系': {
    '说明': null,
    '定义': null,
    '等级阶位与SPV对照': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级'],
    '应用系数': ['主动技能伤害', '被动技能数值', '装备核心数值', 'HP等级基础值', '属性增加', '体质治疗', '智力治疗', '吸血效果', '护盾值'],
  },
}

const ATTR_MODIFIER_SCHEMA: SchemaDef = {
  '属性加成表': {
    '说明': null,
    '对照表': ['381+'],
  },
}

const ACTIVE_SKILL_SCHEMA: SchemaDef = {
  '主动技能数值': {
    '说明': null,
    '伤害与治疗数值': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级'],
    '冷却时间': null,
    '消耗': null,
  },
}

const PASSIVE_SKILL_SCHEMA: SchemaDef = {
  '被动技能数值': {
    '说明': null,
    '属性加成数值': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级'],
  },
}

const WEAPON_SCHEMA: SchemaDef = {
  '武器数值': {
    '说明': null,
    '攻击装备数值': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级'],
    '词条数量': ['F级', 'E级', 'D级', 'C级', 'B级及以上'],
  },
}

const ARMOR_SCHEMA: SchemaDef = {
  '防具数值': {
    '说明': null,
    '防御装备数值': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级'],
    '词条数量': ['F级', 'E级', 'D级', 'C级', 'B级及以上'],
  },
}

const STATUS_RULES_SCHEMA: SchemaDef = {
  '状态规则': {
    '叠加规则': ['同类型负面', '同类型正面', '正负抵消', '持续时间'],
    '状态强度等级': ['弱效', '中效', '强效'],
    '持续伤害状态详情': null,
    '控制效果详情': null,
    '减益效果详情': null,
    '增益效果详情': null,
    '防护效果详情': null,
  },
}

const TASK_REWARD_SCHEMA: SchemaDef = {
  '任务奖励': {
    '物品奖励': {
      '说明': null,
      '主线任务': { '品级': null },
      '支线任务品级投掷规则': null,
      '隐藏任务品级投掷规则': null,
      '预投掷结果（如果超出任务生成个数，则取前几个）': null,
    },
    '属性点奖励': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级'],
    '兑换点奖励': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级'],
  },
}

const PROMOTION_SCHEMA: SchemaDef = {
  '晋级消耗': ['晋升E级', '晋升D级', '晋升C级', '晋升B级', '晋升A级', '晋升S级', '晋升SS级', '晋升SSS级'],
  '晋级条件': { '说明': null },
}

const EXCHANGE_PRICE_SCHEMA: SchemaDef = {
  '兑换价格': {
    '装备价格': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级'],
    '技能价格': ['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级'],
    '服务价格': ['技能升级', '装备强化', '沉淀点释放'],
  },
}

// ============================================================
// YAML 加载 + 校验
// ============================================================

function loadAndValidate(relativePath: string, schema: SchemaDef): Record<string, unknown> {
  const fullPath = path.resolve(aidmDir, relativePath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  const cleaned = content.replace(/^---\n/, '').replace(/\n---$/, '')
  const loaded = yaml.load(cleaned) as Record<string, unknown>
  validateSchema(loaded, schema, relativePath)
  return loaded
}

// ============================================================
// 解析函数
// ============================================================

function parseLevelConfigs(): Record<string, LevelConfig> {
  const dcTable = loadAndValidate('04-检定系统/DC表.yaml', DC_TABLE_SCHEMA) as { 'DC表': { '基础DC': Record<string, number> } }
  const hpBase = loadAndValidate('01-数值参考/战斗数值/HP基础值.yaml', HP_BASE_SCHEMA) as { 'HP基础值': { '各等级HP基础值': Record<string, number> } }
  const masteryTable = loadAndValidate('00-核心定义/掌握加成表.yaml', MASTERY_SCHEMA) as { '掌握加成表': { '对照表': Record<string, string> } }
  const levelSystem = loadAndValidate('00-核心定义/等级体系.yaml', LEVEL_SYSTEM_SCHEMA) as { '人物等级体系': { '单项属性上限': Record<string, number>; '等级划分': { '对照表': Record<string, string> } } }
  const spvSystem = loadAndValidate('00-核心定义/SPV体系.yaml', SPV_SCHEMA) as { 'SPV体系': { '等级阶位与SPV对照': Record<string, number> } }

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
  const attrTable = loadAndValidate('00-核心定义/属性加成表.yaml', ATTR_MODIFIER_SCHEMA) as { '属性加成表': { '对照表': Record<string, string> } }
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
  const activeYaml = loadAndValidate('01-数值参考/技能数值/主动技能.yaml', ACTIVE_SKILL_SCHEMA) as { '主动技能数值': { '伤害与治疗数值': Record<string, Record<string, string>> } }
  const passiveYaml = loadAndValidate('01-数值参考/技能数值/被动技能.yaml', PASSIVE_SKILL_SCHEMA) as { '被动技能数值': { '属性加成数值': Record<string, Record<string, string>> } }

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

function getLevelOrGroupKey(obj: Record<string, unknown>, level: string): string | number | undefined {
  if (level in obj) return obj[level] as string | number | undefined
  for (const [key, val] of Object.entries(obj)) {
    if (key.includes('及以上') && level.localeCompare(key.replace('及以上', ''), 'zh') >= 0) {
      return val as string | number | undefined
    }
  }
  return undefined
}

function parseEquipmentRules(): EquipmentRules {
  const weaponYaml = loadAndValidate('01-数值参考/装备数值/武器数值.yaml', WEAPON_SCHEMA) as { '武器数值': { '攻击装备数值': Record<string, Record<string, string>>; '词条数量': Record<string, string> } }
  const armorYaml = loadAndValidate('01-数值参考/装备数值/防具数值.yaml', ARMOR_SCHEMA) as { '防具数值': { '防御装备数值': Record<string, Record<string, string>>; '词条数量': Record<string, string> } }

  const weaponTable: Record<string, Record<string, number>> = {}
  for (const [level, vals] of Object.entries(weaponYaml['武器数值']['攻击装备数值'])) {
    const wc = getLevelOrGroupKey(weaponYaml['武器数值']['词条数量'], level) || '1项'
    weaponTable[level] = {
      statBonus: parseInt(String(vals['属性加成']).replace(/[+]/g, ''), 10) || 0,
      physMagicDamage: parseInt(String(vals['物伤法伤']).replace(/[+]/g, ''), 10) || 0,
      wordCount: parseInt(String(wc).replace(/项/, ''), 10) || 1,
    }
  }

  const armorTable: Record<string, Record<string, number>> = {}
  for (const [level, vals] of Object.entries(armorYaml['防具数值']['防御装备数值'])) {
    const wc = getLevelOrGroupKey(armorYaml['防具数值']['词条数量'], level) || '1项'
    armorTable[level] = {
      statBonus: parseInt(String(vals['属性加成']).replace(/[+]/g, ''), 10) || 0,
      physMagicDefense: parseInt(String(vals['物防法防']).replace(/[+]/g, ''), 10) || 0,
      hpBonus: parseInt(String(vals['HP加成']).replace(/[+]/g, ''), 10) || 0,
      wordCount: parseInt(String(wc).replace(/项/, ''), 10) || 1,
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
  const statusYaml = loadAndValidate('03-战斗系统/状态效果/状态规则.yaml', STATUS_RULES_SCHEMA) as { '状态规则': { '叠加规则': Record<string, string>; '状态强度等级': Record<string, Record<string, string>> } }

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
  const rewardYaml = loadAndValidate('01-数值参考/经济数值/任务奖励.yaml', TASK_REWARD_SCHEMA) as { '任务奖励': { '物品奖励': Record<string, string>; '属性点奖励': Record<string, Record<string, string>>; '兑换点奖励': Record<string, Record<string, number>> } }
  const promoYamlRaw = loadAndValidate('01-数值参考/经济数值/晋级消耗.yaml', PROMOTION_SCHEMA)
  const promoYaml = promoYamlRaw['晋级消耗'] as Record<string, number>
  const priceYaml = loadAndValidate('01-数值参考/经济数值/兑换价格.yaml', EXCHANGE_PRICE_SCHEMA) as { '兑换价格': { '装备价格': Record<string, Record<string, number>>; '技能价格': Record<string, Record<string, number>>; '服务价格': Record<string, string> } }

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
