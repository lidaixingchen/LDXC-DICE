import { safeLocalStorageGet, safeLocalStorageSet } from '../../../utils/safe-storage'

const SAVE_KEY = 'aidm_save_slots'
const CURRENT_VERSION = 2

export interface StatusEffect {
  id: number
  name: string
  type: 'buff' | 'debuff' | 'dot' | 'control' | 'shield'
  intensity: 'weak' | 'medium' | 'strong'
  value: number
  remainingRounds: number
  totalRounds?: number
  description: string
}

export interface CombatState {
  active: boolean
  round: number
  enemyName: string
  enemyMaxHP: number
  enemyCurrentHP: number
  playerMaxHP: number
  playerCurrentHP: number
  playerShield: number
}

export interface EquipmentSlot {
  name: string
  physDmg: number
  magicDmg: number
  physDef: number
  magicDef: number
  hpBonus: number
  dodgeBonus: number
}

export interface SkillData {
  name: string
  type: string
  description: string
  value: string
  cooldown: string
}

export interface ItemData {
  name: string
  type: string
  description: string
  quantity: number
}

export interface CharacterSnapshot {
  name: string
  attributes: Record<string, number>
}

export interface ResourceItem {
  name: string
  value: string
}

export interface DashboardNpcSnapshot {
  name: string
  status: string
  position: string
  inScene: boolean
}

export interface DashboardQuestSnapshot {
  name: string
  type: string
  status: string
  priority: string
  progress: string
  description?: string
}

export interface DashboardSnapshot {
  playerResources: ResourceItem[]
  npcs: DashboardNpcSnapshot[]
  quests: DashboardQuestSnapshot[]
  currentLocation: string
}

export interface CharacterMeta {
  race: string
  bloodline: string
  title: string
}

export interface EconomyData {
  depositPoints: number
  exchangePoints: number
}

export interface ProgressStats {
  completedWorlds: number
  survivalTime: number
  totalPlayTime: number
  deathCount: number
}

export interface WorldInfo {
  name: string
  level: string
  type: string
  scene: string
}

export interface EquipDetail {
  weapon: { name: string; level: string; physDmg: number; magicDmg: number }
  armor: { name: string; level: string; physDef: number; magicDef: number; hpBonus: number }
  accessories: Array<{ name: string; description: string }>
}

export interface InventoryItem {
  name: string
  description: string
  quantity: number
  type: string
}

export interface SaveData {
  version: number
  playerName: string
  level: string
  currentCharacter: string
  characters: CharacterSnapshot[]
  combat: CombatState
  equipment: EquipmentSlot
  statuses: StatusEffect[]
  activeSkills: SkillData[]
  usableItems: ItemData[]
  statusIdCounter: number
  dashboard: DashboardSnapshot
  worldName: string
  location: string
  savedAt: number
  llmContext: string
  characterMeta: CharacterMeta
  economy: EconomyData
  progress: ProgressStats
  worldInfo: WorldInfo
  quests: DashboardQuestSnapshot[]
  equipDetail: EquipDetail
  inventory: InventoryItem[]
}

export interface SaveSlot {
  id: number
  timestamp: string
  data: SaveData
}

export interface GameStateInput {
  playerName: string
  level: string
  currentCharacter: string
  characters: CharacterSnapshot[]
  combat: CombatState
  equipment: EquipmentSlot
  statuses: StatusEffect[]
  activeSkills: SkillData[]
  usableItems: ItemData[]
  statusIdCounter: number
  dashboard: DashboardSnapshot
  worldName: string
  location: string
  characterMeta: CharacterMeta
  economy: EconomyData
  progress: ProgressStats
  worldInfo: WorldInfo
  quests: DashboardQuestSnapshot[]
  equipDetail: EquipDetail
  inventory: InventoryItem[]
}

export interface GameStateOutput extends GameStateInput {}

