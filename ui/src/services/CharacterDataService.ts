import { CombatCalculationService } from './CombatCalculationService';

export interface SkillData {
  name: string;
  type: string;
  description: string;
  value: string;
  cooldown: string;
}

export interface ItemData {
  name: string;
  type: string;
  description: string;
  quantity: number;
}

export class CharacterDataService {
  static fillPlayerAttributes(
    characters: Array<{ name: string; attributes: Record<string, number> }>,
    currentCharacter: string,
    currentValues: {
      attrValue: string;
      charisma: string;
      attackPower: string;
      agilityValue: string;
      perceptionValue: string;
      playerDefense: string;
    },
  ): {
    attrValue: string;
    charisma: string;
    attackPower: string;
    agilityValue: string;
    perceptionValue: string;
    playerDefense: string;
  } {
    const playerChar = characters.find(c => c.name === currentCharacter || c.name === '主角');
    if (!playerChar) return currentValues;

    const attrs = playerChar.attributes;
    const result = { ...currentValues };

    if (attrs['力量'] !== undefined && result.attrValue === '') {
      result.attrValue = String(attrs['力量']);
    }
    if (attrs['魅力'] !== undefined && result.charisma === '') {
      result.charisma = String(attrs['魅力']);
    }
    if (attrs['攻击力'] !== undefined && result.attackPower === '') {
      result.attackPower = String(attrs['攻击力']);
    } else if (attrs['物理攻击'] !== undefined && result.attackPower === '') {
      result.attackPower = String(attrs['物理攻击']);
    }
    if (attrs['敏捷'] !== undefined && result.agilityValue === '') {
      result.agilityValue = String(attrs['敏捷']);
    }
    if (attrs['感知'] !== undefined && result.perceptionValue === '') {
      result.perceptionValue = String(attrs['感知']);
    }
    if (attrs['防御'] !== undefined && result.playerDefense === '') {
      result.playerDefense = String(attrs['防御']);
    } else if (attrs['物理防御'] !== undefined && result.playerDefense === '') {
      result.playerDefense = String(attrs['物理防御']);
    }

    return result;
  }

  static autoFillFromCharacter(
    characters: Array<{ name: string; attributes: Record<string, number> }>,
    charName: string,
  ): {
    attackPower: string;
    playerDefense: string;
    charisma: string;
    attrValue: string;
    oppAgility: string;
    initiatorName: string;
  } {
    const char = characters.find(c => c.name === charName);
    if (!char) {
      return { attackPower: '', playerDefense: '', charisma: '', attrValue: '', oppAgility: '', initiatorName: charName };
    }

    const attrs = char.attributes;
    const result: Record<string, string> = { initiatorName: charName };

    const atkPower = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.attackPower);
    if (atkPower !== null) result.attackPower = String(atkPower);

