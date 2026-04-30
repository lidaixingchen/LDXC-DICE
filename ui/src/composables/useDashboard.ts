import { ref, computed, readonly } from 'vue';
import type {
  DashboardData,
  DashboardPlayer,
  DashboardNpc,
  DashboardLocation,
  DashboardQuest,
  DashboardItem,
  DashboardEquip,
  DashboardTableConfig,
  ResourceItem,
  AttributeItem,
  ChangeRecord,
  RelationNode,
  RelationEdge,
} from '../types/dashboard';

const DASHBOARD_TABLE_CONFIG_OBJ: Record<string, DashboardTableConfig> = {
  global: {
    tableKeywords: ['全局数据表', '全局数据', '全局', '世界设定', '世界信息'],
    columns: {
      detailLocation: { column: '详细地点' },
      currentLocation: { column: '次要地区' },
    },
  },
  player: {
    tableKeywords: ['主角信息', '玩家信息', '主角', '玩家', '角色信息', '主角色'],
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
    tableKeywords: ['世界地图点', '地图点', '地点', '位置', '地图', '场景'],
    columns: {
      name: { column: '地点名称' },
      description: { column: '描述' },
    },
  },
  npc: {
    tableKeywords: ['重要角色表', '重要人物表', 'NPC表', '角色表', '人物表', '角色', '人物', 'npc'],
    columns: {
      name: { column: '姓名' },
      status: { column: '状态' },
      position: { column: '位置' },
      inScene: { column: '在场', includes: ['是', 'true', '在场', 'yes'] },
    },
  },
  quest: {
    tableKeywords: ['任务表', '备忘事项', '任务', '委托', '目标'],
    columns: {
      name: { column: '名称' },
      type: { column: '类型' },
      status: { column: '状态' },
      priority: { column: '优先级' },
      progress: { column: '进度' },
    },
  },
  bag: {
    tableKeywords: ['物品表', '背包', '物品', '道具', '背包表', '物品栏'],
    columns: {
      name: { column: '物品名称' },
      count: { column: '数量' },
      type: { column: '类型' },
    },
  },
  equip: {
    tableKeywords: ['装备表', '装备', '武器', '防具'],
    columns: {
      name: { column: '装备名称' },
      type: { column: '类型' },
      part: { column: '部位' },
      isEquipped: { column: '装备状态', includes: ['已装备', '装备中', 'true', '是'] },
    },
  },
};

const CHANGES_STORAGE_KEY = 'acu_changes_records';
const DASHBOARD_VISIBLE_KEY = 'acu_dashboard_visible';

const dashboardData = ref<DashboardData>({
  player: null,
  npcs: [],
  locations: [],
  quests: [],
  items: [],
  equips: [],
  currentLocation: '',
});

const changes = ref<ChangeRecord[]>([]);
const isVisible = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const allTables = ref<{ key: string; name: string }[]>([]);

function getDbAPI(): any {
  let topWindow: Window = window;
  try {
    while (topWindow.parent && topWindow.parent !== topWindow) {
      topWindow = topWindow.parent;
    }
  } catch {
    // cross-origin
  }
  return (topWindow as any).AutoCardUpdaterAPI || (window as any).AutoCardUpdaterAPI;
}

function getTableData(options?: { silent?: boolean }): Record<string, any> | null {
  const api = getDbAPI();
  if (!api) {
    console.warn('[Dashboard] API 不可用');
    return null;
  }
  if (typeof api.exportTableAsJson !== 'function') {
    console.warn('[Dashboard] exportTableAsJson 方法不存在');
    return null;
  }
  try {
    const data = api.exportTableAsJson();
    if (data) {
      const tables: { key: string; name: string }[] = [];
      for (const key in data) {
        if (key.startsWith('sheet_') && data[key]?.name) {
          tables.push({ key, name: data[key].name });
        }
      }
      allTables.value = tables;
      if (!options?.silent) {
        console.log('[Dashboard] 获取到表格:', tables.map(t => t.name).join(', '));
      }
    }
    return data;
  } catch (e) {
    console.error('[Dashboard] 获取表格数据失败:', e);
    return null;
  }
}

