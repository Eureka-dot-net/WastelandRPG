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