    const def = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.defense);
    if (def !== null) result.playerDefense = String(def);

    const cha = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.charisma);
    if (cha !== null) result.charisma = String(cha);

    const str = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.strength);
    if (str !== null) result.attrValue = String(str);

    const agi = CombatCalculationService.findAttrValue(attrs, CombatCalculationService.ATTR_MAPPING.agility);
    if (agi !== null) result.oppAgility = String(agi);

    return result as any;
  }

  static selectCombatTarget(
    characters: Array<{ name: string; attributes: Record<string, number> }>,
    name: string,
    attackType: '物理' | '法术',
  ): { targetDDC: string; targetDefense: string } {
    const char = characters.find(c => c.name === name);
    if (!char) return { targetDDC: '', targetDefense: '' };

    const attrs = char.attributes;
    const result: Record<string, string> = {};

    if (attrs['DDC'] !== undefined) {
      result.targetDDC = String(attrs['DDC']);
    }
    if (attackType === '物理' && attrs['物理防御'] !== undefined) {
      result.targetDefense = String(attrs['物理防御']);
    } else if (attackType === '法术' && attrs['法术防御'] !== undefined) {
      result.targetDefense = String(attrs['法术防御']);
    } else if (attrs['防御'] !== undefined) {
      result.targetDefense = String(attrs['防御']);
    }

    return result as any;
  }

  static selectDefenseTarget(
    characters: Array<{ name: string; attributes: Record<string, number> }>,
    name: string,
    currentCharName: string,
    level: string,
  ): {
    enemyAttackDc: string;
    enemyAttackPower: string;
    agilityValue: string;
    perceptionValue: string;
    playerDefense: string;
  } {
    const result: Record<string, any> = {
      enemyAttackDc: '',
      enemyAttackPower: '',
      agilityValue: '',
      perceptionValue: '',
      playerDefense: '',
    };

    const enemyChar = characters.find(c => c.name === name);
    if (enemyChar) {
      const attrs = enemyChar.attributes;
      const baseDC = WorldConfigService_getBaseDC(level);
      const enemyStr = attrs['力量'] || attrs['攻击'] || 10;
      const enemyInt = attrs['智力'] || 10;
      const enemyAttrMod = CombatCalculationService.computeAttributeModifier(Math.max(enemyStr, enemyInt));
      const enemyMastery = WorldConfigService_getMasteryBonus(level);

      result.enemyAttackDc = String(baseDC + enemyAttrMod + enemyMastery);

      if (attrs['攻击力'] !== undefined) {
        result.enemyAttackPower = String(attrs['攻击力']);
      } else if (attrs['物理攻击'] !== undefined) {
        result.enemyAttackPower = String(attrs['物理攻击']);
      }
    }

    const playerChar = characters.find(c => c.name === currentCharName || c.name === '主角');
    if (playerChar) {
      const attrs = playerChar.attributes;
      if (attrs['敏捷'] !== undefined) result.agilityValue = String(attrs['敏捷']);
      if (attrs['感知'] !== undefined) result.perceptionValue = String(attrs['感知']);
      if (attrs['防御'] !== undefined) result.playerDefense = String(attrs['防御']);
      else if (attrs['物理防御'] !== undefined) result.playerDefense = String(attrs['物理防御']);
    }

    return result as any;
  }

  static loadCombatData(): { skills: SkillData[]; items: ItemData[] } {
    try {
      const topWin = window.parent || window;
      const api = (topWin as any).AutoCardUpdaterAPI || (window as any).AutoCardUpdaterAPI;
      if (!api || typeof api.exportTableAsJson !== 'function') return { skills: [], items: [] };

      const tableData = api.exportTableAsJson();
      if (!tableData) return { skills: [], items: [] };

      const skills: SkillData[] = [];
      const items: ItemData[] = [];

      for (const key in tableData) {
        if (!key.startsWith('sheet_')) continue;
        const sheet = tableData[key];
        if (!sheet?.name || !sheet?.content) continue;

        const headers = sheet.content[0] || [];
        const rows = sheet.content.slice(1) || [];

        if (sheet.name.includes('技能')) {
          for (const row of rows) {
            if (!row || !row.some((cell: any) => cell)) continue;
            const nameCol = headers.findIndex((h: string) => h && h.includes('名称'));
            const typeCol = headers.findIndex((h: string) => h && h.includes('类型'));
            const descCol = headers.findIndex((h: string) => h && h.includes('效果'));
            const valueCol = headers.findIndex((h: string) => h && h.includes('数值'));
            const cdCol = headers.findIndex((h: string) => h && h.includes('冷却'));

            const skillType = typeCol >= 0 ? String(row[typeCol] || '') : '';
            if (skillType === '主动') {
              skills.push({
                name: nameCol >= 0 ? String(row[nameCol] || '') : '',
                type: skillType,
                description: descCol >= 0 ? String(row[descCol] || '') : '',
                value: valueCol >= 0 ? String(row[valueCol] || '') : '',
                cooldown: cdCol >= 0 ? String(row[cdCol] || '') : '',
              });
            }
          }
        }

        if (sheet.name.includes('物品')) {
          for (const row of rows) {
            if (!row || !row.some((cell: any) => cell)) continue;
            const nameCol = headers.findIndex((h: string) => h && h.includes('名称'));
            const typeCol = headers.findIndex((h: string) => h && h.includes('类型'));
            const descCol = headers.findIndex((h: string) => h && (h.includes('效果') || h.includes('描述')));
            const qtyCol = headers.findIndex((h: string) => h && (h.includes('数量') || h.includes('持有')));

            const itemType = typeCol >= 0 ? String(row[typeCol] || '') : '';
            if (itemType === '消耗品') {
              items.push({
                name: nameCol >= 0 ? String(row[nameCol] || '') : '',
                type: itemType,
                description: descCol >= 0 ? String(row[descCol] || '') : '',
                quantity: qtyCol >= 0 ? parseInt(String(row[qtyCol] || '1'), 10) : 1,
              });
            }
          }
        }
      }

      return { skills, items: items.filter(i => i.quantity > 0) };
    } catch (e) {
      console.error('[CharacterDataService.loadCombatData] 加载失败:', e);
      return { skills: [], items: [] };
    }
  }
}

function WorldConfigService_getBaseDC(level: string): number {
  const CONFIG: Record<string, { baseDC: number; masteryBonus: number }> = {
    'F级': { baseDC: 10, masteryBonus: 0 },
    'E级': { baseDC: 13, masteryBonus: 1 },
    'D级': { baseDC: 16, masteryBonus: 2 },
    'C级': { baseDC: 19, masteryBonus: 3 },
    'B级': { baseDC: 22, masteryBonus: 4 },
    'A级': { baseDC: 25, masteryBonus: 5 },
    'S级': { baseDC: 28, masteryBonus: 6 },
    'SS级': { baseDC: 31, masteryBonus: 6 },
    'SSS级': { baseDC: 34, masteryBonus: 8 },
  };
  return CONFIG[level]?.baseDC ?? 10;
}

function WorldConfigService_getMasteryBonus(level: string): number {
  const CONFIG: Record<string, { masteryBonus: number }> = {
    'F级': { masteryBonus: 0 }, 'E级': { masteryBonus: 1 }, 'D级': { masteryBonus: 2 },
    'C级': { masteryBonus: 3 }, 'B级': { masteryBonus: 4 }, 'A级': { masteryBonus: 5 },
    'S级': { masteryBonus: 6 }, 'SS级': { masteryBonus: 6 }, 'SSS级': { masteryBonus: 8 },
  };
  return CONFIG[level]?.masteryBonus ?? 0;
}
