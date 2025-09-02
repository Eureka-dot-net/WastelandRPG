# Wasteland RPG – Project Design Notes

This document provides a detailed overview of the **Wasteland RPG** project, including the current vision, key gameplay concepts, identified risks, and a phased roadmap for development.

---

## Overview

**Wasteland RPG** is a text-based colony management simulation set in a harsh post-apocalyptic world. Players will lead a colony, manage settlers, gather resources, and face threats while interacting with other players in a persistent multiplayer environment.

- **Genre:** Text-based colony management simulation  
- **Status:** Early alpha (as of August 27, 2025)  
- **Multiplayer:** Core feature with player-to-player interactions planned  
- **Tech Stack:**
  - **Backend:** Node.js (source of truth for game data and logic)
  - **Frontend:** React (visual wrapper for game state and decisions)
  - **Future:** Mobile frontend (likely .NET MAUI or React Native; architecture to be confirmed)

---

## Core Design Concepts

### Settlers
- Players begin by selecting one settler from a pool of three (lore reason: limited resources at start).
- Settlers have:
  - **Core attributes:** Morale, energy, health, hunger (planned).
  - **Stats (0–10):** Strength, speed, intelligence, resilience.
  - **Skills (0–20):** Scavenging, farming, combat, crafting, medical, engineering (with plans for mining, research, etc.).
  - **Interests:** Two skills that grow faster with experience.
  - **Traits:** One positive and one negative trait per settler.
- Settlers can gain injuries, suffer from diseases, and develop permanent changes in the future.

### Map & Exploration
- Procedurally generated map with expanding grid (X/Y coordinates with contents).
- Each new player spawns a set distance from existing players, expanding the world.
- Exploration is **event-driven**, with travel times increasing with distance.
- Loot balancing challenge: What is far for one player may be close for another.

### Notoriety System
- Players can engage in dark activities (cannibalism, slavery, torture, organ harvesting).
- These actions bring rewards (food, resources, rare opportunities) but increase notoriety.
- High notoriety reduces protection (e.g., shorter shields after attacks) and lowers settler morale.
- Notoriety is intended as a **risk-reward system**, not purely punitive.

### Multiplayer Features
- Players will eventually be able to:
  - Trade resources and possibly colonists.
  - Attack others’ scavenging parties or homesteads.
  - Communicate via in-game chat.
- Initial multiplayer interactions may be asynchronous (non-real-time).

### Gameplay Focus
- Emphasis on **simulation depth over narrative immersion**.
- Lore exists for flavor but is not the primary driver.
- Events will be mostly random with modifiers from player actions (e.g., notoriety increases raid likelihood).

---

## Identified Risks & Blind Spots

### A. Scope Creep & System Interdependencies
- Multiple complex systems (settlers, crafting, farming, raiding, exploration, events) risk spreading development too thin.
- **Mitigation:** Focus on a *Minimum Playable Loop (MVP)* before expanding.

### B. Multiplayer Complexity
- Shared world expansion, loot balancing, and synchronous vs. asynchronous play present technical challenges.
- **Mitigation:** Start asynchronous, add real-time PvP later.

### C. Cheating & Client–Server Trust
- Server must remain authoritative to prevent cheating.
- **Mitigation:** Keep all state transitions server-side; clients serve only as interfaces.

### D. Player Retention vs. Punishment
- Harsh failure may alienate casual players; forgiving mechanics may bore hardcore ones.
- **Mitigation:** Consider "soft death" – colony collapse leads to restart with meta-progression.

### E. Notoriety Balancing
- Dark mechanics risk being either overpowered, ignored, or controversial.
- **Mitigation:** Make notoriety a strategic choice with unique but risky benefits.

### F. Exploration Loot Balancing
- Distance-based rewards may be inconsistent between players.
- **Mitigation:** Scale rewards by expedition cost, not static coordinates.

### G. Settler Complexity
- Early overload of stats, skills, and traits may overwhelm players.
- **Mitigation:** Reveal advanced mechanics progressively.

---

## Development Roadmap

### Phase 1 – Minimum Playable Loop (MVP)
- Single settler start.
- Homestead cleanup (resources + chance for second settler).
- Basic exploration of nearby tiles.
- Basic inventory for raw resources and food.
- Core survival loop: morale, energy, health.
- Login and registration.
- Placeholder notoriety value (no major effects yet).

**Goal:** Allow players to log in, manage a settler, scavenge, and survive a few cycles.

---

### Phase 2 – Colony Foundations
- Hunger and basic food production (foraging/hunting).
- Crafting essentials (tools, basic shelter).
- Notoriety effects on raider frequency and morale.
- NPC trade caravans.
- Map expansion around active players.

---