function migrate(data: Record<string, unknown>): SaveData {
  const version = (data.version as number) || 0

  if (version < 1) {
    const attrs = (data.attrs as Record<string, number>) || {}
    const playerName = (data.playerName as string) || '冒险者'
    data.currentCharacter = data.currentCharacter || playerName
    data.characters = data.characters || [{ name: playerName, attributes: attrs }]
    data.activeSkills = data.activeSkills || []
    data.usableItems = data.usableItems || []
    data.statusIdCounter = data.statusIdCounter || 0
    data.dashboard = data.dashboard || {
      playerResources: [],
      npcs: [],
      quests: [],
      currentLocation: data.location || '',
    }
    data.savedAt = data.savedAt || Date.now()
    data.version = 1
    delete (data as any).attrs
  }

  if (version < 2) {
    data.llmContext = (data.llmContext as string) || ''
    data.characterMeta = (data.characterMeta as CharacterMeta) || { race: '人类', bloodline: '无', title: '' }
    data.economy = (data.economy as EconomyData) || { depositPoints: 0, exchangePoints: 100 }
    data.progress = (data.progress as ProgressStats) || { completedWorlds: 0, survivalTime: 0, totalPlayTime: 0, deathCount: 0 }
    data.worldInfo = (data.worldInfo as WorldInfo) || { name: '', level: '', type: '', scene: (data.location as string) || '' }
    data.quests = (data.quests as DashboardQuestSnapshot[]) || ((data.dashboard as Record<string, unknown>)?.quests as DashboardQuestSnapshot[]) || []
    data.equipDetail = (data.equipDetail as EquipDetail) || {
      weapon: { name: '', level: '', physDmg: 0, magicDmg: 0 },
      armor: { name: '', level: '', physDef: 0, magicDef: 0, hpBonus: 0 },
      accessories: [],
    }
    data.inventory = (data.inventory as InventoryItem[]) || []
    data.version = 2
  }

  return data as unknown as SaveData
}

function validateSaveData(data: unknown): data is SaveData {
  if (typeof data !== 'object' || data === null) return false

  const d = data as Record<string, unknown>
  if (typeof d.version !== 'number') return false
  if (typeof d.playerName !== 'string') return false
  if (typeof d.level !== 'string') return false
  if (!Array.isArray(d.characters)) return false
  if (typeof d.combat !== 'object' || d.combat === null) return false
  if (typeof d.equipment !== 'object' || d.equipment === null) return false
  if (!Array.isArray(d.statuses)) return false
  if (!Array.isArray(d.activeSkills)) return false
  if (!Array.isArray(d.usableItems)) return false

  return true
}

