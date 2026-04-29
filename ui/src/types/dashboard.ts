export interface DashboardPlayer {
  name: string;
  status: string;
  position: string;
  resources: ResourceItem[];
  baseAttrs: AttributeItem[];
  specialAttrs: AttributeItem[];
}

export interface ResourceItem {
  name: string;
  value: string | number;
}

export interface AttributeItem {
  name: string;
  value: string | number;
}

export interface DashboardNpc {
  name: string;
  status: string;
  position: string;
  inScene: boolean;
  rowIndex: number;
  tableKey: string;
}

export interface DashboardLocation {
  name: string;
  description: string;
  isCurrent: boolean;
  rowIndex: number;
  tableKey: string;
}

export interface DashboardQuest {
  name: string;
  type: string;
  status: string;
  priority: string;
  progress: string;
  rowIndex: number;
  tableKey: string;
}

export interface DashboardItem {
  name: string;
  count: string | number;
  type: string;
}

export interface DashboardEquip {
  name: string;
  type: string;
  part: string;
}

export interface DashboardData {
  player: DashboardPlayer | null;
  npcs: DashboardNpc[];
  locations: DashboardLocation[];
  quests: DashboardQuest[];
  items: DashboardItem[];
  equips: DashboardEquip[];
  currentLocation: string;
}

export interface DashboardTableConfig {
  tableKeywords: string[];
  columns: Record<string, { column: string; includes?: string[] }>;
}

export const DASHBOARD_TABLE_CONFIG: Record<string, DashboardTableConfig> = {
  global: {
    tableKeywords: ['全局数据表', '全局数据', '全局'],
    columns: {
      detailLocation: { column: '详细地点' },
      currentLocation: { column: '次要地区' },
    },
  },
  player: {
    tableKeywords: ['主角信息', '玩家信息', '主角'],
    columns: {
      name: { column: '姓名' },
      status: { column: '状态' },
      position: { column: '位置' },
      baseAttrs: { column: '基础属性' },
      specialAttrs: { column: '特有属性' },
      resources: { column: '资源' },
      money: { column: '金钱' },
    },
  },
  location: {
    tableKeywords: ['世界地图点', '地图点', '地点'],
    columns: {
      name: { column: '地点名称' },
      description: { column: '描述' },
    },
  },
  npc: {
    tableKeywords: ['重要角色表', '重要人物表', 'NPC表', '角色表'],
    columns: {
      name: { column: '姓名' },
      status: { column: '状态' },
      position: { column: '位置' },
      inScene: { column: '在场', includes: ['是', 'true', '在场', 'yes'] },
    },
  },
  quest: {
    tableKeywords: ['任务表', '备忘事项', '任务'],
    columns: {
      name: { column: '名称' },
      type: { column: '类型' },
      status: { column: '状态' },
      priority: { column: '优先级' },
      progress: { column: '进度' },
    },
  },
  bag: {
    tableKeywords: ['物品表', '背包', '物品'],
    columns: {
      name: { column: '物品名称' },
      count: { column: '数量' },
      type: { column: '类型' },
    },
  },
  equip: {
    tableKeywords: ['装备表', '装备'],
    columns: {
      name: { column: '装备名称' },
      type: { column: '类型' },
      part: { column: '部位' },
      isEquipped: { column: '装备状态', includes: ['已装备', '装备中', 'true', '是'] },
    },
  },
};

export interface ChangeRecord {
  id: string;
  timestamp: number;
  characterName: string;
  attributeName: string;
  oldValue: unknown;
  newValue: unknown;
  operation: 'add' | 'subtract' | 'set';
  source: string;
}

export interface RelationNode {
  id: string;
  name: string;
  type: 'player' | 'npc';
  avatar?: string;
  group?: string;
}

export interface RelationEdge {
  source: string;
  target: string;
  relation: string;
}
