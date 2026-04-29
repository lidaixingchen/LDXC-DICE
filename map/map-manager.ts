import type {
  DiceMap,
  MapToken,
  MapShape,
  MapLayer,
  MapPosition,
  MapSize,
  MapViewport,
  MapSnapshot,
  MapInteraction,
  MapFogRegion,
  MapGrid,
  MapBackground,
  MapSettings,
} from './types';
import {
  MAP_VERSION,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_GRID,
  DEFAULT_MAP_SIZE,
} from './types';

const MAPS_STORAGE_KEY = 'acu_dice_maps';
const SNAPSHOTS_STORAGE_KEY = 'acu_dice_map_snapshots';

type MapChangeCallback = (map: DiceMap | null) => void;

export class MapManager {
  private maps: Map<string, DiceMap> = new Map();
  private currentMapId: string | null = null;
  private snapshots: Map<string, MapSnapshot[]> = new Map();
  private viewport: MapViewport = { x: 0, y: 0, zoom: 1, rotation: 0 };
  private callbacks: Set<MapChangeCallback> = new Set();
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const storedMaps = localStorage.getItem(MAPS_STORAGE_KEY);
      if (storedMaps) {
        const data = JSON.parse(storedMaps);
        for (const map of data) {
          if (map.id) {
            this.maps.set(map.id, map);
          }
        }
      }

