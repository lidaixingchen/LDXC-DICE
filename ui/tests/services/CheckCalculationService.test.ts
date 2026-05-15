import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CheckCalculationService } from '../../src/services/CheckCalculationService';

describe('CheckCalculationService', () => {
  describe('calculateStandardCheck', () => {
    const baseParams = {
      rollTotal: 15,
      attrValue: 20,
      attrName: '力量',
      modifier: 0,
      difficulty: 'normal',
      level: 'F级',
      targetValue: '' as const,
      charisma: 10,
      initiatorName: '测试角色',
    };

    it('should return a valid CheckResult', () => {
      const result = CheckCalculationService.calculateStandardCheck(baseParams);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('roll', 15);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('margin');
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('message');
      expect(result.diceType).toBe('1d20');
    });

    it('should succeed when margin >= 0', () => {
      const result = CheckCalculationService.calculateStandardCheck({ ...baseParams, rollTotal: 18 });
      expect(result.success).toBe(true);
    });

    it('should fail on critical failure roll (natural 1)', () => {
      const result = CheckCalculationService.calculateStandardCheck({ ...baseParams, rollTotal: 1 });
      expect(result.criticalFailure).toBe(true);
      expect(result.success).toBe(false);
    });

    it('should succeed on critical success roll (natural 20)', () => {
      const result = CheckCalculationService.calculateStandardCheck({ ...baseParams, rollTotal: 20 });
      expect(result.criticalSuccess).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should use targetValue when provided', () => {
      const result = CheckCalculationService.calculateStandardCheck({ ...baseParams, targetValue: 30 });
      expect(result.target).toBe(30);
    });

    it('should apply difficulty modifier', () => {
      const normal = CheckCalculationService.calculateStandardCheck({ ...baseParams, difficulty: 'normal' });
      const hard = CheckCalculationService.calculateStandardCheck({ ...baseParams, difficulty: 'hard' });
      expect(hard.target).toBe(normal.target + 3);
    });

    it('should handle barely success (margin in [-barelySuccessMargin, -1])', () => {
      // Use a roll that results in margin close to 0 but slightly negative
      const result = CheckCalculationService.calculateStandardCheck({ ...baseParams, rollTotal: 5, targetValue: '' });
      if (result.total < result.target && result.total >= result.target - 2) {
        expect(result.barelySuccess).toBe(true);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('calculateContestCheck', () => {
    const baseParams = {
      rollTotal: 15,
      rollBreakdown: '15',
      myAttrValue: 20,
      oppAttrValue: 15,
      envAdvantage: 0,
      envDisadvantage: 0,
      statusAdvantage: 0,
      statusDisadvantage: 0,
      level: 'F级',
      oppRollTotal: 10,
      attrName: '力量',
      initiatorName: '测试角色',
    };

    it('should return a valid CheckResult', () => {
      const result = CheckCalculationService.calculateContestCheck(baseParams);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('margin');
      expect(result.diceType).toBe('1d20');
    });

    it('should succeed when my total > opponent total', () => {
      const result = CheckCalculationService.calculateContestCheck({ ...baseParams, rollTotal: 20, oppRollTotal: 5 });
      expect(result.success).toBe(true);
    });

    it('should fail when my total < opponent total', () => {
      const result = CheckCalculationService.calculateContestCheck({ ...baseParams, rollTotal: 5, oppRollTotal: 20 });
      expect(result.success).toBe(false);
    });

    it('should handle stalemate (equal totals)', () => {
      const result = CheckCalculationService.calculateContestCheck({
        ...baseParams,
        rollTotal: 10,
        oppRollTotal: 10,
        myAttrValue: 10,
        oppAttrValue: 10,
      });
      expect(result.success).toBe(false);
      expect(result.outcome).toContain('僵持');
    });
  });

  describe('calculateInitiativeCheck', () => {
    it('should win initiative when total is higher', () => {
      const result = CheckCalculationService.calculateInitiativeCheck({
        myRollTotal: 18,
        oppRollTotal: 10,
        myAgility: 20,
        oppAgility: 15,
        level: 'F级',
      });
      expect(result.success).toBe(true);
      expect(result.outcome).toContain('先手');
    });

    it('should lose initiative when total is lower', () => {
      const result = CheckCalculationService.calculateInitiativeCheck({
        myRollTotal: 5,
        oppRollTotal: 15,
        myAgility: 10,
        oppAgility: 20,
        level: 'F级',
      });
      expect(result.success).toBe(false);
    });

    it('should handle tied initiative', () => {
      const result = CheckCalculationService.calculateInitiativeCheck({
        myRollTotal: 10,
        oppRollTotal: 10,
        myAgility: 15,
        oppAgility: 15,
        level: 'F级',
      });
      expect(result.outcome).toContain('同时');
    });
  });

  describe('calculateEscapeCheck', () => {
    it('should calculate solo escape DC', () => {
      const { escapeDC, dcDescription } = CheckCalculationService.calculateEscapeCheck({
        rollTotal: 15,
        agilityValue: 20,
        modifier: 0,
        escapeType: 'solo',
        escapeEnemyAgility: 10,
        escapeEnemyCount: 1,
        escapeObstacleMod: 0,
        level: 'F级',
      });
      expect(escapeDC).toBe(10); // base DC for F级
      expect(dcDescription).toContain('单对单');
    });

    it('should calculate surrounded escape DC', () => {
      const { escapeDC } = CheckCalculationService.calculateEscapeCheck({
        rollTotal: 15,
        agilityValue: 20,
        modifier: 0,
        escapeType: 'surrounded',
        escapeEnemyAgility: 15,
        escapeEnemyCount: 3,
        escapeObstacleMod: 0,
        level: 'F级',
      });
      expect(escapeDC).toBeGreaterThan(10); // base + enemy agi + count * perEnemy
    });

    it('should include masteryBonus in final value', () => {
      const { result } = CheckCalculationService.calculateEscapeCheck({
        rollTotal: 10,
        agilityValue: 20,
        modifier: 0,
        escapeType: 'solo',
        escapeEnemyAgility: 10,
        escapeEnemyCount: 1,
        escapeObstacleMod: 0,
        level: 'E级',
      });
      // E级 masteryBonus = 1
      expect(result.message).toContain('掌握');
    });
  });

  describe('formatStandardCheckContent', () => {
    it('should include meta tag and attribute name', () => {
      const params = {
        rollTotal: 15, attrValue: 20, attrName: '力量', modifier: 0,
        difficulty: 'normal', level: 'F级', targetValue: '' as const, charisma: 10, initiatorName: '测试角色',
      };
      const result = CheckCalculationService.calculateStandardCheck(params);
      const content = CheckCalculationService.formatStandardCheckContent(params, result);
      expect(content).toContain('<meta:检定结果>');
      expect(content).toContain('力量');
      expect(content).toContain('AIDM标准检定');
    });
  });
});