function findTableByKeywords(
  data: Record<string, any>,
  moduleKey: string,
): { key: string; name: string; headers: string[]; rows: any[][] } | null {
  const config = DASHBOARD_TABLE_CONFIG_OBJ[moduleKey];
  if (!config) return null;

  for (const keyword of config.tableKeywords) {
    for (const key in data) {
      if (key.startsWith('sheet_')) {
        const sheet = data[key];
        const tableName = (sheet?.name || '').toLowerCase();
        if (tableName.includes(keyword.toLowerCase())) {
          const content = sheet.content || [];
          if (content.length >= 1) {
            console.log(`[Dashboard] 找到 ${moduleKey} 表: ${sheet.name} (关键词: ${keyword})`);
            return {
              key,
              name: sheet.name,
              headers: content[0] || [],
              rows: content.slice(1),
            };
          }
        }
      }
    }
  }
  console.log(`[Dashboard] 未找到 ${moduleKey} 表，关键词: ${config.tableKeywords.join(', ')}`);
  return null;
}

function findColumnIndex(headers: string[], columnName: string): number {
  return headers.findIndex(h => h && String(h).includes(columnName));
}

function getCellValue(row: any[], headers: string[], columnName: string): any {
  const idx = findColumnIndex(headers, columnName);
  return idx >= 0 ? row[idx] : null;
}

function parseAttributeString(str: string): AttributeItem[] {
  if (!str) return [];
  const result: AttributeItem[] = [];
  const parts = str.split(/[;；,，\n]/);
  for (const part of parts) {
    const match = part.trim().match(/^(.+?)[：:＝=\s]*(.+)$/);
    if (match) {
      result.push({
        name: match[1].trim(),
        value: match[2].trim(),
      });
    }
  }
  return result;
}

function parsePlayerData(tableData: ReturnType<typeof findTableByKeywords>): DashboardPlayer | null {
  if (!tableData || tableData.rows.length === 0) return null;

  const { headers, rows } = tableData;
  const row = rows[0];

  const name = String(getCellValue(row, headers, '姓名') || '主角');
  const status = String(getCellValue(row, headers, '状态') || '正常');
  const position = String(getCellValue(row, headers, '位置') || '');

  const resources: ResourceItem[] = [];
  const baseAttrs: AttributeItem[] = [];
  const specialAttrs: AttributeItem[] = [];

  headers.forEach((h, idx) => {
    if (!h) return;
    const val = row[idx];
    if (!val) return;

    const headerLower = String(h).toLowerCase();
    if (headerLower.includes('基础属性') || (headerLower.includes('属性') && !headerLower.includes('特有'))) {
      baseAttrs.push(...parseAttributeString(String(val)));
    } else if (headerLower.includes('特有属性') || headerLower.includes('特殊')) {
      specialAttrs.push(...parseAttributeString(String(val)));
    } else if (headerLower.includes('资源') || headerLower.includes('金钱') || headerLower.includes('货币')) {
      const parsed = parseAttributeString(String(val));
      resources.push(...parsed);
    }
  });

  return {
    name,
    status,
    position,
    resources,
    baseAttrs,
    specialAttrs,
  };
}

function parseNpcData(tableData: ReturnType<typeof findTableByKeywords>): DashboardNpc[] {
  if (!tableData) return [];

  const { headers, rows, key } = tableData;

  return rows
    .filter(row => row && row.some(cell => cell))
    .map((row, idx) => {
      const name = String(getCellValue(row, headers, '姓名') || getCellValue(row, headers, '名字') || '未知');
      const status = String(getCellValue(row, headers, '状态') || '');
      const position = String(getCellValue(row, headers, '位置') || '');
      const inSceneVal = String(getCellValue(row, headers, '在场') || '').toLowerCase();
      const inScene = ['是', 'true', '在场', 'yes', '1'].includes(inSceneVal);

      return {
        name,
        status,
        position,
        inScene,
        rowIndex: idx,
        tableKey: key,
      };
    });
}

function parseLocationData(
  tableData: ReturnType<typeof findTableByKeywords>,
  currentLocation: string,
): DashboardLocation[] {
  if (!tableData) return [];

  const { headers, rows, key } = tableData;

  return rows
    .filter(row => row && row.some(cell => cell))
    .map((row, idx) => {
      const name = String(getCellValue(row, headers, '地点名称') || getCellValue(row, headers, '名称') || getCellValue(row, headers, '地点') || '未知');
      const description = String(getCellValue(row, headers, '描述') || '');
      const isCurrent = Boolean(
        currentLocation &&
        (name.includes(currentLocation) || currentLocation.includes(name)),
      );

      return {
        name,
        description,
        isCurrent,
        rowIndex: idx,
        tableKey: key,
      };
    });
}