      const storedSnapshots = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (storedSnapshots) {
        const data = JSON.parse(storedSnapshots);
        for (const snapshot of data) {
          if (snapshot.mapId) {
            if (!this.snapshots.has(snapshot.mapId)) {
              this.snapshots.set(snapshot.mapId, []);
            }
            this.snapshots.get(snapshot.mapId)!.push(snapshot);
          }
        }
      }
    } catch (e) {
      console.warn('[MapManager] 加载地图数据失败:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(Array.from(this.maps.values())));
      const allSnapshots = Array.from(this.snapshots.values()).flat();
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(allSnapshots));
    } catch (e) {
      console.warn('[MapManager] 保存地图数据失败:', e);
    }
  }

  createMap(options: {
    name: string;
    description?: string;
    size?: MapSize;
    background?: MapBackground;
    grid?: MapGrid;
    settings?: Partial<MapSettings>;
  }): DiceMap {
    const id = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const map: DiceMap = {
      id,
      name: options.name,
      description: options.description,
      version: MAP_VERSION,
      createdAt: now,
      updatedAt: now,
      size: options.size || DEFAULT_MAP_SIZE,
      background: options.background || { type: 'color', color: '#1e1e2e' },
      grid: options.grid || { ...DEFAULT_GRID },
      layers: this.createDefaultLayers(),
      tokens: [],
      shapes: [],
      fog: {
        enabled: false,
        mode: 'none',
        regions: [],
      },
      interactions: [],
      settings: { ...DEFAULT_MAP_SETTINGS, ...options.settings },
      metadata: {},
    };

    this.maps.set(id, map);
    this.saveToStorage();
    console.log(`[MapManager] 创建地图: ${options.name}`);
    return map;
  }

  private createDefaultLayers(): MapLayer[] {
    return [
      {
        id: 'layer_background',
        name: '背景层',
        type: 'background',
        visible: true,
        locked: true,
        opacity: 1,
        zIndex: 0,
        data: null,
      },
      {
        id: 'layer_grid',
        name: '网格层',
        type: 'grid',
        visible: true,
        locked: true,
        opacity: 1,
        zIndex: 1,
        data: null,
      },
      {
        id: 'layer_drawings',
        name: '绘图层',
        type: 'drawings',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 2,
        data: [],
      },
      {
        id: 'layer_tokens',
        name: '令牌层',
        type: 'tokens',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 3,
        data: [],
      },
      {
        id: 'layer_effects',
        name: '效果层',
        type: 'effects',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 4,
        data: [],
      },
      {
        id: 'layer_fog',
        name: '迷雾层',
        type: 'fog',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 5,
        data: [],
      },
    ];
  }

  deleteMap(id: string): boolean {
    const result = this.maps.delete(id);
    if (result) {
      this.snapshots.delete(id);
      if (this.currentMapId === id) {
        this.currentMapId = null;
        this.notifyChange(null);
      }
      this.saveToStorage();
      console.log(`[MapManager] 删除地图: ${id}`);
    }
    return result;
  }

  getMap(id: string): DiceMap | null {
    return this.maps.get(id) || null;
  }

  getCurrentMap(): DiceMap | null {
    if (!this.currentMapId) return null;
    return this.maps.get(this.currentMapId) || null;
  }

  setCurrentMap(id: string): boolean {
    if (!this.maps.has(id)) return false;
    this.saveToStorage();
    this.currentMapId = id;
    this.setupAutoSave();
    this.notifyChange(this.getCurrentMap());
    console.log(`[MapManager] 切换地图: ${id}`);
    return true;
  }

  getAllMaps(): DiceMap[] {
    return Array.from(this.maps.values());
  }

  updateMap(id: string, updates: Partial<Omit<DiceMap, 'id' | 'createdAt'>>): boolean {
    const map = this.maps.get(id);
    if (!map) return false;

    const updated: DiceMap = {
      ...map,
      ...updates,
      id: map.id,
      createdAt: map.createdAt,
      updatedAt: Date.now(),
    };

    this.maps.set(id, updated);
    this.saveToStorage();

    if (this.currentMapId === id) {
      this.notifyChange(updated);
    }

    return true;
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    const map = this.getCurrentMap();
    if (map?.settings.autoSave) {
      this.autoSaveTimer = setInterval(() => {
        this.saveToStorage();
      }, map.settings.autoSaveInterval);
    }
  }

  addToken(mapId: string, token: Omit<MapToken, 'id'>): MapToken | null {
    const map = this.maps.get(mapId);
    if (!map) return null;

    const newToken: MapToken = {
      ...token,
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    map.tokens.push(newToken);
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return newToken;
  }

  updateToken(mapId: string, tokenId: string, updates: Partial<MapToken>): boolean {
    const map = this.maps.get(mapId);
    if (!map) return false;

    const idx = map.tokens.findIndex(t => t.id === tokenId);
    if (idx < 0) return false;

    map.tokens[idx] = { ...map.tokens[idx], ...updates };
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return true;
  }

  moveToken(mapId: string, tokenId: string, position: MapPosition): boolean {
    return this.updateToken(mapId, tokenId, { position });
  }

  removeToken(mapId: string, tokenId: string): boolean {
    const map = this.maps.get(mapId);
    if (!map) return false;

    const idx = map.tokens.findIndex(t => t.id === tokenId);
    if (idx < 0) return false;

    map.tokens.splice(idx, 1);
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return true;
  }

  getTokenAt(mapId: string, position: MapPosition): MapToken | null {
    const map = this.maps.get(mapId);
    if (!map) return null;

    for (const token of map.tokens) {
      if (token.hidden) continue;
      const bounds = {
        x: token.position.x,
        y: token.position.y,
        width: token.size.width,
        height: token.size.height,
      };
      if (
        position.x >= bounds.x &&
        position.x <= bounds.x + bounds.width &&
        position.y >= bounds.y &&
        position.y <= bounds.y + bounds.height
      ) {
        return token;
      }
    }

    return null;
  }

  addShape(mapId: string, shape: Omit<MapShape, 'id'>): MapShape | null {
    const map = this.maps.get(mapId);
    if (!map) return null;

    const newShape: MapShape = {
      ...shape,
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    map.shapes.push(newShape);
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return newShape;
  }

  updateShape(mapId: string, shapeId: string, updates: Partial<MapShape>): boolean {
    const map = this.maps.get(mapId);
    if (!map) return false;

    const idx = map.shapes.findIndex(s => s.id === shapeId);
    if (idx < 0) return false;

    map.shapes[idx] = { ...map.shapes[idx], ...updates };
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return true;
  }

  removeShape(mapId: string, shapeId: string): boolean {
    const map = this.maps.get(mapId);
    if (!map) return false;

    const idx = map.shapes.findIndex(s => s.id === shapeId);
    if (idx < 0) return false;

    map.shapes.splice(idx, 1);
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return true;
  }

  addInteraction(mapId: string, interaction: Omit<MapInteraction, 'id'>): MapInteraction | null {
    const map = this.maps.get(mapId);
    if (!map) return null;

    const newInteraction: MapInteraction = {
      ...interaction,
      id: `interact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    map.interactions.push(newInteraction);
    map.updatedAt = Date.now();
    this.saveToStorage();

    return newInteraction;
  }

  removeInteraction(mapId: string, interactionId: string): boolean {
    const map = this.maps.get(mapId);
    if (!map) return false;

    const idx = map.interactions.findIndex(i => i.id === interactionId);
    if (idx < 0) return false;

    map.interactions.splice(idx, 1);
    map.updatedAt = Date.now();
    this.saveToStorage();

    return true;
  }

  addFogRegion(mapId: string, region: Omit<MapFogRegion, 'id'>): MapFogRegion | null {
    const map = this.maps.get(mapId);
    if (!map) return null;

    const newRegion: MapFogRegion = {
      ...region,
      id: `fog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    map.fog.regions.push(newRegion);
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return newRegion;
  }

  removeFogRegion(mapId: string, regionId: string): boolean {
    const map = this.maps.get(mapId);
    if (!map) return false;

    const idx = map.fog.regions.findIndex(r => r.id === regionId);
    if (idx < 0) return false;

    map.fog.regions.splice(idx, 1);
    map.updatedAt = Date.now();
    this.saveToStorage();

    if (this.currentMapId === mapId) {
      this.notifyChange(map);
    }

    return true;
  }

  createSnapshot(mapId: string, name: string): MapSnapshot | null {
    const map = this.maps.get(mapId);
    if (!map) return null;

    const snapshot: MapSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mapId,
      name,
      timestamp: Date.now(),
      tokens: JSON.parse(JSON.stringify(map.tokens)),
      shapes: JSON.parse(JSON.stringify(map.shapes)),
      fog: JSON.parse(JSON.stringify(map.fog)),
    };

    if (!this.snapshots.has(mapId)) {
      this.snapshots.set(mapId, []);
    }
    this.snapshots.get(mapId)!.push(snapshot);
    this.saveToStorage();

    return snapshot;
  }

  restoreSnapshot(snapshotId: string): boolean {
    for (const [mapId, snapshots] of this.snapshots) {
      const snapshot = snapshots.find(s => s.id === snapshotId);
      if (snapshot) {
        return this.updateMap(mapId, {
          tokens: JSON.parse(JSON.stringify(snapshot.tokens)),
          shapes: JSON.parse(JSON.stringify(snapshot.shapes)),
          fog: JSON.parse(JSON.stringify(snapshot.fog)),
        });
      }
    }
    return false;
  }

  getSnapshots(mapId: string): MapSnapshot[] {
    return this.snapshots.get(mapId) || [];
  }

  deleteSnapshot(snapshotId: string): boolean {
    for (const [mapId, snapshots] of this.snapshots) {
      const idx = snapshots.findIndex(s => s.id === snapshotId);
      if (idx >= 0) {
        snapshots.splice(idx, 1);
        this.saveToStorage();
        return true;
      }
    }
    return false;
  }

  getViewport(): MapViewport {
    return { ...this.viewport };
  }

  setViewport(viewport: Partial<MapViewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }

  zoomIn(factor: number = 1.2): void {
    this.viewport.zoom = Math.min(5, this.viewport.zoom * factor);
  }

  zoomOut(factor: number = 0.8): void {
    this.viewport.zoom = Math.max(0.1, this.viewport.zoom * factor);
  }

  resetViewport(): void {
    this.viewport = { x: 0, y: 0, zoom: 1, rotation: 0 };
  }

  onChange(callback: MapChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyChange(map: DiceMap | null): void {
    for (const callback of this.callbacks) {
      try {
        callback(map);
      } catch (e) {
        console.error('[MapManager] 回调执行失败:', e);
      }
    }
  }

  exportMap(id: string): string | null {
    const map = this.maps.get(id);
    if (!map) return null;

    const exportData = {
      version: MAP_VERSION,
      map,
      snapshots: this.snapshots.get(id) || [],
      exportedAt: Date.now(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  importMap(json: string): DiceMap | null {
    try {
      const data = JSON.parse(json);

      if (!data.map || !data.map.id) {
        console.error('[MapManager] 无效的地图数据');
        return null;
      }

      const map = data.map as DiceMap;

      if (typeof map.name !== 'string') map.name = '未命名地图';
      if (!Array.isArray(map.tokens)) map.tokens = [];
      if (!Array.isArray(map.shapes)) map.shapes = [];
      if (!Array.isArray(map.interactions)) map.interactions = [];
      if (!map.fog || typeof map.fog !== 'object') {
        map.fog = { enabled: false, mode: 'none', regions: [] };
      }
      if (!Array.isArray(map.fog.regions)) map.fog.regions = [];
      if (!map.layers || !Array.isArray(map.layers)) {
        map.layers = this.createDefaultLayers();
      }
      if (!map.size || typeof map.size !== 'object') {
        map.size = { ...DEFAULT_MAP_SIZE };
      }
      if (!map.grid || typeof map.grid !== 'object') {
        map.grid = { ...DEFAULT_GRID };
      }
      if (!map.settings || typeof map.settings !== 'object') {
        map.settings = { ...DEFAULT_MAP_SETTINGS };
      }

      if (this.maps.has(map.id)) {
        map.id = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      map.updatedAt = Date.now();
      this.maps.set(map.id, map);

      if (data.snapshots && Array.isArray(data.snapshots)) {
        this.snapshots.set(map.id, data.snapshots);
      }

      this.saveToStorage();
      console.log(`[MapManager] 导入地图: ${map.name}`);
      return map;
    } catch (e) {
      console.error('[MapManager] 导入地图失败:', e);
      return null;
    }
  }

  duplicateMap(id: string, newName: string): DiceMap | null {
    const original = this.maps.get(id);
    if (!original) return null;

    const newId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const copy: DiceMap = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: newName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.maps.set(newId, copy);
    this.saveToStorage();
    console.log(`[MapManager] 复制地图: ${original.name} -> ${newName}`);
    return copy;
  }

  searchMaps(query: string): DiceMap[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.maps.values()).filter(
      m =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.description?.toLowerCase().includes(lowerQuery) ||
        m.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)),
    );
  }

  clearAll(): void {
    this.maps.clear();
    this.snapshots.clear();
    this.currentMapId = null;
    this.saveToStorage();
    this.notifyChange(null);
  }
}

export const mapManager = new MapManager();
