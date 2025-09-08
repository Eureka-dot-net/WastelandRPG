import { SettlerManager } from '../src/managers/SettlerManager';
import { SettlerDoc } from '../src/models/Player/Settler';

// Mock settler data for testing
const mockSettler = (overrides: any = {}) => {
  const baseSettler = {
    _id: 'test-id',
    colonyId: 'test-colony',
    name: 'Test Settler',
    stats: {
      speed: 10,
      intelligence: 10,
      strength: 10,
      resilience: 10
    },
    skills: {
      scavenging: 10,
      combat: 5,
      farming: 5,
      crafting: 5,
      medical: 5,
      engineering: 5
    },
    traits: [],
    carry: [],
    maxCarrySlots: 10,
    ...overrides
  };

  // Add required methods to make it behave like a SettlerDoc
  return {
    ...baseSettler,
    save: jest.fn(),
    toObject: () => baseSettler
  } as any as SettlerDoc;
};

describe('SettlerManager Adjustments', () => {
  describe('adjustedTimeMultiplier', () => {
    it('should return base time multiplier for settler with average stats', () => {
      const settler = mockSettler();
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedTimeMultiplier();
      
      // With speed 10/20, should be 2.0 - (0.5 + 0.5) = 1.0
      expect(multiplier).toBeCloseTo(1.0, 2);
    });

    it('should return faster multiplier for high speed settler', () => {
      const settler = mockSettler({ stats: { speed: 20, intelligence: 10, strength: 10, resilience: 10 } });
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedTimeMultiplier();
      
      // With speed 20/20, should be 2.0 - (0.5 + 1.0) = 0.5
      expect(multiplier).toBeCloseTo(0.5, 2);
    });

    it('should apply trait effects for quick trait', () => {
      const settler = mockSettler({
        traits: [{ traitId: 'quick', name: 'Quick', type: 'positive' }]
      });
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedTimeMultiplier('exploration');
      
      // Should have base multiplier affected by quick trait's -10% time for exploration
      expect(multiplier).toBeLessThan(1.0);
    });

    it('should apply trait effects for lazy trait', () => {
      const settler = mockSettler({
        traits: [{ traitId: 'lazy', name: 'Lazy', type: 'negative' }]
      });
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedTimeMultiplier();
      
      // Should have base multiplier affected by lazy trait's +10% time for all tasks
      expect(multiplier).toBeGreaterThan(1.0);
    });
  });

  describe('adjustedLootMultiplier', () => {
    it('should return base loot multiplier for settler with average stats', () => {
      const settler = mockSettler();
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedLootMultiplier();
      
      // Base: scavenging 0.8 + (10/20 * 0.6) = 1.1, intelligence 0.9 + (10/20 * 0.3) = 1.05
      // Combined: 1.1 * 1.05 = 1.155
      expect(multiplier).toBeCloseTo(1.155, 2);
    });

    it('should return higher multiplier for high scavenging/intelligence settler', () => {
      const settler = mockSettler({ 
        stats: { speed: 10, intelligence: 20, strength: 10, resilience: 10 },
        skills: { scavenging: 20, combat: 5, farming: 5, crafting: 5, medical: 5, engineering: 5 }
      });
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedLootMultiplier();
      
      // Should be higher than base due to maxed intelligence and scavenging
      // scavenging: 0.8 + 0.6 = 1.4, intelligence: 0.9 + 0.3 = 1.2, combined = 1.68
      expect(multiplier).toBeCloseTo(1.68, 2);
    });

    it('should apply trait effects for scavenger trait', () => {
      const settler = mockSettler({
        traits: [{ traitId: 'scavenger', name: 'Scavenger', type: 'positive' }]
      });
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedLootMultiplier('cleanup');
      
      // Should have base multiplier (1.155) plus scavenger trait +10% yield effect
      expect(multiplier).toBeGreaterThan(1.155);
    });

    it('should apply trait effects for greedy trait', () => {
      const settler = mockSettler({
        traits: [{ traitId: 'greedy', name: 'Greedy', type: 'negative' }]
      });
      const manager = new SettlerManager(settler);
      
      const multiplier = manager.adjustedLootMultiplier('cleanup');
      
      // Should have base multiplier (1.155) minus greedy trait -10% yield effect
      expect(multiplier).toBeLessThan(1.155);
    });
  });

  describe('parseModifier', () => {
    it('should parse percentage modifiers correctly', () => {
      const settler = mockSettler();
      const manager = new SettlerManager(settler);
      
      // Access private method for testing
      const parseModifier = (manager as any).parseModifier.bind(manager);
      
      expect(parseModifier('+20%')).toEqual({ value: 20, isPercentage: true });
      expect(parseModifier('-10%')).toEqual({ value: -10, isPercentage: true });
      expect(parseModifier('+15% yield')).toEqual({ value: 15, isPercentage: true });
    });

    it('should parse non-percentage modifiers correctly', () => {
      const settler = mockSettler();
      const manager = new SettlerManager(settler);
      
      const parseModifier = (manager as any).parseModifier.bind(manager);
      
      expect(parseModifier('+3')).toEqual({ value: 3, isPercentage: false });
      expect(parseModifier('-5')).toEqual({ value: -5, isPercentage: false });
    });
  });
});