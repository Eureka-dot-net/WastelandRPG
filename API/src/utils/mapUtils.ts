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
import { Assignment, AssignmentDoc } from '../models/Player/Assignment';

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

  return session 
    ? await MapTile.create([tileData], { session }).then(docs => docs[0])
    : await MapTile.create(tileData);
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
    ? await MapTile.create(tilesToCreate, { session })
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
 * Check if a tile can be explored (must be adjacent to an explored tile or homestead)
 * Optimized to use bulk queries instead of sequential lookups
 */
export async function canTileBeExplored(
  serverId: string,
  colonyId: string,
  x: number,
  y: number,
  session?: ClientSession
): Promise<boolean> {
  // Check if tile already exists (can always re-explore existing tiles)
  const existingTile = await getTile(serverId, x, y, session);
  if (existingTile) {
    return true;
  }

  // Get all adjacent coordinates
  const adjacentCoords = getAdjacentCoordinates(x, y);
  
  // Bulk query: Get all adjacent tiles that exist in a single query
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
    serverTile: { $in: adjacentTileIds }
  };
  
  const exploredTile = session 
    ? await UserMapTile.findOne(exploredTilesQuery).session(session)
    : await UserMapTile.findOne(exploredTilesQuery);

  return exploredTile !== null; // True if any adjacent tile is explored by this colony
}

/**
 * Get a 5x5 grid of tiles centered on x,y coordinates, filtered for colony's fog of war
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
  
  // Bulk query 1: Get all tiles in the 5x5 area
  const allTiles = await getTilesInArea(serverId, minX, maxX, minY, maxY, session);
  
  // Create a lookup map for tiles by coordinates
  const tileMap = new Map<string, MapTileDoc>();
  const tileIds: string[] = [];
  
  allTiles.forEach(tile => {
    const key = `${tile.x},${tile.y}`;
    tileMap.set(key, tile);
    tileIds.push(tile._id.toString());
  });
  
  // Bulk query 2: Get all UserMapTiles for this colony in the area
  const exploredTilesQuery = {
    colonyId,
    serverTile: { $in: tileIds }
  };
  
  const exploredTiles = session 
    ? await UserMapTile.find(exploredTilesQuery).session(session)
    : await UserMapTile.find(exploredTilesQuery);
  
  // Create a lookup set for explored tile IDs
  const exploredTileIds = new Set(
    exploredTiles.map(userTile => userTile.serverTile.toString())
  );
  
  // Build the grid using lookup maps
  const grid: (MapTileDoc | null)[][] = [];
  
  for (let row = 0; row < gridSize; row++) {
    const gridRow: (MapTileDoc | null)[] = [];
    
    for (let col = 0; col < gridSize; col++) {
      const x = centerX - offset + col;
      const y = centerY - offset + row;
      const key = `${x},${y}`;
      
      const tile = tileMap.get(key);
      
      if (tile && exploredTileIds.has(tile._id.toString())) {
        gridRow.push(tile);
      } else {
        gridRow.push(null); // Fog of war or tile doesn't exist
      }
    }
    
    grid.push(gridRow);
  }
  
  return grid;
}

/**
 * Transform grid to a more API-friendly format
 */
export function formatGridForAPI(
  grid: (MapTileDoc | null)[][],
  assignments: AssignmentDoc[] // all assignments for tiles in this grid
): any {
  return {
    size: grid.length,
    tiles: grid.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        const explored = !!tile;

        // When an exploration is started an assignment is created but the tile isn't explored yet.
        // that is why we need to check this assignment using grid coordinates
        const tileAssignments = assignments.filter(a => a.location && a.location.x === colIndex && a.location.y === rowIndex);
        // All assignments associated with this tile (use world coordinates, not grid coordinates)
        // const tileAssignments = tile 
        //   ? assignments.filter(a => a.location && a.location.x === tile.x && a.location.y === tile.y)
        //   : [];

        const canExplore = !explored && (
          (rowIndex > 0 && !!grid[rowIndex - 1][colIndex]) ||
          (rowIndex < grid.length - 1 && !!grid[rowIndex + 1][colIndex]) ||
          (colIndex > 0 && !!grid[rowIndex][colIndex - 1]) ||
          (colIndex < row.length - 1 && !!grid[rowIndex][colIndex + 1])
        );

        return {
          position: { row: rowIndex, col: colIndex },
          ...(tile ? {
            x: tile.x,
            y: tile.y,
            terrain: { type: tile.terrain, ...(getTerrainCatalogue(tile.terrain) || {}) },
            loot: tile.loot,
            threat: tile.threat,
            icon: tile.icon,
            assignments: tileAssignments,
            event: tile.event,
            exploredAt: tile.exploredAt,
            colony: tile.colony
          } : null),
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
 * Create a UserMapTile record for a colony exploring a tile
 */
export async function createUserMapTile(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<UserMapTileDoc> {
  const userTileData = {
    serverTile: serverTileId,
    colonyId,
    exploredAt: new Date()
  };

  return session 
    ? await UserMapTile.create([userTileData], { session }).then(docs => docs[0])
    : await UserMapTile.create(userTileData);
}

/**
 * Check if a colony has explored a specific tile using UserMapTile
 */
export async function hasColonyExploredTile(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<boolean> {
  const query = { serverTile: serverTileId, colonyId };
  const userTile = session 
    ? await UserMapTile.findOne(query).session(session)
    : await UserMapTile.findOne(query);
  
  return userTile !== null;
}

/**
 * Get all UserMapTiles for a colony (their exploration history)
 */
export async function getColonyExploredTiles(
  colonyId: string,
  session?: ClientSession
): Promise<UserMapTileDoc[]> {
  const query = { colonyId };
  return session 
    ? await UserMapTile.find(query).populate('serverTile').session(session)
    : await UserMapTile.find(query).populate('serverTile');
}

/**
 * Create or get existing UserMapTile for exploration
 */
export async function createOrGetUserMapTile(
  serverTileId: string,
  colonyId: string,
  session?: ClientSession
): Promise<UserMapTileDoc> {
  const query = { serverTile: serverTileId, colonyId };
  
  let userTile = session 
    ? await UserMapTile.findOne(query).session(session)
    : await UserMapTile.findOne(query);

  if (!userTile) {
    const userTileData = {
      serverTile: serverTileId,
      colonyId,
      exploredAt: new Date()
    };

    userTile = session 
      ? await UserMapTile.create([userTileData], { session }).then(docs => docs[0])
      : await UserMapTile.create(userTileData);
  }

  return userTile as UserMapTileDoc;
}