### Phase 3 – Multiplayer Layer
- Asynchronous player-to-player trade.
- Raiding (offline colonies with shield timers).
- Chat and reputation board.
- Sector-based map regions to control expansion.

---

### Phase 4 – Systems Deepening
- Farming and advanced crafting.
- Injuries, permanent changes, and medical care.
- Random events and encounters.
- Notoriety unlocks (items, dark mechanics).

---

### Phase 5 – Long-Term Hooks
- NPC factions, diplomacy, and alliances.
- Persistent meta-progression (tech tree, blueprints).
- Endgame goals: domination, sanctuary, or escape.

---

## Potential Showstoppers
1. **Map scalability:** Prevent exponential storage growth.
2. **Multiplayer synchronization:** Balance engagement without requiring real-time play.
3. **Economy stability:** Avoid resource inflation as player count grows.
4. **Content generation:** Text-based games require a steady flow of events and encounters.

---

## Current Status
- Login, registration, and initial colonist selection implemented.
- Homestead cleanup in early development.
- Map, crafting, farming, and advanced systems planned but not yet implemented.
- Multiplayer core concepts defined but no active features released.

---
WastelandRPG Feature Implementation Template
Based on lessons learned from the exploration system implementation, follow this pattern for any new game mechanics:

1. Server-Authoritative Architecture (Critical)
All game logic runs server-side - Client only displays data and sends user actions
Create dedicated models for tracking feature state (like Exploration.ts)
Use middleware integration - Add to updateCompletedTasks.ts for auto-completion
Transaction-based operations - All DB operations use MongoDB sessions for consistency
2. Required File Structure
API/src/models/Server/{Feature}.ts          # State tracking model
API/src/services/{feature}Service.ts        # Business logic service  
API/src/controllers/{feature}Controller.ts  # API endpoints
API/src/routes/{feature}.ts                 # Route definitions
API/src/data/{feature}Catalogue.json        # Static game data
3. Model Pattern (follow Exploration.ts)
interface I{Feature} {
  serverId: string;                    # Multi-server support
  colonyId: Types.ObjectId;           # Colony ownership
  settlerId: Types.ObjectId;          # Settler assignment
  state: 'in-progress' | 'completed' | 'informed';  # Lifecycle states
  startedAt: Date;
  completedAt: Date;
  plannedRewards: Record<string, number>;
  adjustments: GameAdjustments;       # Settler stat/skill/trait bonuses
}
4. API Endpoints Pattern
GET /:colonyId/{feature} - List active tasks (with fog of war filtering)
POST /:colonyId/{feature}/preview - Preview adjusted rewards/duration based on settler
POST /:colonyId/{feature}/start - Create server-side tracking with completion time
POST /:colonyId/{feature}/inform - Process completed tasks, return rewards/discoveries
5. Critical Validations
Adjacency/Access Control - Validate player can perform action (like exploration adjacency)
Settler Availability - Check settler.status === 'idle' before assignment
Existing Task Check - Prevent duplicate tasks with unique indexes
Colony Ownership - Use colonyOwnership middleware on all endpoints
6. Game Mechanics Integration
Catalogue Requirements - All loot/rewards must exist in itemsCatalogue.json
Settler Adjustments - Use calculateSettlerAdjustments() for speed/loot bonuses
Auto-completion - Add service call to updateCompletedTasks middleware
Fog of War - Filter results by colony ownership for multiplayer isolation
7. Data Catalogue Structure
{
  "{item}Id": "unique_identifier",
  "name": "Display Name", 
  "icon": "Gi{ReactIcon}",         # From react-icons/gi
  "type": "category",
  "rarity": "common|uncommon|rare|epic|legendary",
  "tradeValue": 1,
  "description": "Flavor text",
  "properties": { "stackable": true },
  "obtainMethods": ["farming", "crafting", "trading"]
}
8. Service Pattern (follow explorationService.ts)
Completion Handler - Process completed tasks in batch
Inventory Management - Add rewards using addRewardsToColonyInventory()
Discovery Logic - Handle special discoveries (settlers, blueprints, etc.)
Transaction Safety - All operations within provided session
9. Common Pitfalls to Avoid
Don't create objects if validation fails - Check adjacency/permissions first
Don't forget middleware integration - Auto-completion requires service call
Don't skip catalogue validation - All items must exist in catalogues
Don't ignore fog of war - Always filter by colony ownership
Don't hardcode durations - Use catalogue data with settler adjustments
10. Testing Checklist
 Can start task with valid settler
 Rejects invalid/busy settlers
 Validates access permissions (adjacency, prerequisites)
 Auto-completes after duration expires
 Rewards added to inventory correctly
 Fog of war filtering works per colony
 All catalogue items exist with proper icons
This pattern ensures consistency with existing systems and proper server-authoritative design.