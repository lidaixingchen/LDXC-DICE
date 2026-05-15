import { describe, it, expect } from 'vitest';
import { WorldConfigService } from '../../src/services/WorldConfigService';

describe('WorldConfigService', () => {
  describe('getBaseDC', () => {
    it('should return base DC for known level', () => {
      const dc = WorldConfigService.getBaseDC('F级');
      expect(dc).toBe(10);
    });

    it('should return fallback for unknown level', () => {
      expect(WorldConfigService.getBaseDC('未知')).toBe(10);
    });
  });

  describe('getMasteryBonus', () => {
    it('should return mastery bonus for known level', () => {
      expect(WorldConfigService.getMasteryBonus('F级')).toBe(0);
      expect(WorldConfigService.getMasteryBonus('E级')).toBe(1);
    });

    it('should return 0 for unknown level', () => {
      expect(WorldConfigService.getMasteryBonus('未知')).toBe(0);
    });
  });

  describe('getHpBase', () => {
    it('should return HP base for known level', () => {
      expect(WorldConfigService.getHpBase('F级')).toBe(15);
    });

    it('should return fallback for unknown level', () => {
      expect(WorldConfigService.getHpBase('未知')).toBe(15);
    });
  });

  describe('getSPV', () => {
    it('should return SPV for known level', () => {
      expect(WorldConfigService.getSPV('F级')).toBe(5);
    });

    it('should return fallback for unknown level', () => {
      expect(WorldConfigService.getSPV('未知')).toBe(5);
    });
  });

  describe('getDifficultyMod', () => {
    it('should return 0 for normal', () => expect(WorldConfigService.getDifficultyMod('normal')).toBe(0));
    it('should return 3 for hard', () => expect(WorldConfigService.getDifficultyMod('hard')).toBe(3));
    it('should return 6 for extreme', () => expect(WorldConfigService.getDifficultyMod('extreme')).toBe(6));
    it('should return 0 for unknown difficulty', () => expect(WorldConfigService.getDifficultyMod('unknown')).toBe(0));
  });

  describe('getFinalDC', () => {
    it('should combine base DC and difficulty mod', () => {
      expect(WorldConfigService.getFinalDC('F级', 'normal')).toBe(10);
      expect(WorldConfigService.getFinalDC('F级', 'hard')).toBe(13);
      expect(WorldConfigService.getFinalDC('E级', 'extreme')).toBe(19);
    });
  });

  describe('getCheckRules', () => {
    it('should return check rules object', () => {
      const rules = WorldConfigService.getCheckRules();
      expect(rules).toHaveProperty('critSuccessRoll');
      expect(rules).toHaveProperty('critFailureRoll');
      expect(rules).toHaveProperty('bigSuccessMargin');
      expect(rules).toHaveProperty('bigFailMargin');
      expect(rules).toHaveProperty('barelySuccessMargin');
    });
  });

  describe('getCombatRules', () => {
    it('should return combat rules object', () => {
      const rules = WorldConfigService.getCombatRules();
      expect(rules).toHaveProperty('hpEnduranceMultiplier');
      expect(rules).toHaveProperty('ddcBase');
      expect(rules).toHaveProperty('critDamageMultiplier');
    });
  });

  describe('getAttributeModifier', () => {
    it('should return 0 for low attributes', () => {
      expect(WorldConfigService.getAttributeModifier(1)).toBe(0);
      expect(WorldConfigService.getAttributeModifier(15)).toBe(0);
    });

    it('should return correct modifier for mid-range attributes', () => {
      expect(WorldConfigService.getAttributeModifier(16)).toBe(1);
      expect(WorldConfigService.getAttributeModifier(25)).toBe(1);
      expect(WorldConfigService.getAttributeModifier(26)).toBe(2);
    });

    it('should handle open-ended range with fallback', () => {
      const high = WorldConfigService.getAttributeModifier(400);
      expect(high).toBeGreaterThanOrEqual(19);
      expect(Number.isFinite(high)).toBe(true);
    });
  });

  describe('getDamageReduction', () => {
    it('should return 0 when attackPower <= 0', () => {
      expect(WorldConfigService.getDamageReduction(10, 0)).toBe(0);
      expect(WorldConfigService.getDamageReduction(10, -5)).toBe(0);
    });

    it('should return 0 for very low ratio', () => {
      expect(WorldConfigService.getDamageReduction(1, 100)).toBe(0);
    });

    it('should return higher reduction for higher defense ratios', () => {
      const low = WorldConfigService.getDamageReduction(10, 100);
      const high = WorldConfigService.getDamageReduction(100, 10);
      expect(high).toBeGreaterThan(low);
    });
  });

  describe('LEVELS', () => {
    it('should contain expected levels', () => {
      expect(WorldConfigService.LEVELS).toContain('F级');
      expect(WorldConfigService.LEVELS).toContain('E级');
      expect(WorldConfigService.LEVELS.length).toBeGreaterThan(0);
    });
  });
});
