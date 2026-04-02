export const Schema = z.object({
  // ==================== 玩家基础属性 ====================
  玩家: z.object({
    名称: z.string().default('冒险者'),

    // 六维基础属性 (60点自由分配, 单项5-15)
    基础属性: z.object({
      力量: z.coerce.number().min(5).max(30).default(10), // 物理伤害、物理防御
      敏捷: z.coerce.number().min(5).max(30).default(10), // 先攻、DDC
      体质: z.coerce.number().min(5).max(30).default(10), // HP
      智力: z.coerce.number().min(5).max(30).default(10), // 法术伤害、法术防御
      感知: z.coerce.number().min(5).max(30).default(10), // DDC、察觉检定
      魅力: z.coerce.number().min(5).max(30).default(10), // 暴击率、社交检定
    }),

    // 等级与沉淀点
    等级: z.enum(['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级', 'SS级', 'SSS级']).default('F级'),
    沉淀点: z.coerce.number().min(0).default(0), // 溢出属性转化的沉淀点

    // 战斗属性 (根据基础属性计算)
    战斗属性: z.object({
      HP: z.object({
        当前: z.coerce.number().default(50),
        最大: z.coerce.number().default(50),
      }),
      护盾: z.coerce.number().min(0).default(0),
      物理攻击: z.coerce.number().default(10),
      法术攻击: z.coerce.number().default(10),
      物理防御: z.coerce.number().default(10),
      法术防御: z.coerce.number().default(10),
      DDC: z.coerce.number().default(10), // 动态防御等级 = 10 + 敏捷/感知取高
      暴击率: z.coerce.number().min(0).max(50).default(10), // 5% + 魅力/2
    }),

    // 状态效果
    状态: z
      .array(
        z.object({
          名称: z.string(),
          效果: z.string(),
          剩余回合: z.coerce.number().min(0).default(1),
        }),
      )
      .default([]),

    // 种族与血脉
    种族: z.string().default('人类'),
    血脉: z.string().default('无'),

    // 性格特征 (1个被动)
    性格特征: z
      .array(
        z.object({
          名称: z.string(),
          效果: z.string(),
        }),
      )
      .default([]),

    // 技能列表
    技能: z
      .array(
        z.object({
          名称: z.string(),
          等级: z.enum(['F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级']).default('F级'),
          类型: z.enum(['主动', '被动', '其他']).default('主动'),
          冷却: z.coerce.number().min(0).default(0),
          当前冷却: z.coerce.number().min(0).default(0),
          效果: z.string(),
          词条: z.array(z.string()).default([]),
        }),
      )
      .default([]),

    // 装备
    装备: z
      .object({
        武器: z
          .object({
            名称: z.string().default(''),
            等级: z.enum(['', 'F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级']).default(''),
            物伤加成: z.coerce.number().default(0),
            法伤加成: z.coerce.number().default(0),
          })
          .default({}),
        防具: z
          .object({
            名称: z.string().default(''),
            等级: z.enum(['', 'F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级']).default(''),
            物防加成: z.coerce.number().default(0),
            法防加成: z.coerce.number().default(0),
            HP加成: z.coerce.number().default(0),
          })
          .default({}),
        饰品: z
          .array(
            z.object({
              名称: z.string(),
              效果: z.string(),
            }),
          )
          .default([]),
      })
      .default({}),

    // 物品栏
    物品栏: z
      .record(
        z.string().describe('物品名'),
        z.object({
          描述: z.string(),
          数量: z.coerce.number().min(0).default(1),
          类型: z.enum(['消耗品', '材料', '任务道具', '特殊']).default('消耗品'),
        }),
      )
      .default({}),

    // 兑换点 (货币)
    兑换点: z.coerce.number().min(0).default(100),

    // 当前位置
    位置: z.string().default('乾坤界'),
  }),

  // ==================== 任务系统 ====================
  任务: z.object({
    主线: z
      .object({
        名称: z.string().default(''),
        完成度: z.coerce.number().min(0).max(100).default(0),
        描述: z.string().default(''),
      })
      .default({}),
    支线: z
      .array(
        z.object({
          名称: z.string(),
          完成度: z.coerce.number().min(0).max(100).default(0),
          描述: z.string(),
        }),
      )
      .default([]),
  }),

  // ==================== 世界状态 ====================
  世界: z.object({
    当前场景: z.string().default('乾坤界'),
    当前世界: z
      .object({
        名称: z.string().default(''),
        等级: z.enum(['', 'F级', 'E级', 'D级', 'C级', 'B级', 'A级', 'S级']).default(''),
        类型: z.enum(['', '恐怖', '科幻', '奇幻', '武侠', '仙侠', '末世', '其他']).default(''),
      })
      .default({}),
    关键NPC: z
      .array(
        z.object({
          名称: z.string(),
          关系: z.string(),
          状态: z.string().default('存活'),
        }),
      )
      .default([]),
    战斗状态: z.boolean().default(false),
    回合数: z.coerce.number().min(0).default(0),
    环境侵蚀: z.boolean().default(false), // 第5回合后开启
  }),

  // ==================== 战斗记录 ====================
  战斗: z
    .object({
      敌人: z
        .array(
          z.object({
            名称: z.string(),
            HP: z.object({
              当前: z.coerce.number(),
              最大: z.coerce.number(),
            }),
            状态: z.array(z.string()).default([]),
          }),
        )
        .default([]),
      战斗日志: z.array(z.string()).default([]),
    })
    .default({}),

  // ==================== 游戏进度 ====================
  进度: z
    .object({
      完成世界数: z.coerce.number().min(0).default(0),
      当前世界存活时间: z.coerce.number().default(0), // 小时
      总游戏时间: z.coerce.number().default(0),
      死亡次数: z.coerce.number().min(0).default(0),
    })
    .default({}),
});

export type Schema = z.output<typeof Schema>;
