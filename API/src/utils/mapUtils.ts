import { ClientSession } from 'mongoose';
import {
  getRandomTerrain,
  generateTileLoot,
  generateTileThreat,
  generateTileEvent,
  getAdjacentCoordinates,
  getTerrainCatalogue
} from './gameUtils';
import { IEventInfo, ILootInfo, IThreatInfo, MapTile, MapTileDoc } from '../models/Server/MapTile';
import { UserMapTile, UserMapTileDoc } from '../models/Player/UserMapTile';
import { ColonyDoc } from '../models/Player/Colony';
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';

/**
 * Get a 5x5 grid for a colony centered on coordinates
 * Returns only the tiles the colony knows about (has UserMapTiles for)
 */
export async function getMapGrid(
  colonyId: string,
  centerX: number,
  centerY: number,
  session?: ClientSession
): Promise<any> {

  
  const gridSize = 5;
  const offset = Math.floor(gridSize / 2);
  const expandedOffset = offset + 1;
  
  const [userTiles, assignments] = await Promise.all([
    getUserMapTilesInArea(
      colonyId,
      centerX - expandedOffset, centerX + expandedOffset,
      centerY - expandedOffset, centerY + expandedOffset,
      session
    ),
    getAssignmentsInArea(
      colonyId,
      centerX - offset, centerX + offset,
      centerY - offset, centerY + offset,
      session
    )
  ]);

  const tileMap = new Map<string, any>();
  const exploredCoords = new Set<string>();
  
  userTiles.forEach(userTile => {
    const key = `${userTile.x},${userTile.y}`;
    exploredCoords.add(key);
    
    const isInGrid = userTile.x >= centerX - offset && userTile.x <= centerX + offset &&
                     userTile.y >= centerY - offset && userTile.y <= centerY + offset;
    
    if (isInGrid) {
      tileMap.set(key, {
        position: {
          row: userTile.y - (centerY - offset),
          col: userTile.x - (centerX - offset)
        },
        explored: userTile.isExplored,
        canExplore: true,
        x: userTile.x,
        y: userTile.y,
        terrain: getTerrainInfo(userTile).terrain,
        assignments: []
      });
    }
  });

  const assignmentMap = new Map<string, any[]>();
  assignments.forEach((assignment: any) => {
    const key = `${assignment.location!.x},${assignment.location!.y}`;
    if (!assignmentMap.has(key)) {
      assignmentMap.set(key, []);
    }
    assignmentMap.get(key)!.push(assignment);
  });

  const canExploreCache = new Map<string, boolean>();
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = centerX - offset + col;
      const y = centerY - offset + row;
      const key = `${x},${y}`;
      
      if (!exploredCoords.has(key)) {
        const isAdjacent = [
          `${x-1},${y}`, `${x+1},${y}`, 
          `${x},${y-1}`, `${x},${y+1}`,
          `${x-1},${y-1}`, `${x-1},${y+1}`,
          `${x+1},${y-1}`, `${x+1},${y+1}`
        ].some(adjKey => exploredCoords.has(adjKey));
        
        canExploreCache.set(key, isAdjacent);
      }
    }
  }

  const grid = {
    size: gridSize,
    tiles: [] as any[][]
  };

  for (let row = 0; row < gridSize; row++) {
    const gridRow = [];
    for (let col = 0; col < gridSize; col++) {
      const x = centerX - offset + col;
      const y = centerY - offset + row;
      const key = `${x},${y}`;

      const knownTile = tileMap.get(key);
      const tileAssignments = assignmentMap.get(key) || [];

      if (knownTile) {
        if (knownTile.terrain === 'homestead') {
          knownTile.canExplore = false;
        }
        knownTile.assignments = tileAssignments;
        gridRow.push(knownTile);
      } else {
        const canExplore = canExploreCache.get(key) ?? false;

        gridRow.push({
          position: { row, col },
          explored: false,
          canExplore,
          x,
          y,
          assignments: tileAssignments
        });
      }
    }
    grid.tiles.push(gridRow);
  }

  return grid;
}

/**
 * Check if a location can be explored
 * Must be adjacent to a known tile (UserMapTile) or be the homestead
 */
export async function canExploreLocation(
  colonyId: string,
  x: number,
  y: number,
  session?: ClientSession
): Promise<boolean> {

  // Check if adjacent to any known tiles
  const adjacentCoords = getAdjacentCoordinates(x, y);
  const adjacentConditions = adjacentCoords.map(c => ({ x: c.x, y: c.y }));

  // Single query to check if any adjacent coordinates have UserMapTiles
  const matchQuery = {
    colonyId,
    isExplored: true,
    $or: adjacentConditions
  };

  const foundTile = session
    ? await UserMapTile.findOne(matchQuery).session(session)
    : await UserMapTile.findOne(matchQuery);

  return !!foundTile;
}