function parseQuestData(tableData: ReturnType<typeof findTableByKeywords>): DashboardQuest[] {
  if (!tableData) return [];

  const { headers, rows, key } = tableData;

  const quests = rows
    .filter(row => row && row.some(cell => cell))
    .map((row, idx) => ({
      name: String(getCellValue(row, headers, '名称') || getCellValue(row, headers, '任务名称') || '任务'),
      type: String(getCellValue(row, headers, '类型') || ''),
      status: String(getCellValue(row, headers, '状态') || ''),
      priority: String(getCellValue(row, headers, '优先级') || ''),
      progress: String(getCellValue(row, headers, '进度') || ''),
      rowIndex: idx,
      tableKey: key,
    }));

  return quests.sort((a, b) => {
    const aStatus = a.status.toLowerCase();
    const bStatus = b.status.toLowerCase();

    const aInProgress = aStatus.includes('进行') || aStatus.includes('active');
    const bInProgress = bStatus.includes('进行') || bStatus.includes('active');

    if (aInProgress !== bInProgress) {
      return aInProgress ? -1 : 1;
    }

    const typeOrder = (t: string) => {
      if (t.includes('主线')) return 0;
      if (t.includes('支线')) return 1;
      if (t.includes('日常')) return 2;
      return 3;
    };

    return typeOrder(a.type) - typeOrder(b.type);
  });
}

function parseItemData(tableData: ReturnType<typeof findTableByKeywords>): DashboardItem[] {
  if (!tableData) return [];

  const { headers, rows } = tableData;

  return rows
    .filter(row => row && row.some(cell => cell))
    .map(row => ({
      name: String(getCellValue(row, headers, '物品名称') || getCellValue(row, headers, '名称') || '未知物品'),
      count: getCellValue(row, headers, '数量') || '1',
      type: String(getCellValue(row, headers, '类型') || ''),
    }));
}

function parseEquipData(tableData: ReturnType<typeof findTableByKeywords>): DashboardEquip[] {
  if (!tableData) return [];

  const { headers, rows } = tableData;

  return rows
    .filter(row => row && row.some(cell => cell))
    .filter(row => {
      const equippedVal = String(getCellValue(row, headers, '装备状态') || getCellValue(row, headers, '状态') || '').toLowerCase();
      return ['已装备', '装备中', 'true', '是', '1'].includes(equippedVal);
    })
    .map(row => ({
      name: String(getCellValue(row, headers, '装备名称') || getCellValue(row, headers, '名称') || '未知装备'),
      type: String(getCellValue(row, headers, '类型') || ''),
      part: String(getCellValue(row, headers, '部位') || ''),
    }));
}

function getCurrentLocation(globalTable: ReturnType<typeof findTableByKeywords>, player: DashboardPlayer | null): string {
  if (!globalTable) {
    return player?.position?.split('-')[0]?.trim() || '';
  }

  const { headers, rows } = globalTable;
  if (rows.length === 0) {
    return player?.position?.split('-')[0]?.trim() || '';
  }

  const row = rows[0];
  const detailLocation = String(getCellValue(row, headers, '详细地点') || getCellValue(row, headers, '当前位置') || '');
  const currentLocation = String(getCellValue(row, headers, '次要地区') || getCellValue(row, headers, '地区') || '');

  return detailLocation || currentLocation || player?.position?.split('-')[0]?.trim() || '';
}

