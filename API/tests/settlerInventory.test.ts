import { 
  calculateCarryingCapacity,
  calculateCurrentCarriedWeight,
  canCarryItems,
  addItemsToSettlerInventory,
  getItemFromCatalogue
} from '../src/utils/settlerInventoryUtils';
import { ISettler, ISettlerItem } from '../src/models/Player/Settler';

// Mock settler data for testing
const createMockSettler = (strength: number = 10, carryItems: ISettlerItem[] = []): ISettler => ({
  colonyId: 'test_colony' as any,
  nameId: 'test',
  name: 'Test Settler',
  isActive: true,
  backstory: 'Test backstory',
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
});