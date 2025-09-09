/**
 * Comprehensive tests for the settler energy system
 */

import { SettlerManager } from '../src/managers/SettlerManager';
import { Settler, SettlerDoc } from '../src/models/Player/Settler';
import { Types } from 'mongoose';

// Mock settler data factory
const createMockSettler = (overrides: any = {}): SettlerDoc => {
  const defaultSettler = {
    _id: new Types.ObjectId(),
    colonyId: new Types.ObjectId(),
    nameId: 'test-settler',
    name: 'Test Settler',
    isActive: true,
    backstory: 'A test settler',
    isFemale: false,
    stats: {
      strength: 10,
      speed: 10,
      intelligence: 10,
      resilience: 10,
    },
    skills: {
      combat: 5,
      scavenging: 5,
      farming: 5,
      crafting: 5,
      medical: 5,
      engineering: 5,
    },
    interests: [],
    traits: [],
    status: 'idle' as any,
    health: 100,
    morale: 90,
    hunger: 0,
    energy: 100,
    energyLastUpdated: new Date(),
    carry: [],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    },
    foodConsumption: 1,
    maxCarrySlots: 8,
    createdAt: new Date(),
    ...overrides
  };

  // Create a mock document-like object
  const mockDocument = {
    ...defaultSettler,
    save: jest.fn().mockResolvedValue(true),
    toObject: () => defaultSettler,
    __v: 0
  } as unknown as SettlerDoc;

  return mockDocument;
};

