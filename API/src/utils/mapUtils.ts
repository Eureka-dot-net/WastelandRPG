// utils/mapUtils.ts
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
import { AssignmentDoc } from '../models/Player/Assignment';

/**
 * Create or update a map tile with terrain and generated content
 */
export async function createOrUpdateMapTile(
  serverId: string,
  x: number,
  y: number,
  options: {
    terrain?: string;
    colony?: string;
    session?: ClientSession;
  } = {}
): Promise<MapTileDoc> {
  const {
    terrain = getRandomTerrain(),
    colony,
    session
  } = options;

  // Try to find existing tile first
  const query = { serverId, x, y };
  let existingTile = session 
    ? await MapTile.findOne(query).session(session)
    : await MapTile.findOne(query);

  if (existingTile) {
    // Update existing tile only if colony info needs to be set
    if (colony && !existingTile.colony) {
      existingTile.colony = colony as any;
      existingTile.exploredAt = new Date();
      return session ? await existingTile.save({ session }) : await existingTile.save();
    }
    return existingTile;
  }

  // Generate tile content
  const loot: ILootInfo[] = generateTileLoot(terrain);
  const threat: IThreatInfo | null = generateTileThreat(terrain);
  const event: IEventInfo | null = generateTileEvent(terrain);
  const icon = colony ? "GiVillage" : getTerrainCatalogue(terrain)?.icon || '❓';

  const tileData = {
    serverId,
    x,
    y,
    terrain,
    icon,
    loot,
    threat,
    event,
    exploredAt: new Date(),
    ...(colony && { colony })
  };

  if (session) {
    const tile = new MapTile(tileData);
    return await tile.save({ session });
  } else {
    return await MapTile.create(tileData);
  }
}

/**
 * Assign terrain to adjacent tiles when a tile is explored
 * Optimized to use bulk operations for better performance
 */
export async function assignAdjacentTerrain(
  serverId: string,
  centerX: number,
  centerY: number,
  session?: ClientSession
): Promise<MapTileDoc[]> {
  const adjacentCoords = getAdjacentCoordinates(centerX, centerY);
  
  // First, check which tiles already exist to avoid duplicates
  const existingTilesQuery = {
    serverId,
    $or: adjacentCoords.map(coord => ({ x: coord.x, y: coord.y }))
  };
  
  const existingTiles = session 
    ? await MapTile.find(existingTilesQuery).session(session)
    : await MapTile.find(existingTilesQuery);
    
  const existingCoordsSet = new Set(
    existingTiles.map(tile => `${tile.x},${tile.y}`)
  );
  
  // Filter out coordinates that already have tiles
  const newCoords = adjacentCoords.filter(
    coord => !existingCoordsSet.has(`${coord.x},${coord.y}`)
  );
  
  if (newCoords.length === 0) {
    return existingTiles; // All tiles already exist
  }
  
  // Generate tile data for bulk creation
  const tilesToCreate = newCoords.map(coord => {
    const terrain = getRandomTerrain();
    const loot: ILootInfo[] = generateTileLoot(terrain);
    const threat: IThreatInfo | null = generateTileThreat(terrain);
    const event: IEventInfo | null = generateTileEvent(terrain);
    const icon = getTerrainCatalogue(terrain)?.icon || '❓';
    
    return {
      serverId,
      x: coord.x,
      y: coord.y,
      terrain,
      icon,
      loot,
      threat,
      event,
      exploredAt: new Date()
    };
  });
  
  // Bulk create new tiles
  const createdTiles = session 
    ? await MapTile.create(tilesToCreate, { session, ordered: true })
    : await MapTile.create(tilesToCreate);
  
  return [...existingTiles, ...createdTiles];
}

/**
 * Get a 5x5 grid of tiles centered on x,y coordinates
 */