export class SaveService {
  static loadSaveSlots(): SaveSlot[] {
    try {
      const raw = safeLocalStorageGet(SAVE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed.map((slot: Record<string, unknown>) => ({
            id: slot.id as number,
            timestamp: slot.timestamp as string,
            data: migrate((slot.data || {}) as Record<string, unknown>),
          }))
        }
      }
    } catch { /* ignore */ }
    return []
  }

  static persistSaveSlots(slots: SaveSlot[]): void {
    safeLocalStorageSet(SAVE_KEY, JSON.stringify(slots))
  }

  static packGameState(input: GameStateInput): SaveData {
    return {
      version: CURRENT_VERSION,
      playerName: input.playerName,
      level: input.level,
      currentCharacter: input.currentCharacter,
      characters: input.characters.map(c => ({
        name: c.name,
        attributes: { ...c.attributes },
      })),
      combat: { ...input.combat },
      equipment: { ...input.equipment },
      statuses: input.statuses.map(s => ({ ...s })),
      activeSkills: input.activeSkills.map(s => ({ ...s })),
      usableItems: input.usableItems.map(i => ({ ...i })),
      statusIdCounter: input.statusIdCounter,
      dashboard: {
        playerResources: input.dashboard.playerResources.map(r => ({ ...r })),
        npcs: input.dashboard.npcs.map(n => ({ ...n })),
        quests: input.dashboard.quests.map(q => ({ ...q })),
        currentLocation: input.dashboard.currentLocation,
      },
      worldName: input.worldName,
      location: input.location,
      savedAt: Date.now(),
      llmContext: '',
      characterMeta: { ...input.characterMeta },
      economy: { ...input.economy },
      progress: { ...input.progress },
      worldInfo: { ...input.worldInfo },
      quests: input.quests.map(q => ({ ...q })),
      equipDetail: {
        weapon: { ...input.equipDetail.weapon },
        armor: { ...input.equipDetail.armor },
        accessories: input.equipDetail.accessories.map(a => ({ ...a })),
      },
      inventory: input.inventory.map(i => ({ ...i })),
    }
  }

  static saveGame(slotId: number, slots: SaveSlot[], data: SaveData): SaveSlot[] {
    const slot: SaveSlot = {
      id: slotId,
      timestamp: new Date().toLocaleString(),
      data,
    }

    const existingIdx = slots.findIndex(s => s.id === slotId)
    const newSlots = [...slots]

    if (existingIdx >= 0) {
      newSlots[existingIdx] = slot
    } else {
      newSlots.push(slot)
    }

    SaveService.persistSaveSlots(newSlots)
    return newSlots
  }

  static unpackGameState(slot: SaveSlot): GameStateOutput | null {
    const data = slot.data
    if (!data) return null

    return {
      playerName: data.playerName,
      level: data.level,
      currentCharacter: data.currentCharacter,
      characters: data.characters.map(c => ({
        name: c.name,
        attributes: { ...c.attributes },
      })),
      combat: { ...data.combat },
      equipment: { ...data.equipment },
      statuses: data.statuses.map(s => ({ ...s })),
      activeSkills: data.activeSkills.map(s => ({ ...s })),
      usableItems: data.usableItems.map(i => ({ ...i })),
      statusIdCounter: data.statusIdCounter,
      dashboard: {
        playerResources: data.dashboard?.playerResources?.map(r => ({ ...r })) || [],
        npcs: data.dashboard?.npcs?.map(n => ({ ...n })) || [],
        quests: data.dashboard?.quests?.map(q => ({ ...q })) || [],
        currentLocation: data.dashboard?.currentLocation || data.location || '',
      },
      worldName: data.worldName,
      location: data.location,
      characterMeta: data.characterMeta ? { ...data.characterMeta } : { race: '人类', bloodline: '无', title: '' },
      economy: data.economy ? { ...data.economy } : { depositPoints: 0, exchangePoints: 100 },
      progress: data.progress ? { ...data.progress } : { completedWorlds: 0, survivalTime: 0, totalPlayTime: 0, deathCount: 0 },
      worldInfo: data.worldInfo ? { ...data.worldInfo } : { name: '', level: '', type: '', scene: data.location || '' },
      quests: data.quests?.map(q => ({ ...q })) || [],
      equipDetail: data.equipDetail
        ? {
            weapon: { ...data.equipDetail.weapon },
            armor: { ...data.equipDetail.armor },
            accessories: data.equipDetail.accessories?.map(a => ({ ...a })) || [],
          }
        : { weapon: { name: '', level: '', physDmg: 0, magicDmg: 0 }, armor: { name: '', level: '', physDef: 0, magicDef: 0, hpBonus: 0 }, accessories: [] },
      inventory: data.inventory?.map(i => ({ ...i })) || [],
    }
  }

  static loadGame(slots: SaveSlot[], slotId: number): SaveData | null {
    const slot = slots.find(s => s.id === slotId)
    if (!slot) return null
    if (!validateSaveData(slot.data)) {
      console.warn(`[SaveService] 存档槽 ${slotId} 数据校验失败`)
      return null
    }
    return slot.data
  }

  static deleteSave(slots: SaveSlot[], slotId: number): SaveSlot[] {
    const newSlots = slots.filter(s => s.id !== slotId)
    SaveService.persistSaveSlots(newSlots)
    return newSlots
  }

  static exportSaveText(state: GameStateOutput, derivedStats: {
    physAtk: number
    magicAtk: number
    physDef: number
    magicDef: number
    hp: number
    ddc: number
    critRate: number
  }): string {
    const c = state.combat
    const e = state.equipment
    const cm = state.characterMeta
    const eco = state.economy
    const wi = state.worldInfo
    const prog = state.progress

    const displayHP = c.active
      ? `HP：${c.playerCurrentHP}/${c.playerMaxHP}`
      : `HP：${derivedStats.hp}`
    const combatLine = c.active ? `\n【战斗中】第${c.round}回合 | 敌人:${c.enemyName} HP:${c.enemyCurrentHP}/${c.enemyMaxHP}\n` : ''

    const blocks: string[] = []

    if (state.statuses.length > 0) {
      blocks.push(`【状态效果】\n${state.statuses.map(s => `  ${s.name}(${s.type}) ${s.intensity} 剩余${s.remainingRounds}回合`).join('\n')}`)
    }
    if (state.activeSkills.length > 0) {
      blocks.push(`【战斗技能】\n${state.activeSkills.map(s => `  ${s.name}(${s.type}) ${s.value} CD:${s.cooldown}`).join('\n')}`)
    }
    if (state.dashboard.npcs.length > 0) {
      const inScene = state.dashboard.npcs.filter(n => n.inScene)
      if (inScene.length > 0) {
        blocks.push(`【在场NPC】\n${inScene.map(n => `  ${n.name} ${n.status} @${n.position}`).join('\n')}`)
      }
    }
    const allQuests = state.quests.length > 0 ? state.quests : state.dashboard.quests
    if (allQuests.length > 0) {
      const activeQuests = allQuests.filter(q => q.status.includes('进行') || q.status.toLowerCase().includes('active'))
      if (activeQuests.length > 0) {
        blocks.push(`【进行中任务】\n${activeQuests.map(q => `  ${q.name} [${q.type}] ${q.progress}${q.description ? ` - ${q.description}` : ''}`).join('\n')}`)
      }
    }

    const equipLines = [
      e.name ? `  当前装备: ${e.name} | 物伤+${e.physDmg} 法伤+${e.magicDmg} 物防+${e.physDef} 法防+${e.magicDef} HP+${e.hpBonus} 闪避+${e.dodgeBonus}` : '  无装备',
      state.equipDetail.weapon.name ? `  武器: ${state.equipDetail.weapon.name}` : '',
      state.equipDetail.armor.name ? `  防具: ${state.equipDetail.armor.name}` : '',
    ].filter(Boolean).join('\n')

    const itemLines = state.usableItems.length > 0
      ? state.usableItems.map(i => `  ${i.name} x${i.quantity}`).join('\n')
      : '  无'

    const inventoryLines = state.inventory.length > 0
      ? state.inventory.map(i => `  ${i.name} x${i.quantity}${i.type ? `(${i.type})` : ''}`).join('\n')
      : ''

    const extraSections = blocks.length > 0 ? '\n' + blocks.join('\n\n') + '\n' : ''

    const resources = state.dashboard.playerResources.length > 0
      ? state.dashboard.playerResources.map(r => `  ${r.name}: ${r.value}`).join('\n')
      : '  无'

    return `═════════════════════════════════
【轮回者存档】
═════════════════════════════════

【角色信息】
名称：${state.playerName} | 等级：${state.level} | 当前角色：${state.currentCharacter}
种族：${cm.race} | 血脉：${cm.bloodline} | 称号：${cm.title || '无'}
沉淀点：${eco.depositPoints} | 兑换点：${eco.exchangePoints}

【基础属性】
${state.characters.map(ch => {
  const attrStr = Object.entries(ch.attributes)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')
  return `  ${ch.name}: ${attrStr}`
}).join('\n')}

【战斗属性】
${displayHP}
护盾：${c.playerShield}
物攻：${derivedStats.physAtk + e.physDmg} | 法攻：${derivedStats.magicAtk + e.magicDmg}
物防：${derivedStats.physDef + e.physDef} | 法防：${derivedStats.magicDef + e.magicDef}
DDC：${derivedStats.ddc} | 暴击率：${derivedStats.critRate}%

【装备】
${equipLines}

【消耗品】
${itemLines}${inventoryLines ? `\n【物品栏】\n${inventoryLines}` : ''}${extraSections}${combatLine}【当前位置】${state.location} - ${wi.scene}
【当前世界】${wi.name}（${wi.level}·${wi.type}）

【经济】
${resources}

【进度统计】
完成世界数：${prog.completedWorlds} | 存活时间：${prog.survivalTime}分钟
总游戏时间：${prog.totalPlayTime}分钟 | 死亡次数：${prog.deathCount}
═════════════════════════════════
[SERIALIZED:${btoa(encodeURIComponent(JSON.stringify(state)))}]`
  }

  static generateFallbackContextText(state: GameStateOutput, derivedStats: {
    physAtk: number
    magicAtk: number
    physDef: number
    magicDef: number
    hp: number
    ddc: number
    critRate: number
  }): string {
    const c = state.combat
    const e = state.equipment
    const cm = state.characterMeta
    const eco = state.economy
    const wi = state.worldInfo
    const prog = state.progress

    const displayHP = c.active
      ? `HP：${c.playerCurrentHP}/${c.playerMaxHP}`
      : `HP：${derivedStats.hp}`
    const combatLine = c.active ? `\n【战斗中】第${c.round}回合 | 敌人:${c.enemyName} HP:${c.enemyCurrentHP}/${c.enemyMaxHP}\n` : ''

    const attrLines = state.characters.map(ch => {
      const attrStr = Object.entries(ch.attributes)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')
      return `  ${ch.name}: ${attrStr}`
    }).join('\n')

    const skillLines = state.activeSkills.length > 0
      ? state.activeSkills.map(s => `  ${s.name}(${s.type}) ${s.value} CD:${s.cooldown}`).join('\n')
      : '  无'

    const equipLines = [
      e.name ? `  当前装备: ${e.name} | 物伤+${e.physDmg} 法伤+${e.magicDmg} 物防+${e.physDef} 法防+${e.magicDef}` : '  无装备',
      state.equipDetail.weapon.name ? `  武器: ${state.equipDetail.weapon.name}` : '',
      state.equipDetail.armor.name ? `  防具: ${state.equipDetail.armor.name}` : '',
    ].filter(Boolean).join('\n')

    const itemLines = state.usableItems.length > 0
      ? state.usableItems.map(i => `  ${i.name} x${i.quantity}`).join('\n')
      : '  无'

    const npcLines = state.dashboard.npcs.filter(n => n.inScene).length > 0
      ? state.dashboard.npcs.filter(n => n.inScene).map(n => `  ${n.name} ${n.status} @${n.position}`).join('\n')
      : '  无'

    const questLines = state.quests.length > 0
      ? state.quests.map(q => `  [${q.type}] ${q.name} - ${q.status} ${q.progress}`).join('\n')
      : '  无'

    const resourceLines = state.dashboard.playerResources.length > 0
      ? state.dashboard.playerResources.map(r => `  ${r.name}: ${r.value}`).join('\n')
      : '  无'

    return `[读档指令] 以下是从存档恢复的游戏状态，请基于此继续叙事：

【角色信息】
名称：${state.playerName} | 等级：${state.level} | 种族：${cm.race} | 血脉：${cm.bloodline}
称号：${cm.title || '无'} | 沉淀点：${eco.depositPoints} | 兑换点：${eco.exchangePoints}

【基础属性】
${attrLines}

【战斗属性】
${displayHP}
护盾：${c.playerShield}
物攻：${derivedStats.physAtk + e.physDmg} | 法攻：${derivedStats.magicAtk + e.magicDmg}
物防：${derivedStats.physDef + e.physDef} | 法防：${derivedStats.magicDef + e.magicDef}
DDC：${derivedStats.ddc} | 暴击率：${derivedStats.critRate}%
${combatLine}
【技能】
${skillLines}

【装备】
${equipLines}

【物品栏】
${itemLines}

【当前位置】${state.location} - ${wi.scene}
【当前世界】${wi.name}（${wi.level}·${wi.type}）

【关键NPC】
${npcLines}

【任务】
${questLines}

【进度统计】
完成世界数：${prog.completedWorlds} | 存活时间：${prog.survivalTime}分钟
总游戏时间：${prog.totalPlayTime}分钟 | 死亡次数：${prog.deathCount}

【经济】
${resourceLines}
[SERIALIZED:${btoa(encodeURIComponent(JSON.stringify(state)))}]`
  }

  static parseImportText(text: string): GameStateOutput | null {
    const serializedMatch = text.match(/\[SERIALIZED:(.+?)\]/)
    if (serializedMatch) {
      try {
        const json = decodeURIComponent(atob(serializedMatch[1]))
        const raw = JSON.parse(json)
        const migrated = migrate(raw)
        if (validateSaveData(migrated)) {
          return SaveService.unpackGameState({ id: 0, timestamp: '', data: migrated })
        }
      } catch (e) {
        console.warn('[SaveService] 序列化数据解析失败:', e)
      }
    }

    const lines = text.split('\n')
    const result: Partial<GameStateOutput> = {
      playerName: '冒险者',
      level: 'F级',
      currentCharacter: '主角',
      characters: [],
      combat: { active: false, round: 1, enemyName: '', enemyMaxHP: 0, enemyCurrentHP: 0, playerMaxHP: 0, playerCurrentHP: 0, playerShield: 0 },
      equipment: { name: '', physDmg: 0, magicDmg: 0, physDef: 0, magicDef: 0, hpBonus: 0, dodgeBonus: 0 },
      statuses: [],
      activeSkills: [],
      usableItems: [],
      statusIdCounter: 0,
      dashboard: { playerResources: [], npcs: [], quests: [], currentLocation: '' },
      worldName: '',
      location: '',
    }

    let section: string | null = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('【') && trimmed.endsWith('】')) {
        section = trimmed.replace(/【|】/g, '')
        continue
      }
      if (!section || !trimmed) continue

      if (section === '角色信息') {
        const nameMatch = trimmed.match(/^名称：(.+)$/)
        if (nameMatch) result.playerName = nameMatch[1]
        const levelMatch = trimmed.match(/等级：(.+?)\s*\|/)
        if (levelMatch) result.level = levelMatch[1]
        const charMatch = trimmed.match(/当前角色：(.+)$/)
        if (charMatch) result.currentCharacter = charMatch[1]
      }

      if (section === '基础属性') {
        const attrMatch = trimmed.match(/^(.+?):\s*(.+)$/)
        if (attrMatch) {
          const charName = attrMatch[1].trim()
          const attrsStr = attrMatch[2]
          const attrs: Record<string, number> = {}
          const attrParts = attrsStr.split(/\s+/)
          for (const part of attrParts) {
            const m = part.match(/^(.+?):(\d+)$/)
            if (m) attrs[m[1]] = parseInt(m[2], 10)
          }
          if (Object.keys(attrs).length > 0) {
            result.characters!.push({ name: charName, attributes: attrs })
          }
        }
      }
    }

    if (!text.includes('轮回者存档')) return null
    return result as GameStateOutput
  }
}