describe('Settler Energy System', () => {
  let mockSettler: SettlerDoc;
  let settlerManager: SettlerManager;

  beforeEach(() => {
    mockSettler = createMockSettler();
    settlerManager = new SettlerManager(mockSettler);
  });

  describe('getEnergyDeltaForStatus', () => {
    it('should return correct energy delta for idle status', () => {
      const delta = settlerManager.getEnergyDeltaForStatus('idle');
      expect(delta).toBe(1); // +1 energy per hour for idle
    });

    it('should return correct energy delta for resting status', () => {
      const delta = settlerManager.getEnergyDeltaForStatus('resting');
      expect(delta).toBe(10); // +10 energy per hour for resting
    });

    it('should return correct energy delta for working status', () => {
      const delta = settlerManager.getEnergyDeltaForStatus('working');
      expect(delta).toBe(-8); // -8 energy per hour for working
    });

    it('should return correct energy delta for exploring status', () => {
      const delta = settlerManager.getEnergyDeltaForStatus('exploring');
      expect(delta).toBe(-8); // -8 energy per hour for exploring
    });

    it('should return correct energy delta for questing status', () => {
      const delta = settlerManager.getEnergyDeltaForStatus('questing');
      expect(delta).toBe(-8); // -8 energy per hour for questing
    });

    it('should return correct energy delta for crafting status', () => {
      const delta = settlerManager.getEnergyDeltaForStatus('crafting');
      expect(delta).toBe(-8); // -8 energy per hour for crafting
    });

    it('should return 0 for unknown status', () => {
      const delta = settlerManager.getEnergyDeltaForStatus('unknown');
      expect(delta).toBe(0);
    });
  });

  describe('updateEnergy', () => {
    beforeEach(() => {
      // Clear any jest spies before each test
      jest.restoreAllMocks();
    });

    it('should not change energy if no time has passed', () => {
      // Set last updated to current time
      const now = new Date();
      mockSettler.energyLastUpdated = now;
      mockSettler.energy = 50;

      // Update immediately (no time passed)
      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(50); // No change
      expect(mockSettler.energy).toBe(50);
    });

    it('should increase energy for idle settler over time', () => {
      // Mock Date constructor to return a specific time
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const oneHourEarlier = new Date('2023-01-01T11:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = oneHourEarlier;
      mockSettler.energy = 50;
      mockSettler.status = 'idle';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(51); // 50 + (1 energy/hour * 1 hour)
      expect(mockSettler.energy).toBe(51);
      
      jest.restoreAllMocks();
    });

    it('should decrease energy for working settler over time', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const oneHourEarlier = new Date('2023-01-01T11:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = oneHourEarlier;
      mockSettler.energy = 50;
      mockSettler.status = 'working';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(42); // 50 + (-8 energy/hour * 1 hour)
      expect(mockSettler.energy).toBe(42);
      
      jest.restoreAllMocks();
    });

    it('should increase energy significantly for resting settler', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const oneHourEarlier = new Date('2023-01-01T11:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = oneHourEarlier;
      mockSettler.energy = 50;
      mockSettler.status = 'resting';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(60); // 50 + (10 energy/hour * 1 hour)
      expect(mockSettler.energy).toBe(60);
      
      jest.restoreAllMocks();
    });

    it('should clamp energy at 100 maximum', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const tenHoursEarlier = new Date('2023-01-01T02:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = tenHoursEarlier;
      mockSettler.energy = 50;
      mockSettler.status = 'resting';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(100); // Clamped at 100
      expect(mockSettler.energy).toBe(100);
      
      jest.restoreAllMocks();
    });

    it('should clamp energy at 0 minimum', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const tenHoursEarlier = new Date('2023-01-01T02:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = tenHoursEarlier;
      mockSettler.energy = 10;
      mockSettler.status = 'working';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(0); // Clamped at 0
      expect(mockSettler.energy).toBe(0);
      
      jest.restoreAllMocks();
    });

    it('should update energyLastUpdated timestamp', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const oneHourEarlier = new Date('2023-01-01T11:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = oneHourEarlier;
      
      settlerManager.updateEnergy(new Date());
      
      expect(mockSettler.energyLastUpdated).toEqual(mockNow);
      
      jest.restoreAllMocks();
    });

    it('should use createdAt if energyLastUpdated is not set', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const twoHoursEarlier = new Date('2023-01-01T10:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = undefined as any;
      mockSettler.createdAt = twoHoursEarlier;
      mockSettler.energy = 100;
      mockSettler.status = 'working';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(84); // 100 + (-8 * 2 hours) = 84
      expect(mockSettler.energy).toBe(84);
      
      jest.restoreAllMocks();
    });
  });

  describe('canCompleteTask', () => {
    beforeEach(() => {
      // Start with fresh energy
      mockSettler.energy = 100;
      mockSettler.energyLastUpdated = new Date();
    });

    it('should return true for energy-gaining tasks (idle)', () => {
      mockSettler.energy = 10; // Low energy
      const canComplete = settlerManager.canCompleteTask('idle', 5);
      expect(canComplete).toBe(true); // Idle gains energy, so always allowed
    });

    it('should return true for energy-gaining tasks (resting)', () => {
      mockSettler.energy = 0; // No energy
      const canComplete = settlerManager.canCompleteTask('resting', 2);
      expect(canComplete).toBe(true); // Resting gains energy, so always allowed
    });

    it('should return true if settler has enough energy for working task', () => {
      mockSettler.energy = 50;
      const canComplete = settlerManager.canCompleteTask('working', 5); // 5 hours * 8 energy = 40 energy needed
      expect(canComplete).toBe(true); // 50 >= 40
    });

    it('should return false if settler does not have enough energy for working task', () => {
      mockSettler.energy = 30;
      const canComplete = settlerManager.canCompleteTask('working', 5); // 5 hours * 8 energy = 40 energy needed
      expect(canComplete).toBe(false); // 30 < 40
    });

    it('should return true if settler has exactly enough energy', () => {
      mockSettler.energy = 40;
      const canComplete = settlerManager.canCompleteTask('working', 5); // 5 hours * 8 energy = 40 energy needed
      expect(canComplete).toBe(true); // 40 >= 40
    });

    it('should work correctly for exploring tasks', () => {
      mockSettler.energy = 60;
      const canComplete = settlerManager.canCompleteTask('exploring', 8); // 8 hours * 8 energy = 64 energy needed
      expect(canComplete).toBe(false); // 60 < 64
    });

    it('should work correctly for questing tasks', () => {
      mockSettler.energy = 80;
      const canComplete = settlerManager.canCompleteTask('questing', 10); // 10 hours * 8 energy = 80 energy needed
      expect(canComplete).toBe(true); // 80 >= 80
    });

    it('should work correctly for crafting tasks', () => {
      mockSettler.energy = 70;
      const canComplete = settlerManager.canCompleteTask('crafting', 9); // 9 hours * 8 energy = 72 energy needed
      expect(canComplete).toBe(false); // 70 < 72
    });

    it('should account for energy lost over time before checking task requirements', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const twoHoursEarlier = new Date('2023-01-01T10:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = twoHoursEarlier;
      mockSettler.energy = 100;
      mockSettler.status = 'working';

      // Check if they can do a 10-hour working task (needs 80 energy)
      const canComplete = settlerManager.canCompleteTask('working', 10);
      expect(canComplete).toBe(true); // 84 >= 80
      expect(mockSettler.energy).toBe(84); // Energy should be updated
      
      jest.restoreAllMocks();
    });
  });

  describe('changeStatus integration', () => {
    it('should update energy before changing status', async () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const twoHoursEarlier = new Date('2023-01-01T10:00:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = twoHoursEarlier;
      mockSettler.energy = 50;
      mockSettler.status = 'resting';

      const mockSession = {} as any;

      await settlerManager.changeStatus('idle', new Date(), mockSession);

      // Energy should be updated (50 + 20 = 70) and status changed
      expect(mockSettler.energy).toBe(70);
      expect(mockSettler.status).toBe('idle');
      expect(mockSettler.save).toHaveBeenCalledWith({ session: mockSession });
      
      jest.restoreAllMocks();
    });
  });

  describe('Edge cases', () => {
    it('should handle fractional hours correctly', () => {
      const mockNow = new Date('2023-01-01T12:00:00Z');
      const thirtyMinutesEarlier = new Date('2023-01-01T11:30:00Z');
      
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);
      
      mockSettler.energyLastUpdated = thirtyMinutesEarlier;
      mockSettler.energy = 50;
      mockSettler.status = 'working';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(46); // 50 + (-8 * 0.5 hours) = 46
      
      jest.restoreAllMocks();
    });

    it('should handle very small time differences', () => {
      // 1 second ago
      const oneSecondAgo = new Date(Date.now() - 1000);
      mockSettler.energyLastUpdated = oneSecondAgo;
      mockSettler.energy = 50;
      mockSettler.status = 'working';

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      // Very small change: 50 + (-8 * (1/3600) hours) ≈ 49.998
      expect(updatedEnergy).toBeCloseTo(50, 0); // Rounded to nearest integer
    });

    it('should handle negative time differences gracefully', () => {
      // Future time (should not happen in practice, but test defensive coding)
      const futureTime = new Date(Date.now() + 60 * 60 * 1000);
      mockSettler.energyLastUpdated = futureTime;
      mockSettler.energy = 50;

      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(50); // No change for negative time
    });

    it('should handle missing energyLastUpdated and createdAt gracefully', () => {
      mockSettler.energyLastUpdated = undefined as any;
      mockSettler.createdAt = undefined as any;
      mockSettler.energy = 50;

      // Should use current time as fallback
      const updatedEnergy = settlerManager.updateEnergy(new Date());
      expect(updatedEnergy).toBe(50); // No time passed
    });
  });
});