/**
 * Create a MapTile if it doesn't exist
 */
export async function createOrUpdateMapTile(
  serverId: string,
  x: number,
  y: number,
    session: ClientSession,
  colony?: ColonyDoc,
): Promise<MapTileDoc> {
  // Try to find existing tile first
  const existingTile = await MapTile.findOne({ serverId, x, y }).session(session);

  if (existingTile) {
    if (colony && !existingTile.colony) {
      // Note: A tile will never change from colony to non-colony.
      // If other properties of MapTile can change over time (loot, threat, event), 
      // they should also be copied to UserMapTile at the time of exploration.
      existingTile.colony = colony._id;
      existingTile.terrain = 'colony'; // Update terrain to colony if assigned
      existingTile.icon = 'GiKnightBanner';
      await existingTile.save({ session });
    }
    return existingTile;
  }

  // Create new tile with random terrain and content
  const terrain = colony ? 'colony' : getRandomTerrain();
  const loot: ILootInfo[] | null = colony ? null : generateTileLoot(terrain);
  const threat: IThreatInfo | null = colony ? null : generateTileThreat(terrain);
  const event: IEventInfo | null = colony ? null : generateTileEvent(terrain);

  const tileData = {
    serverId,
    x,
    y,
    terrain,
    icon: colony ? 'GiKnightBanner' : getTerrainCatalogue(terrain)?.icon || '❓',
    loot,
    threat,
    event,
    colony: colony?._id || null,
  };

  const tile = new MapTile(tileData);
  return await tile.save({ session });
}

/**
 * Get UserMapTiles in a rectangular area
 */
export async function getUserMapTilesInArea(
  colonyId: string,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  session?: ClientSession
): Promise<UserMapTileDoc[]> {
  // Get all UserMapTiles for this colony
  const query = {
    colonyId,
    'x': { $gte: minX, $lte: maxX },
    'y': { $gte: minY, $lte: maxY }
  };

  return session
    ? await UserMapTile.find(query).lean().session(session)
    : await UserMapTile.find(query).lean();
}

export async function getAssignmentsInArea(
  colonyId: string,
  minX: number,
  maxX: number,
  minY: number, 
  maxY: number,
  session?: ClientSession
): Promise<AssignmentDoc[]> {
  // Get all Assignments in area for this colony
  const query = {
    colonyId,
    'location.x': { $gte: minX, $lte: maxX },
    'location.y': { $gte: minY, $lte: maxY },
    type: { $in: ['exploration'] } // Only include exploration assignments
  };

  return session
    ? await Assignment.find(query).lean().session(session)
    : await Assignment.find(query).lean();
}

/**
 * Create a UserMapTile when a colony discovers a new location
 * This should be called when exploration starts (isExplored = false)
 */
export async function createUserMapTile(
  colonyId: string,
  mapTileId: string,
  x: number,
  y: number,
  terrain: string,
  icon: string,
  distance: number,
  explorationTime: number,
  lootMultiplier: number,
  isExplored: boolean,
  session: ClientSession
): Promise<UserMapTileDoc> {
  
  const userTileData = {
    colonyId,
    serverTile: mapTileId,
    x,
    y,
    terrain,
    icon,
    distanceFromHomestead: distance,
    explorationTime,
    lootMultiplier,
    isExplored,
    exploredAt: new Date()
  };

  const userTile = new UserMapTile(userTileData);
  return await userTile.save({ session });
}


export function getTerrainInfo(
  userTile: UserMapTileDoc
) {
  let terrain;

  if (userTile.terrain === 'homestead') {
    terrain = {
      type: 'homestead',
      description: 'Your colony’s heart and starting point.',
      icon: userTile.icon,
      baseExplorationTime: 0,
      rewards: []
    };
  } else if (userTile.terrain === 'colony') {
    terrain = {
      type: 'colony',
      description: 'The central colony hub.',
      icon: userTile.icon,
      baseExplorationTime: 0,
      rewards: []
    };
  } else {
    const catalogue = getTerrainCatalogue(userTile.terrain);
    if (!catalogue) {
      throw new Error(`Invalid terrainId: ${userTile.terrain}`); // Should not happen
    }
    terrain = {
      type: catalogue.terrainId,
      description: catalogue.description,
      icon: catalogue.icon,
      rewards: catalogue.rewards || []
    };
  }

  return {
    terrain,
  };
}