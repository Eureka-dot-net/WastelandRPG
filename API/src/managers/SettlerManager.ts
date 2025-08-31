import type { SettlerDoc } from '../models/Player/Settler';

export class SettlerManager {
  private settler: SettlerDoc;

  constructor(settler: SettlerDoc) {
    this.settler = settler;
  }

  // Computed: speed after all modifiers
  get speedModifier() {
    let modifier = 1;

    // Example: hunger reduces speed
    if (this.settler.hunger >= 50) modifier *= 0.5;

    if (this.settler.hunger >= 100) modifier *= 0.25;

    // Example: traits
    if (this.settler.traits?.some(t => t.traitId === 'energetic')) modifier *= 1.2;

    // TODO: add morale, equipment, etc.
    return modifier;
  }

  get effectiveSpeed() {
    return this.settler.stats.speed * this.speedModifier;
  }

  // Computed: daily food consumption multiplier
  get foodSatiationRate() {
    let multiplier = 1;

    //TODO: implement trait-based adjustments from catalogue
    // Example: gluttonous trait
    if (this.settler.traits?.some(t => t.traitId === 'gluttonous')) multiplier -= 0.5;

    // Example: a positive trait that reduces consumption
    if (this.settler.traits?.some(t => t.traitId === 'lightEater')) multiplier += 0.5;

    return multiplier;
  }

  toViewModel() {//return the full object to use in controllers.
    return {
      ...this.settler.toObject(), 
      stats: {
        ...this.settler.stats,
        speed: this.effectiveSpeed
      },
      foodSatiationRate: this.foodSatiationRate
    };
  }

  // Other computed values can go here
}