export async function getMapGrid(
  serverId: string,
  centerX: number,
  centerY: number,
  session?: ClientSession
): Promise<(MapTileDoc | null)[][]> {
  const gridSize = 5;
  const offset = Math.floor(gridSize / 2); // 2 for 5x5 grid
  
  const grid: (MapTileDoc | null)[][] = [];
  
  for (let row = 0; row < gridSize; row++) {
    const gridRow: (MapTileDoc | null)[] = [];
    
    for (let col = 0; col < gridSize; col++) {
      const x = centerX - offset + col;
      const y = centerY - offset + row;
      
      const query = { serverId, x, y };
      const tile = session 
        ? await MapTile.findOne(query).session(session)
        : await MapTile.findOne(query);
      
      gridRow.push(tile);
    }
    
    grid.push(gridRow);
  }
  
  return grid;
}

/**
 * Get all tiles in a specific area (for bulk operations)
 */
export async function getTilesInArea(
  serverId: string,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  session?: ClientSession
): Promise<MapTileDoc[]> {
  const query = {
    serverId,
    x: { $gte: minX, $lte: maxX },
    y: { $gte: minY, $lte: maxY }
  };

  return session 
    ? await MapTile.find(query).session(session)
    : await MapTile.find(query);
}

/**
 * Check if a tile exists and is explored
 */
export async function isTileExplored(
  serverId: string,
  x: number,
  y: number,
  session?: ClientSession
): Promise<boolean> {
  const query = { serverId, x, y };
  const tile = session 
    ? await MapTile.findOne(query).session(session)
    : await MapTile.findOne(query);
  
  return !!tile;
}

/**
 * Get tile with safe null handling
 */
export async function getTile(
  serverId: string,
  x: number,
  y: number,
  session?: ClientSession
): Promise<MapTileDoc | null> {
  const query = { serverId, x, y };
  return session 
    ? await MapTile.findOne(query).session(session)
    : await MapTile.findOne(query);
}

/**
 * Check if a tile can be explored (must be adjacent to an explored tile or homestead, or be re-explorable)
 * Optimized to use bulk queries instead of sequential lookups
 */
export async function canTileBeExplored(
  serverId: string,
  colonyId: string,
  x: number,
  y: number,
  session?: ClientSession
): Promise<boolean> {
  // Check if tile exists
  const existingTile = await getTile(serverId, x, y, session);
  
  if (existingTile) {
    // If tile exists, check if colony has already explored it
    const userMapTile = await getUserMapTileData(existingTile._id.toString(), colonyId, session);
    
    if (userMapTile) {
      if (userMapTile.isExplored) {
        return true; // Can re-explore completed tiles
      } else {
        return false; // Already exploring this tile (in progress)
      }
    } else {
      // Colony hasn't explored this tile yet, check adjacency requirements
      // (Skip adjacency check since tile exists - it was created by someone else's exploration)
      return true;
    }
  }

  // Tile doesn't exist - check adjacency requirements for new exploration
  const adjacentCoords = getAdjacentCoordinates(x, y);
  
  // Bulk query: Get all adjacent tiles that exist
  const adjacentTilesQuery = {
    serverId,
    $or: adjacentCoords.map(coord => ({ x: coord.x, y: coord.y }))
  };
  
  const adjacentTiles = session 
    ? await MapTile.find(adjacentTilesQuery).session(session)
    : await MapTile.find(adjacentTilesQuery);

  if (adjacentTiles.length === 0) {
    return false; // No adjacent tiles exist
  }

  // Bulk query: Check if this colony has explored any of the adjacent tiles
  const adjacentTileIds = adjacentTiles.map(tile => tile._id.toString());
  const exploredTilesQuery = {
    colonyId,
    serverTile: { $in: adjacentTileIds },
    isExplored: true // Only consider actually explored tiles
  };
  
  const exploredTile = session 
    ? await UserMapTile.findOne(exploredTilesQuery).session(session)
    : await UserMapTile.findOne(exploredTilesQuery);

  return exploredTile !== null; // True if any adjacent tile is explored by this colony
}

/**
 * Get a 5x5 grid of tiles centered on x,y coordinates
 * Returns all tiles that exist, regardless of exploration status by colony
 * OPTIMIZED VERSION: Uses bulk queries instead of individual tile lookups
 */
