import { describe, it, expect, beforeEach } from 'vitest';
import { MapManager } from '@map/map-manager';
import type { DiceMap, MapToken, MapPosition } from '@map/types';

describe('MapManager', () => {
  let manager: MapManager;

  beforeEach(() => {
    localStorage.clear();
    manager = new MapManager();
  });

  describe('createMap', () => {
    it('should create a new map', () => {
      const map = manager.createMap({ name: '测试地图' });

      expect(map.id).toBeDefined();
      expect(map.name).toBe('测试地图');
      expect(map.layers).toHaveLength(6);
    });

    it('should create map with custom size', () => {
      const map = manager.createMap({
        name: '自定义地图',
        size: { width: 2000, height: 1500 },
      });

      expect(map.size.width).toBe(2000);
      expect(map.size.height).toBe(1500);
    });

    it('should create map with grid settings', () => {
      const map = manager.createMap({
        name: '网格地图',
        grid: {
          enabled: true,
          type: 'hex',
          size: 40,
          color: '#ffffff',
          opacity: 0.8,
          snapToGrid: true,
        },
      });

      expect(map.grid.type).toBe('hex');
      expect(map.grid.size).toBe(40);
    });
  });

  describe('deleteMap', () => {
    it('should delete existing map', () => {
      const map = manager.createMap({ name: '测试地图' });
      const result = manager.deleteMap(map.id);

      expect(result).toBe(true);
      expect(manager.getMap(map.id)).toBeNull();
    });

    it('should return false for non-existent map', () => {
      const result = manager.deleteMap('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('getMap', () => {
    it('should return null for non-existent map', () => {
      expect(manager.getMap('non_existent')).toBeNull();
    });

    it('should return existing map', () => {
      const created = manager.createMap({ name: '测试地图' });
      const retrieved = manager.getMap(created.id);

      expect(retrieved).toEqual(created);
    });
  });

  describe('setCurrentMap', () => {
    it('should set current map', () => {
      const map = manager.createMap({ name: '当前地图' });
      const result = manager.setCurrentMap(map.id);

      expect(result).toBe(true);
      expect(manager.getCurrentMap()?.id).toBe(map.id);
    });

    it('should return false for non-existent map', () => {
      const result = manager.setCurrentMap('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('getAllMaps', () => {
    it('should return empty array when no maps', () => {
      expect(manager.getAllMaps()).toEqual([]);
    });

    it('should return all maps', () => {
      manager.createMap({ name: '地图1' });
      manager.createMap({ name: '地图2' });

      const maps = manager.getAllMaps();
      expect(maps).toHaveLength(2);
    });
  });

  describe('addToken', () => {
    it('should add token to map', () => {
      const map = manager.createMap({ name: '测试地图' });
      const token = manager.addToken(map.id, {
        name: '角色1',
        type: 'character',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      expect(token).not.toBeNull();
      expect(token?.id).toBeDefined();
      expect(token?.name).toBe('角色1');

      const updatedMap = manager.getMap(map.id);
      expect(updatedMap?.tokens).toHaveLength(1);
    });

    it('should return null for non-existent map', () => {
      const token = manager.addToken('non_existent', {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      expect(token).toBeNull();
    });
  });

  describe('updateToken', () => {
    it('should update existing token', () => {
      const map = manager.createMap({ name: '测试地图' });
      const token = manager.addToken(map.id, {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const result = manager.updateToken(map.id, token!.id, {
        position: { x: 200, y: 200 },
      });

      expect(result).toBe(true);

      const updatedMap = manager.getMap(map.id);
      expect(updatedMap?.tokens[0].position).toEqual({ x: 200, y: 200 });
    });

    it('should return false for non-existent token', () => {
      const map = manager.createMap({ name: '测试地图' });
      const result = manager.updateToken(map.id, 'non_existent', { name: '更新' });

      expect(result).toBe(false);
    });
  });

  describe('moveToken', () => {
    it('should move token to new position', () => {
      const map = manager.createMap({ name: '测试地图' });
      const token = manager.addToken(map.id, {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const result = manager.moveToken(map.id, token!.id, { x: 300, y: 400 });

      expect(result).toBe(true);

      const updatedMap = manager.getMap(map.id);
      expect(updatedMap?.tokens[0].position).toEqual({ x: 300, y: 400 });
    });
  });

  describe('removeToken', () => {
    it('should remove existing token', () => {
      const map = manager.createMap({ name: '测试地图' });
      const token = manager.addToken(map.id, {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const result = manager.removeToken(map.id, token!.id);

      expect(result).toBe(true);

      const updatedMap = manager.getMap(map.id);
      expect(updatedMap?.tokens).toHaveLength(0);
    });
  });

  describe('getTokenAt', () => {
    it('should return token at position', () => {
      const map = manager.createMap({ name: '测试地图' });
      manager.addToken(map.id, {
        name: '角色',
        type: 'character',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const token = manager.getTokenAt(map.id, { x: 120, y: 120 });
      expect(token).not.toBeNull();
      expect(token?.name).toBe('角色');
    });

    it('should return null for empty position', () => {
      const map = manager.createMap({ name: '测试地图' });
      const token = manager.getTokenAt(map.id, { x: 500, y: 500 });

      expect(token).toBeNull();
    });

    it('should not return hidden tokens', () => {
      const map = manager.createMap({ name: '测试地图' });
      manager.addToken(map.id, {
        name: '隐藏角色',
        type: 'character',
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: true,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const token = manager.getTokenAt(map.id, { x: 120, y: 120 });
      expect(token).toBeNull();
    });
  });

  describe('addShape', () => {
    it('should add shape to map', () => {
      const map = manager.createMap({ name: '测试地图' });
      const shape = manager.addShape(map.id, {
        type: 'rect',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 0.5,
        rotation: 0,
        layerId: 'layer_drawings',
      });

      expect(shape).not.toBeNull();
      expect(shape?.id).toBeDefined();

      const updatedMap = manager.getMap(map.id);
      expect(updatedMap?.shapes).toHaveLength(1);
    });
  });

  describe('createSnapshot', () => {
    it('should create snapshot of current state', () => {
      const map = manager.createMap({ name: '测试地图' });
      manager.addToken(map.id, {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const snapshot = manager.createSnapshot(map.id, '初始状态');

      expect(snapshot).not.toBeNull();
      expect(snapshot?.name).toBe('初始状态');
      expect(snapshot?.tokens).toHaveLength(1);
    });
  });

  describe('restoreSnapshot', () => {
    it('should restore map to snapshot state', () => {
      const map = manager.createMap({ name: '测试地图' });
      const token = manager.addToken(map.id, {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const snapshot = manager.createSnapshot(map.id, '初始状态');

      manager.moveToken(map.id, token!.id, { x: 500, y: 500 });

      const result = manager.restoreSnapshot(snapshot!.id);
      expect(result).toBe(true);

      const restoredMap = manager.getMap(map.id);
      expect(restoredMap?.tokens[0].position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('viewport', () => {
    it('should get and set viewport', () => {
      manager.setViewport({ x: 100, y: 200, zoom: 1.5, rotation: 45 });
      const viewport = manager.getViewport();

      expect(viewport.x).toBe(100);
      expect(viewport.y).toBe(200);
      expect(viewport.zoom).toBe(1.5);
      expect(viewport.rotation).toBe(45);
    });

    it('should zoom in and out', () => {
      manager.setViewport({ zoom: 1 });
      manager.zoomIn();
      expect(manager.getViewport().zoom).toBeGreaterThan(1);

      manager.zoomOut();
      expect(manager.getViewport().zoom).toBeLessThanOrEqual(1);
    });

    it('should clamp zoom values', () => {
      manager.setViewport({ zoom: 0.05 });
      manager.zoomOut();
      expect(manager.getViewport().zoom).toBeGreaterThanOrEqual(0.1);

      manager.setViewport({ zoom: 4.9 });
      manager.zoomIn();
      expect(manager.getViewport().zoom).toBeLessThanOrEqual(5);
    });
  });

  describe('export/import', () => {
    it('should export and import map', () => {
      const map = manager.createMap({ name: '导出测试' });
      manager.addToken(map.id, {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const json = manager.exportMap(map.id);
      expect(json).not.toBeNull();

      manager.deleteMap(map.id);

      const imported = manager.importMap(json!);
      expect(imported).not.toBeNull();
      expect(imported?.name).toBe('导出测试');
      expect(imported?.tokens).toHaveLength(1);
    });

    it('should handle invalid import data', () => {
      const result = manager.importMap('invalid json');
      expect(result).toBeNull();
    });
  });

  describe('duplicateMap', () => {
    it('should duplicate existing map', () => {
      const original = manager.createMap({ name: '原图' });
      manager.addToken(original.id, {
        name: '角色',
        type: 'character',
        position: { x: 0, y: 0 },
        size: { width: 50, height: 50 },
        rotation: 0,
        color: '#89b4fa',
        borderColor: '#1e1e2e',
        borderWidth: 2,
        opacity: 1,
        locked: false,
        hidden: false,
        layerId: 'layer_tokens',
        metadata: {},
        effects: [],
      });

      const duplicate = manager.duplicateMap(original.id, '副本');

      expect(duplicate).not.toBeNull();
      expect(duplicate?.name).toBe('副本');
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.tokens).toHaveLength(1);
    });
  });

  describe('searchMaps', () => {
    beforeEach(() => {
      manager.createMap({ name: '战斗地图' });
      manager.createMap({ name: '探索地图' });
      manager.createMap({ name: '城镇地图' });
    });

    it('should find maps by name', () => {
      const results = manager.searchMaps('地图');
      expect(results).toHaveLength(3);
    });

    it('should find maps by partial name', () => {
      const results = manager.searchMaps('战斗');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('战斗地图');
    });

    it('should return empty array for no matches', () => {
      const results = manager.searchMaps('不存在');
      expect(results).toHaveLength(0);
    });
  });
});
