import { ClientSession, Types } from 'mongoose';
import {
  getRandomTerrain,
  generateTileLoot,
  generateTileThreat,
  generateTileEvent,
  getAdjacentCoordinates,
  getTerrainCatalogue
} from './gameUtils';
import { IEventInfo, ILootInfo, IThreatInfo, MapTile, MapTileDoc, IMapTile } from '../models/Server/MapTile';
import { UserMapTile, UserMapTileDoc, IUserMapTile } from '../models/Player/UserMapTile';
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

    if (userTile.isExplored) {
      exploredCoords.add(key);
    }

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
        terrain: userTile.isExplored ? getTerrainInfo(userTile).terrain : undefined,
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
          `${x - 1},${y}`, `${x + 1},${y}`,
          `${x},${y - 1}`, `${x},${y + 1}`,
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
        // <<< guarded access to terrain.type to avoid runtime throw when terrain is undefined
        if (knownTile.terrain?.type === 'homestead') {
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
  const loot: ILootInfo[] | undefined = colony ? undefined : generateTileLoot(terrain) || undefined;
  const threat: IThreatInfo | null = colony ? null : generateTileThreat(terrain);
  const event: IEventInfo | null = colony ? null : generateTileEvent(terrain);

  const tileData: IMapTile = {
    serverId,
    x,
    y,
    terrain,
    icon: colony ? 'GiKnightBanner' : getTerrainCatalogue(terrain)?.icon || '❓',
    loot,
    threat,
    event,
    colony: colony?._id,
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
 * Create or update a UserMapTile for a colony exploring a map location
 * Used for starting exploration - sets isExplored to false initially
 */
export async function createOrUpdateUserMapTile(
  serverTileId: string,
  colonyId: string,
  distanceFromHomestead: number,
  explorationTime: number,
  lootMultiplier: number,
  discoveredLoot?: Array<{ item: string; amount: number }>,
  session?: ClientSession
): Promise<UserMapTileDoc> {
  // First get the MapTile to get coordinates and terrain
  const mapTile = await (session 
    ? MapTile.findById(serverTileId).session(session)
    : MapTile.findById(serverTileId));
  
  if (!mapTile) {
    throw new Error('MapTile not found');
  }

  // Check if UserMapTile already exists
  const existingUserTile = await (session
    ? UserMapTile.findOne({ serverTile: serverTileId, colonyId }).session(session)
    : UserMapTile.findOne({ serverTile: serverTileId, colonyId }));

  if (existingUserTile) {
    // If already being explored (not yet completed), prevent starting new exploration
    if (!existingUserTile.isExplored) {
      throw new Error('Cannot start exploration - tile is already being explored');
    }
    
    // If previously completed, allow re-exploration with updated parameters
    existingUserTile.distanceFromHomestead = distanceFromHomestead;
    existingUserTile.explorationTime = explorationTime;
    existingUserTile.lootMultiplier = lootMultiplier;
    existingUserTile.isExplored = false; // Reset for new exploration
    existingUserTile.exploredAt = new Date();
    // Note: discoveredLoot is not part of UserMapTile schema in current implementation
    
    return await (session 
      ? existingUserTile.save({ session })
      : existingUserTile.save());
  }

  // Create new UserMapTile
  const userTileData: IUserMapTile = {
    serverTile: new Types.ObjectId(serverTileId),
    x: mapTile.x,
    y: mapTile.y,
    terrain: mapTile.terrain,
    icon: mapTile.icon,
    colonyId,
    distanceFromHomestead,
    explorationTime,
    lootMultiplier,
    isExplored: false,
    exploredAt: new Date()
  };

  const userTile = new UserMapTile(userTileData);
  return await (session 
    ? userTile.save({ session })
    : userTile.save());
}

/**
 * Check if a colony has fully explored a specific tile
 */
export async function hasColonyExploredTile(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<boolean> {
  const userTile = await (session
    ? UserMapTile.findOne({ serverTile: serverTileId, colonyId }).session(session)
    : UserMapTile.findOne({ serverTile: serverTileId, colonyId }));
  
  return userTile ? userTile.isExplored : false;
}

/**
 * Mark a UserMapTile as fully explored (exploration completed)
 */
export async function markUserMapTileExplored(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<UserMapTileDoc | null> {
  const userTile = await (session
    ? UserMapTile.findOneAndUpdate(
        { serverTile: serverTileId, colonyId },
        { isExplored: true, exploredAt: new Date() },
        { new: true, session }
      )
    : UserMapTile.findOneAndUpdate(
        { serverTile: serverTileId, colonyId },
        { isExplored: true, exploredAt: new Date() },
        { new: true }
      ));
  
  return userTile;
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