export async function getMapGridForColony(
  serverId: string,
  colonyId: string,
  centerX: number,
  centerY: number,
  session?: ClientSession
): Promise<(MapTileDoc | null)[][]> {
  const gridSize = 5;
  const offset = Math.floor(gridSize / 2); // 2 for 5x5 grid
  
  // Calculate grid boundaries for bulk query
  const minX = centerX - offset;
  const maxX = centerX + offset;
  const minY = centerY - offset;
  const maxY = centerY + offset;
  
  // Bulk query: Get all tiles in the 5x5 area (regardless of exploration status)
  const allTiles = await getTilesInArea(serverId, minX, maxX, minY, maxY, session);
  
  // Create a lookup map for tiles by coordinates
  const tileMap = new Map<string, MapTileDoc>();
  
  allTiles.forEach(tile => {
    const key = `${tile.x},${tile.y}`;
    tileMap.set(key, tile);
  });
  
  // Build the grid using lookup maps
  const grid: (MapTileDoc | null)[][] = [];
  
  for (let row = 0; row < gridSize; row++) {
    const gridRow: (MapTileDoc | null)[] = [];
    
    for (let col = 0; col < gridSize; col++) {
      const x = centerX - offset + col;
      const y = centerY - offset + row;
      const key = `${x},${y}`;
      
      const tile = tileMap.get(key);
      gridRow.push(tile || null); // Return tile if exists, null otherwise
    }
    
    grid.push(gridRow);
  }
  
  return grid;
}

/**
 * Transform grid to a more API-friendly format
 * Now properly handles exploration status and assignment matching
 */
export async function formatGridForAPI(
  grid: (MapTileDoc | null)[][],
  assignments: AssignmentDoc[], // all assignments for tiles in this grid
  colonyId: string,
  centerX: number,
  centerY: number,
  session?: ClientSession
): Promise<any> {
  const gridSize = grid.length;
  const offset = Math.floor(gridSize / 2);
  
  // Get all tiles that exist in the grid for bulk exploration status query
  const existingTiles = grid.flat().filter(tile => tile !== null) as MapTileDoc[];
  const tileIds = existingTiles.map(tile => tile._id.toString());
  
  // Bulk query: Get exploration status for all tiles in the grid
  const exploredTilesQuery = {
    colonyId,
    serverTile: { $in: tileIds },
    isExplored: true
  };
  
  const exploredTiles = session 
    ? await UserMapTile.find(exploredTilesQuery).session(session)
    : await UserMapTile.find(exploredTilesQuery);
  
  // Create a lookup set for explored tile IDs
  const exploredTileIds = new Set(
    exploredTiles.map(userTile => userTile.serverTile.toString())
  );

  return {
    size: gridSize,
    tiles: grid.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        // Calculate world coordinates for this grid position
        const worldX = centerX - offset + colIndex;
        const worldY = centerY - offset + rowIndex;
        
        // Check if this tile has been explored by this colony
        const explored = tile ? exploredTileIds.has(tile._id.toString()) : false;

        // Match assignments using world coordinates
        const tileAssignments = assignments.filter(a => 
          a.location && a.location.x === worldX && a.location.y === worldY
        );

        // Tiles can be re-explored, so check if adjacent tiles exist (not if current tile is unexplored)
        const canExplore = (
          (rowIndex > 0 && !!grid[rowIndex - 1][colIndex]) ||
          (rowIndex < gridSize - 1 && !!grid[rowIndex + 1][colIndex]) ||
          (colIndex > 0 && !!grid[rowIndex][colIndex - 1]) ||
          (colIndex < row.length - 1 && !!grid[rowIndex][colIndex + 1]) ||
          explored // If tile is already explored by this colony, it can be re-explored
        );

        return {
          position: { row: rowIndex, col: colIndex },
          x: worldX,
          y: worldY,
          assignments: tileAssignments, // Always show assignments, regardless of exploration
          ...(tile && explored ? {
            // Only show tile details if explored by this colony (fog of war)
            terrain: { type: tile.terrain, ...(getTerrainCatalogue(tile.terrain) || {}) },
            loot: tile.loot,
            threat: tile.threat,
            icon: tile.icon,
            event: tile.event,
            exploredAt: tile.exploredAt,
            colony: tile.colony
          } : {}),
          explored,
          canExplore
        };
      })
    )
  };
}
/**
 * UserMapTile utility functions for efficient user-specific exploration tracking
 */

