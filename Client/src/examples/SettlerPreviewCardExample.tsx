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
    name: 'John Doe',
    stats: { strength: 10, agility: 8, intelligence: 12 },
    skills: { scavenging: 5, crafting: 3 },
    traits: ['Lucky'],
    status: 'idle'
  };

  // Example 1: Traditional assignment preview (handled by the component's hooks)
  const assignmentCard = (
    <SettlerPreviewCard
      settler={exampleSettler}
      assignment={{ _id: 'assign1', name: 'Scavenge', duration: 300000 }}
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