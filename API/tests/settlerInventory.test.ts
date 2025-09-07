import { 
  calculateCarryingCapacity,
  calculateCurrentCarriedWeight,
  canCarryItems,
  addItemsToSettlerInventory,
  getItemFromCatalogue,
  transferSettlerItemsToColony,
  giveRewardsToSettler
} from '../src/utils/settlerInventoryUtils';
import { ISettler, ISettlerItem, Settler } from '../src/models/Player/Settler';
import { Inventory } from '../src/models/Player/Inventory';
import { ClientSession } from 'mongoose';

// Mock the imports
jest.mock('../src/services/gameEventsService', () => ({
  addRewardsToColonyInventory: jest.fn()
}));

// Mock settler data for testing
const createMockSettler = (strength: number = 10, carryItems: ISettlerItem[] = []): ISettler => ({
  colonyId: 'test_colony' as any,
  nameId: 'test',
  name: 'Test Settler',
  isActive: true,
  backstory: 'Test backstory',
  isFemale: false,
  stats: {
    strength,
    speed: 10,
    intelligence: 10,
    resilience: 10
  },
  skills: {
    combat: 5,
    scavenging: 5,
    farming: 5,
    crafting: 5,
    medical: 5,
    engineering: 5
  },
  interests: [],
  traitEffect: { target: '' },
  traits: [],
  status: 'idle',
  health: 100,
  morale: 90,
  hunger: 0,
  energy: 100,
  carry: carryItems,
  equipment: {},
  foodConsumption: 1,
  maxCarrySlots: 8,
  createdAt: new Date()
});

