// Example showing how to use the refactored SettlerPreviewCard with custom preview data

import React from 'react';
import SettlerPreviewCard from '../app/shared/components/settlers/SettlerPreviewCard';
import type { UnifiedPreview } from '../lib/types/preview';
import type { Settler } from '../lib/types/settler';

// Example of how easy it is to create a custom event preview
const createCustomEventPreview = (settler: Settler, eventType: string): UnifiedPreview => {
  return {
    type: 'exploration', // We can reuse the exploration type or create new ones
    settlerId: settler._id,
    settlerName: settler.name,
    duration: 600000, // 10 minutes
    coordinates: { x: 0, y: 0 },
    terrain: {
      type: 'special_event',
      name: `${eventType} Event Zone`,
      description: `A special area where ${eventType} events occur`,
      icon: 'GiSparkles'
    },
    adjustments: {
      speedEffects: [`${eventType} Speed Bonus: +25%`],
      lootEffects: [`${eventType} Loot Bonus: +50%`],
      traitEffects: []
    },
    alreadyExplored: false
  };
};

// Example usage component
const ExampleUsage: React.FC = () => {
  const exampleSettler: Settler = {
    _id: 'settler1',
    colonyId: 'colony1',
    isActive: true,
    nameId: 'john_doe',
    name: 'John Doe',
    backstory: 'A skilled scavenger with a knack for finding useful items.',
    theme: 'wasteland',
    isFemale: false,
    stats: { strength: 10, speed: 8, intelligence: 12, resilience: 9 },
    skills: { combat: 2, scavenging: 5, farming: 1, crafting: 3, medical: 1, engineering: 2 },
    interests: ['scavenging', 'crafting'],
    traits: [{
      traitId: 'lucky',
      name: 'Lucky',
      type: 'positive',
      description: 'This settler finds better loot when scavenging.',
      icon: 'GiHorseshoe'
    }],
    status: 'idle',
    health: 100,
    morale: 80,
    hunger: 20,
    energy: 90,
    carry: [],
    equipment: {},
    foodConsumption: 1,
    maxCarrySlots: 10,
    createdAt: new Date().toISOString()
  };

  // Example 1: Custom assignment preview using the new preview prop
  const assignmentPreview: UnifiedPreview = {
    type: 'assignment',
    settlerId: exampleSettler._id,
    settlerName: exampleSettler.name,
    duration: 240000, // 4 minutes (adjusted for settler's speed)
    baseDuration: 300000, // 5 minutes base
    basePlannedRewards: { scrap: 10, electronics: 2 },
    adjustments: {
      speedEffects: ['Lucky: Speed stat: 1.25x', 'High speed stat: +20%'],
      lootEffects: ['Lucky: +25% more loot', 'Scavenging skill: +50% electronics'],
      traitEffects: ['Lucky: Better quality finds'],
      adjustedDuration: 240000,
      lootMultiplier: 1.75,
      effects: {
        speedEffects: ['Lucky: Speed stat: 1.25x', 'High speed stat: +20%'],
        lootEffects: ['Lucky: +25% more loot', 'Scavenging skill: +50% electronics'],
        traitEffects: ['Lucky: Better quality finds']
      }
    }
  };
  
  const assignmentCard = (
    <SettlerPreviewCard
      settler={exampleSettler}
      preview={assignmentPreview}
      isLoading={false}
      error={null}
    />
  );

  // Example 2: Map exploration preview using the new preview prop
  const mapExplorationPreview: UnifiedPreview = {
    type: 'exploration',
    settlerId: exampleSettler._id,
    settlerName: exampleSettler.name,
    duration: 480000, // 8 minutes
    coordinates: { x: 5, y: 3 },
    terrain: {
      type: 'ruins',
      name: 'Industrial Ruins',
      description: 'Collapsed factories and warehouses, likely to contain scrap metal and electronics',
      icon: 'GiFactory'
    },
    adjustments: {
      speedEffects: ['Terrain difficulty: -10% speed'],
      lootEffects: ['Industrial terrain: +30% electronics', 'Lucky trait: +25% all loot'],
      traitEffects: ['Lucky: Better quality finds']
    },
    alreadyExplored: false
  };
  
  const mapCard = (
    <SettlerPreviewCard
      settler={exampleSettler}
      preview={mapExplorationPreview}
      isLoading={false}
      error={null}
    />
  );

  // Example 3: Custom event preview (using the new preview prop)
  const customEventPreview = createCustomEventPreview(exampleSettler, 'Treasure Hunt');
  const customEventCard = (
    <SettlerPreviewCard
      settler={exampleSettler}
      preview={customEventPreview}
      isLoading={false}
      error={null}
    />
  );

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      {assignmentCard}
      {mapCard} 
      {customEventCard}
    </div>
  );
};

export default ExampleUsage;