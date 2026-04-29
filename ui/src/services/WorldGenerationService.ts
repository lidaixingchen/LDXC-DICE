export interface GeneratedWorld {
  name: string;
  tier: string;
  type: string;
  difficulty: number;
  description: string;
}

export interface GeneratedSkill {
  name: string;
  type: '主动' | '被动';
  effect: string;
  spvValue: number;
}

const WORLD_TYPES = ['恐怖', '科幻', '奇幻', '武侠', '仙侠', '末世', '其他'];
const WORLD_TIER_ROLL_MAP: [number, string][] = [
  [14, '同等级'], [16, '低1级'], [18, '高1级'], [19, '低2级'], [20, '高2级'],
];

const ACTIVE_SKILL_POOL = [
  { name: '物伤增幅', effect: '造成物理伤害时额外附加固定伤害' },
  { name: '法伤增幅', effect: '造成法术伤害时额外附加固定伤害' },
  { name: '体质治疗', effect: '恢复固定HP' },
  { name: '智力治疗', effect: '恢复固定HP（智力修正）' },
  { name: '力量吸血', effect: '物理伤害时恢复HP' },
  { name: '智力吸血', effect: '法术伤害时恢复HP' },
  { name: '生命护盾', effect: '获得固定护盾值' },
];

const PASSIVE_SKILL_POOL = [
  { name: '属性增强', effect: '固定增加某属性' },
  { name: '物理伤害', effect: '固定增加物理伤害值' },
  { name: '法术伤害', effect: '固定增加法术伤害值' },
  { name: '物理防御', effect: '固定增加物理防御' },
  { name: '法术防御', effect: '固定增加法术防御' },
  { name: 'HP加成', effect: '固定增加最大HP' },
];

const WORLD_DESCRIPTIONS: Record<string, string[]> = {
  恐怖: ['生化危机爆发', '诅咒之地', '寂静岭迷雾', '丧尸围城'],
  科幻: ['赛博朋克都市', '星际殖民地', '时间裂缝', 'AI叛乱'],
  奇幻: ['魔法学院', '龙之巢穴', '精灵森林', '地下城迷宫'],
  武侠: ['江湖门派纷争', '武林大会', '秘境寻宝', '魔教崛起'],
  仙侠: ['修仙宗门', '天劫降临', '仙界试炼', '妖兽横行'],
  末世: ['废土求生', '辐射废墟', '变异生物巢穴', '资源争夺战'],
  其他: ['异世界穿越', '梦境维度', '虚空裂隙', '元素领域'],
};

export class WorldGenerationService {
  static generateWorlds(rollFn: (formula: string) => { total: number }): GeneratedWorld[] {
    const count = rollFn('1d3+2').total;
    const worlds: GeneratedWorld[] = [];

    for (let i = 0; i < count; i++) {
      const tierRoll = rollFn('1d20').total;
      let tierOffset = '同等级';
      for (const [threshold, label] of WORLD_TIER_ROLL_MAP) {
        if (tierRoll <= threshold) { tierOffset = label; break; }
      }

      const type = WORLD_TYPES[Math.floor(Math.random() * WORLD_TYPES.length)];
      const difficulty = Math.ceil(Math.random() * 5);

      const descPool = WORLD_DESCRIPTIONS[type] || WORLD_DESCRIPTIONS['其他'];
      worlds.push({
        name: `${type}世界-${i + 1}`,
        tier: tierOffset,
        type,
        difficulty,
        description: descPool[Math.floor(Math.random() * descPool.length)],
      });
    }

    return worlds;
  }

  static generateSkills(
    rollFn: (formula: string) => { total: number },
    getSPV: (level: string) => number,
    level: string,
  ): GeneratedSkill[] {
    const spv = getSPV(level);
    const skills: GeneratedSkill[] = [];
    const isCombat = Math.random() < 0.75;

    if (isCombat) {
      const activeCount = rollFn('1d2+1').total;
      for (let i = 0; i < activeCount; i++) {
        const entry = ACTIVE_SKILL_POOL[Math.floor(Math.random() * ACTIVE_SKILL_POOL.length)];
        skills.push({ ...entry, type: '主动', spvValue: Math.floor(spv * (Math.random() * 0.5 + 1.6)) });
      }

      const passiveCount = rollFn('1d2').total;
      for (let i = 0; i < passiveCount; i++) {
        const entry = PASSIVE_SKILL_POOL[Math.floor(Math.random() * PASSIVE_SKILL_POOL.length)];
        skills.push({ ...entry, type: '被动', spvValue: Math.floor(spv * (Math.random() * 0.3 + 0.3)) });
      }
    } else {
      skills.push({
        name: ['开锁精通', '快速阅读', '驯兽术', '伪装潜行'][Math.floor(Math.random() * 4)],
        type: '主动',
        effect: '特殊辅助技能',
        spvValue: Math.floor(spv * 1.6),
      });
    }

    return skills;
  }
}
