export type MapLayerType = 'background' | 'grid' | 'tokens' | 'drawings' | 'fog' | 'effects';
export type MapTokenType = 'character' | 'npc' | 'object' | 'effect' | 'marker';
export type MapShapeType = 'rect' | 'circle' | 'polygon' | 'line' | 'text';
export type MapInteractionType = 'move' | 'click' | 'drag' | 'drop' | 'hover' | 'select';
export type MapFogMode = 'none' | 'partial' | 'full';

export interface MapPosition {
  x: number;
  y: number;
}

export interface MapSize {
  width: number;
  height: number;
}

export interface MapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapGrid {
  enabled: boolean;
  type: 'square' | 'hex' | 'isometric';
  size: number;
  color: string;
  opacity: number;
  snapToGrid: boolean;
}

export interface MapLayer {
  id: string;
  name: string;
  type: MapLayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  data: unknown;
}

export interface MapToken {
  id: string;
  name: string;
  type: MapTokenType;
  position: MapPosition;
  size: MapSize;
  rotation: number;
  image?: string;
  color: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  layerId: string;
  metadata: MapTokenMetadata;
  effects: MapTokenEffect[];
}

export interface MapTokenMetadata {
  characterId?: string;
  characterName?: string;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  conditions?: string[];
  initiative?: number;
  custom?: Record<string, unknown>;
}

export interface MapTokenEffect {
  id: string;
  type: 'aura' | 'trail' | 'glow' | 'status';
  color: string;
  radius?: number;
  duration?: number;
  data?: Record<string, unknown>;
}

export interface MapShape {
  id: string;
  type: MapShapeType;
  position: MapPosition;
  size?: MapSize;
  points?: MapPosition[];
  color: string;
  fillColor?: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  rotation: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  layerId: string;
}

export interface MapFogRegion {
  id: string;
  type: 'reveal' | 'hide';
  shape: MapShapeType;
  bounds: MapBounds;
  points?: MapPosition[];
  opacity: number;
}

export interface MapBackground {
  type: 'color' | 'image' | 'gradient';
  color?: string;
  image?: string;
  gradient?: {
    type: 'linear' | 'radial';
    colors: Array<{ color: string; position: number }>;
    angle?: number;
  };
  position?: MapPosition;
  size?: MapSize;
  repeat?: boolean;
}

export interface MapInteraction {
  id: string;
  name?: string;
  type: MapInteractionType;
  trigger: MapInteractionTrigger;
  actions: MapInteractionAction[];
  enabled: boolean;
  priority: number;
}

export interface MapInteractionTrigger {
  type: 'token' | 'region' | 'grid' | 'custom';
  tokenId?: string;
  regionId?: string;
  condition?: string;
  data?: Record<string, unknown>;
}

export interface MapInteractionAction {
  type: 'dice_roll' | 'message' | 'effect' | 'move_token' | 'change_layer' | 'custom';
  data: Record<string, unknown>;
  delay?: number;
}

export interface DiceMap {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  size: MapSize;
  background: MapBackground;
  grid: MapGrid;
  layers: MapLayer[];
  tokens: MapToken[];
  shapes: MapShape[];
  fog: {
    enabled: boolean;
    mode: MapFogMode;
    regions: MapFogRegion[];
  };
  interactions: MapInteraction[];
  settings: MapSettings;
  metadata: MapMetadata;
}

export interface MapSettings {
  scale: number;
  unit: string;
  showCoordinates: boolean;
  showTokenNames: boolean;
  showTokenHealth: boolean;
  allowPlayerMove: boolean;
  allowPlayerDraw: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

export interface MapMetadata {
  author?: string;
  tags?: string[];
  thumbnail?: string;
  custom?: Record<string, unknown>;
}

export interface MapViewport {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export interface MapTool {
  id: string;
  name: string;
  icon: string;
  category: 'select' | 'draw' | 'token' | 'measure' | 'fog' | 'interact';
  cursor?: string;
  options?: Record<string, unknown>;
}

export interface MapSnapshot {
  id: string;
  mapId: string;
  name: string;
  timestamp: number;
  tokens: MapToken[];
  shapes: MapShape[];
  fog: DiceMap['fog'];
}

export interface MapExportData {
  version: string;
  map: DiceMap;
  snapshots?: MapSnapshot[];
  exportedAt: number;
}

export const MAP_VERSION = '1.0.0';

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  scale: 1,
  unit: '格',
  showCoordinates: true,
  showTokenNames: true,
  showTokenHealth: true,
  allowPlayerMove: true,
  allowPlayerDraw: false,
  autoSave: true,
  autoSaveInterval: 60000,
};

export const DEFAULT_GRID: MapGrid = {
  enabled: true,
  type: 'square',
  size: 50,
  color: '#313244',
  opacity: 0.5,
  snapToGrid: true,
};

export const DEFAULT_MAP_SIZE: MapSize = {
  width: 1920,
  height: 1080,
};

export const MAP_TOOLS: MapTool[] = [
  { id: 'select', name: '选择', icon: 'fa:mouse-pointer', category: 'select' },
  { id: 'pan', name: '平移', icon: 'fa:hand', category: 'select' },
  { id: 'zoom', name: '缩放', icon: 'fa:search', category: 'select' },
  { id: 'token_place', name: '放置令牌', icon: 'fa:user', category: 'token' },
  { id: 'token_move', name: '移动令牌', icon: 'fa:arrows-alt', category: 'token' },
  { id: 'token_delete', name: '删除令牌', icon: 'fa:trash', category: 'token' },
  { id: 'draw_rect', name: '矩形', icon: 'fa:square', category: 'draw' },
  { id: 'draw_circle', name: '圆形', icon: 'fa:circle', category: 'draw' },
  { id: 'draw_line', name: '线条', icon: 'fa:minus', category: 'draw' },
  { id: 'draw_polygon', name: '多边形', icon: 'fa:draw-polygon', category: 'draw' },
  { id: 'draw_text', name: '文本', icon: 'fa:font', category: 'draw' },
  { id: 'measure', name: '测量', icon: 'fa:ruler', category: 'measure' },
  { id: 'fog_reveal', name: '揭示迷雾', icon: 'fa:eye', category: 'fog' },
  { id: 'fog_hide', name: '隐藏迷雾', icon: 'fa:eye-slash', category: 'fog' },
  { id: 'interact', name: '交互', icon: 'fa:hand-pointer', category: 'interact' },
];
