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

  // Example 1: Traditional assignment preview (handled by the component's hooks)
  const assignmentCard = (
    <SettlerPreviewCard
      settler={exampleSettler}
      assignment={{
        _id: 'assign1',
        colonyId: 'colony1',
        taskId: 'scavenge_task_1',
        type: 'scavenging',
        state: 'available',
        name: 'Scavenge',
        settlerId: '',
        description: 'Search for useful materials in the wasteland.',
        duration: 300000,
        unlocks: '',
        plannedRewards: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }}
      colonyId="colony1"
    />
  );

  // Example 2: Map exploration preview (handled by the component's hooks)
  const mapCard = (
    <SettlerPreviewCard
      settler={exampleSettler}
      colonyId="colony1" 
      mapCoordinates={{ x: 5, y: 3 }}
    />
  );

  // Example 3: Custom event preview (using the new preview prop)
  const customEventPreview = createCustomEventPreview(exampleSettler, 'Treasure Hunt');
  const customEventCard = (
    <SettlerPreviewCard
      settler={exampleSettler}
      colonyId="colony1"
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