/**
 * Create or update a UserMapTile record for a colony starting to explore a tile
 * Handles re-exploration by updating existing records
 */
export async function createOrUpdateUserMapTile(
  serverTileId: string,
  colonyId: string,
  distanceFromHomestead: number,
  explorationTime: number,
  lootMultiplier: number,
  discoveredLoot: ILootInfo[],
  session?: ClientSession
): Promise<UserMapTileDoc> {
  // Check if UserMapTile already exists
  const existingUserTile = await getUserMapTileData(serverTileId, colonyId, session);
  
  if (existingUserTile) {
    if (!existingUserTile.isExplored) {
      throw new Error('Cannot start exploration - tile is already being explored');
    }
    
    // Update existing UserMapTile for re-exploration
    existingUserTile.exploredAt = new Date();
    existingUserTile.isExplored = false; // Reset to false for new exploration
    existingUserTile.distanceFromHomestead = distanceFromHomestead;
    existingUserTile.explorationTime = explorationTime;
    existingUserTile.lootMultiplier = lootMultiplier;
    existingUserTile.discoveredLoot = discoveredLoot;
    
    return session ? await existingUserTile.save({ session }) : await existingUserTile.save();
  }
  
  // Create new UserMapTile
  const userTileData = {
    serverTile: serverTileId,
    colonyId,
    exploredAt: new Date(),
    isExplored: false, // Will be set to true when exploration completes
    distanceFromHomestead,
    explorationTime,
    lootMultiplier,
    discoveredLoot // Store the actual calculated loot amounts
  };

  if (session) {
    const userTile = new UserMapTile(userTileData);
    return await userTile.save({ session });
  } else {
    return await UserMapTile.create(userTileData);
  }
}

/**
 * Create a UserMapTile record for a colony starting to explore a tile
 * @deprecated Use createOrUpdateUserMapTile instead to handle re-exploration
 */
export async function createUserMapTile(
  serverTileId: string,
  colonyId: string,
  distanceFromHomestead: number,
  explorationTime: number,
  lootMultiplier: number,
  discoveredLoot: ILootInfo[],
  session?: ClientSession
): Promise<UserMapTileDoc> {
  return createOrUpdateUserMapTile(
    serverTileId,
    colonyId,
    distanceFromHomestead,
    explorationTime,
    lootMultiplier,
    discoveredLoot,
    session
  );
}

/**
 * Check if a colony has explored a specific tile using UserMapTile
 * Now checks both existence AND isExplored flag
 */
export async function hasColonyExploredTile(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<boolean> {
  const query = { serverTile: serverTileId, colonyId, isExplored: true };
  const userTile = session 
    ? await UserMapTile.findOne(query).session(session)
    : await UserMapTile.findOne(query);
  
  return userTile !== null;
}

/**
 * Get all UserMapTiles for a colony (their exploration history)
 * Only returns actually explored tiles (isExplored: true)
 */
export async function getColonyExploredTiles(
  colonyId: string,
  session?: ClientSession
): Promise<UserMapTileDoc[]> {
  const query = { colonyId, isExplored: true };
  return session 
    ? await UserMapTile.find(query).populate('serverTile').session(session)
    : await UserMapTile.find(query).populate('serverTile');
}

/**
 * Get UserMapTile data for a colony and tile (for accessing stored distance/time/loot values)
 */
export async function getUserMapTileData(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<UserMapTileDoc | null> {
  const query = { serverTile: serverTileId, colonyId };
  return session
    ? await UserMapTile.findOne(query).session(session)
    : await UserMapTile.findOne(query);
}

/**
 * Mark a UserMapTile as fully explored (used when exploration completes)
 */
export async function markUserMapTileExplored(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<UserMapTileDoc | null> {
  const query = { serverTile: serverTileId, colonyId };
  const update = { isExplored: true, exploredAt: new Date() };
  
  return session
    ? await UserMapTile.findOneAndUpdate(query, update, { new: true }).session(session)
    : await UserMapTile.findOneAndUpdate(query, update, { new: true });
}