function refresh(): void {
  loading.value = true;
  error.value = null;

  try {
    const rawData = getTableData();
    if (!rawData) {
      error.value = '无法获取数据库数据';
      loading.value = false;
      return;
    }

    const globalTable = findTableByKeywords(rawData, 'global');
    const playerTable = findTableByKeywords(rawData, 'player');
    const locationTable = findTableByKeywords(rawData, 'location');
    const npcTable = findTableByKeywords(rawData, 'npc');
    const questTable = findTableByKeywords(rawData, 'quest');
    const bagTable = findTableByKeywords(rawData, 'bag');
    const equipTable = findTableByKeywords(rawData, 'equip');

    const player = parsePlayerData(playerTable);
    const currentLocation = getCurrentLocation(globalTable, player);

    dashboardData.value = {
      player,
      npcs: parseNpcData(npcTable),
      locations: parseLocationData(locationTable, currentLocation),
      quests: parseQuestData(questTable),
      items: parseItemData(bagTable),
      equips: parseEquipData(equipTable),
      currentLocation,
    };

    console.log('[Dashboard] 数据刷新完成:', {
      player: player?.name,
      npcs: dashboardData.value.npcs.length,
      locations: dashboardData.value.locations.length,
      quests: dashboardData.value.quests.length,
      items: dashboardData.value.items.length,
    });

    loading.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : '刷新数据失败';
    console.error('[Dashboard] 刷新失败:', e);
    loading.value = false;
  }
}

function show(): void {
  isVisible.value = true;
  refresh();
}

function hide(): void {
  isVisible.value = false;
}

function toggle(): void {
  if (isVisible.value) {
    hide();
  } else {
    show();
  }
}

function addChange(record: Omit<ChangeRecord, 'id' | 'timestamp'>): void {
  const newRecord: ChangeRecord = {
    ...record,
    id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  changes.value.unshift(newRecord);

  if (changes.value.length > 100) {
    changes.value = changes.value.slice(0, 100);
  }

  saveChanges();
}

function clearChanges(): void {
  changes.value = [];
  saveChanges();
}

function loadChanges(): void {
  try {
    const stored = localStorage.getItem(CHANGES_STORAGE_KEY);
    if (stored) {
      changes.value = JSON.parse(stored);
    }
  } catch {
    changes.value = [];
  }
}

function saveChanges(): void {
  try {
    localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(changes.value));
  } catch {
    // ignore
  }
}

function parseRelationData(npcTable: ReturnType<typeof findTableByKeywords>): { nodes: RelationNode[]; edges: RelationEdge[] } {
  const nodes: RelationNode[] = [];
  const edges: RelationEdge[] = [];

  if (!npcTable) return { nodes, edges };

  const { headers, rows } = npcTable;
  const relationCol = headers.findIndex(h => h && String(h).includes('关系'));

  if (relationCol === -1) return { nodes, edges };

  const nameSet = new Set<string>();

  rows.forEach((row, idx) => {
    const name = String(getCellValue(row, headers, '姓名') || '');
    if (!name) return;

    nameSet.add(name);
    nodes.push({
      id: `npc_${idx}`,
      name,
      type: 'npc',
    });

    const relations = String(row[relationCol] || '');
    if (!relations) return;

    const relationParts = relations.split(/[;；]/);
    relationParts.forEach(part => {
      const match = part.trim().match(/^(.+?)[：:＝=\s]*(.+)$/);
      if (match) {
        const targetName = match[1].trim();
        const relationType = match[2].trim();

        if (targetName && relationType) {
          nameSet.add(targetName);
          edges.push({
            source: name,
            target: targetName,
            relation: relationType,
          });
        }
      }
    });
  });

  nameSet.forEach(name => {
    if (!nodes.find(n => n.name === name)) {
      nodes.push({
        id: `node_${name}`,
        name,
        type: 'npc',
      });
    }
  });

  return { nodes, edges };
}

const inSceneNpcs = computed(() => dashboardData.value.npcs.filter(n => n.inScene));
const offSceneNpcs = computed(() => dashboardData.value.npcs.filter(n => !n.inScene));
const activeQuests = computed(() => dashboardData.value.quests.filter(q => q.status.includes('进行') || q.status.toLowerCase().includes('active')));
const completedQuests = computed(() => dashboardData.value.quests.filter(q => !q.status.includes('进行') && !q.status.toLowerCase().includes('active')));

export function useDashboard() {
  return {
    dashboardData: readonly(dashboardData),
    changes: readonly(changes),
    isVisible: readonly(isVisible),
    loading: readonly(loading),
    error: readonly(error),
    allTables: readonly(allTables),
    inSceneNpcs,
    offSceneNpcs,
    activeQuests,
    completedQuests,
    refresh,
    show,
    hide,
    toggle,
    addChange,
    clearChanges,
    loadChanges,
    getTableData,
    findTableByKeywords,
    parseRelationData,
  };
}
