export interface WorldLevelConfig {
  baseDC: number;
  masteryBonus: number;
  hpBase: number;
  singleAttrMax: number;
  description: string;
}

const WORLD_LEVEL_CONFIG: Record<string, WorldLevelConfig> = {
  'F级': { baseDC: 10, masteryBonus: 0, hpBase: 15, singleAttrMax: 30, description: '普通武侠、现代国术' },
  'E级': { baseDC: 13, masteryBonus: 1, hpBase: 30, singleAttrMax: 45, description: '低武、现代异能' },
  'D级': { baseDC: 16, masteryBonus: 2, hpBase: 45, singleAttrMax: 60, description: '武侠、低等恐怖' },
  'C级': { baseDC: 19, masteryBonus: 3, hpBase: 60, singleAttrMax: 80, description: '低等修真、现代灭世' },
  'B级': { baseDC: 22, masteryBonus: 4, hpBase: 75, singleAttrMax: 100, description: '中等修真、奇幻' },
  'A级': { baseDC: 25, masteryBonus: 5, hpBase: 105, singleAttrMax: 125, description: '高等仙侠、星球战争' },
  'S级': { baseDC: 28, masteryBonus: 6, hpBase: 150, singleAttrMax: 150, description: '神话仙侠、克苏鲁' },
  'SS级': { baseDC: 31, masteryBonus: 6, hpBase: 210, singleAttrMax: 180, description: '多元宇宙、概念战争' },
  'SSS级': { baseDC: 34, masteryBonus: 8, hpBase: 285, singleAttrMax: 9999, description: '全能领域、超越者' },
};

const DIFFICULTY_MOD: Record<string, number> = {
  normal: 0,
  hard: 3,
  extreme: 6,
};

const SPV_MAP: Record<string, number> = {
  'F级': 5, 'E级': 10, 'D级': 15, 'C级': 20,
  'B级': 25, 'A级': 35, 'S级': 50, 'SS级': 70, 'SSS级': 95,
};

export class WorldConfigService {
  static readonly CONFIG = WORLD_LEVEL_CONFIG;
  static readonly DIFFICULTY_MOD = DIFFICULTY_MOD;
  static readonly LEVELS = Object.keys(WORLD_LEVEL_CONFIG);

  static getConfig(level: string): WorldLevelConfig | undefined {
    return WORLD_LEVEL_CONFIG[level];
  }

  static getBaseDC(level: string): number {
    return WORLD_LEVEL_CONFIG[level]?.baseDC ?? 10;
  }

  static getMasteryBonus(level: string): number {
    return WORLD_LEVEL_CONFIG[level]?.masteryBonus ?? 0;
  }

  static getHpBase(level: string): number {
    return WORLD_LEVEL_CONFIG[level]?.hpBase ?? 15;
  }

  static getDifficultyMod(difficulty: string): number {
    return DIFFICULTY_MOD[difficulty] ?? 0;
  }

  static getFinalDC(level: string, difficulty: string): number {
    return WorldConfigService.getBaseDC(level) + WorldConfigService.getDifficultyMod(difficulty);
  }

  static getSPV(level: string): number {
    return SPV_MAP[level] || 5;
  }
}