describe('Settler Inventory System', () => {
  beforeEach(() => {
    // Clear mocks before each test
    const { addRewardsToColonyInventory } = require('../src/services/gameEventsService');
    addRewardsToColonyInventory.mockClear();
  });
  
  describe('calculateCarryingCapacity', () => {
    test('should calculate capacity based on strength', () => {
      expect(calculateCarryingCapacity(2)).toBe(10);  // Minimum
      expect(calculateCarryingCapacity(10)).toBe(50); // As specified
      expect(calculateCarryingCapacity(20)).toBe(100); // Maximum
    });
  });

  describe('calculateCurrentCarriedWeight', () => {
    test('should calculate total weight of carried items', () => {
      const carriedItems: ISettlerItem[] = [
        { itemId: 'wood', quantity: 2 }, // weight 3 each = 6 total
        { itemId: 'scrap', quantity: 3 }, // weight 2 each = 6 total
        { itemId: 'berries', quantity: 5 } // weight 0.3 each = 1.5 total
      ];
      
      const totalWeight = calculateCurrentCarriedWeight(carriedItems);
      expect(totalWeight).toBeCloseTo(13.5); // 6 + 6 + 1.5
    });

    test('should handle items not in catalogue', () => {
      const carriedItems: ISettlerItem[] = [
        { itemId: 'unknown_item', quantity: 1 }
      ];
      
      const totalWeight = calculateCurrentCarriedWeight(carriedItems);
      expect(totalWeight).toBe(0); // Unknown items have no weight
    });
  });

  describe('canCarryItems', () => {
    test('should allow carrying within weight and slot limits', () => {
      const settler = createMockSettler(10); // 50 weight capacity
      
      const result = canCarryItems(settler, 'wood', 5); // 5 * 3 = 15 weight
      expect(result.canCarry).toBe(true);
      expect(result.details.maxWeight).toBe(50);
      expect(result.details.currentWeight).toBe(0);
    });

    test('should reject items exceeding weight limit', () => {
      const settler = createMockSettler(10); // 50 weight capacity
      
      const result = canCarryItems(settler, 'wood', 20); // 20 * 3 = 60 weight > 50
      expect(result.canCarry).toBe(false);
      expect(result.reason).toContain('too heavy');
    });

    test('should reject items exceeding slot limit', () => {
      // Create settler with 8 different items (max slots)
      const carriedItems: ISettlerItem[] = [
        { itemId: 'wood', quantity: 1 },
        { itemId: 'scrap', quantity: 1 },
        { itemId: 'berries', quantity: 1 },
        { itemId: 'seeds', quantity: 1 },
        { itemId: 'rope', quantity: 1 },
        { itemId: 'cloth', quantity: 1 },
        { itemId: 'bones', quantity: 1 },
        { itemId: 'ash', quantity: 1 }
      ];
      const settler = createMockSettler(20, carriedItems); // High strength, full slots
      
      const result = canCarryItems(settler, 'metal', 1); // Try to add 9th item
      expect(result.canCarry).toBe(false);
      expect(result.reason).toContain('inventory slots');
    });

    test('should allow stacking stackable items', () => {
      const carriedItems: ISettlerItem[] = [
        { itemId: 'wood', quantity: 5 }
      ];
      const settler = createMockSettler(20, carriedItems);
      
      const result = canCarryItems(settler, 'wood', 3); // Add more wood
      expect(result.canCarry).toBe(true);
      expect(result.details.currentSlots).toBe(1); // Still only 1 slot used
    });
  });

  describe('addItemsToSettlerInventory', () => {
    test('should add items to empty inventory', () => {
      const settler = createMockSettler(10);
      
      const result = addItemsToSettlerInventory(settler, 'berries', 10);
      expect(result.added).toBe(10);
      expect(settler.carry).toHaveLength(1);
      expect(settler.carry[0]).toEqual({ itemId: 'berries', quantity: 10 });
    });

    test('should add to existing stackable items', () => {
      const carriedItems: ISettlerItem[] = [
        { itemId: 'wood', quantity: 2 }
      ];
      const settler = createMockSettler(10, carriedItems);
      
      const result = addItemsToSettlerInventory(settler, 'wood', 3);
      expect(result.added).toBe(3);
      expect(settler.carry).toHaveLength(1);
      expect(settler.carry[0].quantity).toBe(5);
    });

    test('should respect weight limits', () => {
      const settler = createMockSettler(10); // 50 capacity
      
      const result = addItemsToSettlerInventory(settler, 'wood', 20); // 20 * 3 = 60 weight
      expect(result.added).toBeLessThan(20); // Should add less than requested
      expect(result.added).toBeGreaterThan(0); // But should add some
    });

    test('should not stack non-stackable items', () => {
      // Find a non-stackable item from catalogue
      const catalogueItem = getItemFromCatalogue('map');
      expect(catalogueItem?.properties?.stackable).not.toBe(true);
      
      const carriedItems: ISettlerItem[] = [
        { itemId: 'map', quantity: 1 }
      ];
      const settler = createMockSettler(20, carriedItems);
      
      const result = addItemsToSettlerInventory(settler, 'map', 1);
      expect(result.added).toBe(0);
      expect(result.reason).toContain('not stackable');
    });
  });

  describe('transferItemsToColony (SettlerManager)', () => {
    test('should transfer items respecting colony inventory limits', async () => {
      const { SettlerManager } = require('../src/managers/SettlerManager');
      const { Colony } = require('../src/models/Player/Colony');
      const { Inventory } = require('../src/models/Player/Inventory');
      const { addRewardsToColonyInventory } = require('../src/services/gameEventsService');
      
      const mockSession = {} as ClientSession;
      const mockColonyId = '507f1f77bcf86cd799439011'; // Valid ObjectId
      
      // Mock colony with inventory size limit
      const mockColony = {
        _id: mockColonyId,
        maxInventory: 3 // Only 3 item types allowed
      };
      
      // Mock existing colony inventory (already has 2 item types)
      const mockInventory = {
        colonyId: mockColonyId,
        items: [
          { itemId: 'existing1', quantity: 5 },
          { itemId: 'existing2', quantity: 3 }
        ]
      };
      
      // Mock settler with 3 items (1 existing, 2 new)
      const mockSettler = {
        carry: [
          { itemId: 'existing1', quantity: 2 }, // Should transfer (existing type)
          { itemId: 'wood', quantity: 5 },      // Should transfer (new type fits)
          { itemId: 'berries', quantity: 10 }   // Should remain (no space)
        ],
        save: jest.fn()
      };
      
      // Mock Mongoose methods
      Colony.findById = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(mockColony) });
      Inventory.findOne = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(mockInventory) });
      
      const settlerManager = new SettlerManager(mockSettler as any);
      const result = await settlerManager.transferItemsToColony(mockColonyId, mockSession);
      
      // Should transfer existing1 and wood, but berries remains with settler
      expect(result.transferredItems).toEqual({
        existing1: 2,
        wood: 5
      });
      expect(result.remainingItems).toEqual({
        berries: 10
      });
      
      // Settler should only have remaining items
      expect(mockSettler.carry).toEqual([
        { itemId: 'berries', quantity: 10 }
      ]);
      expect(mockSettler.save).toHaveBeenCalledWith({ session: mockSession });
      expect(addRewardsToColonyInventory).toHaveBeenCalledWith(
        mockColonyId, 
        mockSession, 
        { existing1: 2, wood: 5 }
      );
    });

    test('should transfer all items when colony has space', async () => {
      const { SettlerManager } = require('../src/managers/SettlerManager');
      const { Colony } = require('../src/models/Player/Colony');
      const { Inventory } = require('../src/models/Player/Inventory');
      const { addRewardsToColonyInventory } = require('../src/services/gameEventsService');
      
      const mockSession = {} as ClientSession;
      const mockColonyId = '507f1f77bcf86cd799439011'; // Valid ObjectId
      
      // Mock colony with large inventory size
      const mockColony = {
        _id: mockColonyId,
        maxInventory: 10
      };
      
      // Mock empty colony inventory
      const mockInventory = {
        colonyId: mockColonyId,
        items: []
      };
      
      // Mock settler with items
      const mockSettler = {
        carry: [
          { itemId: 'wood', quantity: 5 },
          { itemId: 'berries', quantity: 10 }
        ],
        save: jest.fn()
      };
      
      // Mock Mongoose methods
      Colony.findById = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(mockColony) });
      Inventory.findOne = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(mockInventory) });
      
      const settlerManager = new SettlerManager(mockSettler as any);
      const result = await settlerManager.transferItemsToColony(mockColonyId, mockSession);
      
      expect(result.transferredItems).toEqual({
        wood: 5,
        berries: 10
      });
      expect(result.remainingItems).toEqual({});
      expect(mockSettler.carry).toEqual([]); // All items transferred
      expect(mockSettler.save).toHaveBeenCalledWith({ session: mockSession });
      expect(addRewardsToColonyInventory).toHaveBeenCalledWith(
        mockColonyId, 
        mockSession, 
        { wood: 5, berries: 10 }
      );
    });
  });

  describe('giveRewardsToSettler', () => {
    test('should give rewards to settler within capacity', async () => {
      const mockSession = {} as ClientSession;
      const settler = createMockSettler(10); // 50 capacity
      
      // Mock the settler document
      const mockSettler = {
        ...settler,
        save: jest.fn()
      };
      
      const rewards = { berries: 20 }; // 20 * 0.3 = 6 weight, well within capacity
      
      const result = await giveRewardsToSettler(mockSettler as any, rewards, mockSession);
      
      expect(result.settlerItems.berries).toBe(20);
      expect(result.overflow).toEqual({});
      expect(mockSettler.carry).toHaveLength(1);
      expect(mockSettler.carry[0]).toEqual({ itemId: 'berries', quantity: 20 });
      expect(mockSettler.save).toHaveBeenCalledWith({ session: mockSession });
    });

    test('should handle overflow when settler cannot carry all items', async () => {
      const mockSession = {} as ClientSession;
      const settler = createMockSettler(10); // 50 capacity
      
      const mockSettler = {
        ...settler,
        save: jest.fn()
      };
      
      const rewards = { wood: 20 }; // 20 * 3 = 60 weight, exceeds 50 capacity
      
      const result = await giveRewardsToSettler(mockSettler as any, rewards, mockSession);
      
      expect(result.settlerItems.wood).toBeLessThan(20);
      expect(result.settlerItems.wood).toBeGreaterThan(0);
      expect(result.overflow.wood).toBeGreaterThan(0);
      expect(result.settlerItems.wood + result.overflow.wood).toBe(20);
    });
  });
});