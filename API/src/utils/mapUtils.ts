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

  const tileData = {
    serverId,
    x,
    y,
    terrain,
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
 */
export async function assignAdjacentTerrain(
  serverId: string,
  centerX: number,
  centerY: number,
  session?: ClientSession
): Promise<MapTileDoc[]> {
  const adjacentCoords = getAdjacentCoordinates(centerX, centerY);
  const createdTiles: MapTileDoc[] = [];

  for (const coord of adjacentCoords) {
    try {
      const tile = await createOrUpdateMapTile(serverId, coord.x, coord.y, {
        session
      });
      createdTiles.push(tile);
    } catch (error: any) {
      // Ignore duplicate key errors for concurrent operations
      if (error.code !== 11000) {
        console.error(`Error creating adjacent tile at ${coord.x},${coord.y}:`, error);
      }
    }
  }

  return createdTiles;
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
 * Updated to use UserMapTile for efficient colony-specific exploration tracking
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

  // Check if any adjacent tile has been explored by this colony using UserMapTile
  const adjacentCoords = getAdjacentCoordinates(x, y);
  
  for (const coord of adjacentCoords) {
    const adjacentTile = await getTile(serverId, coord.x, coord.y, session);
    if (adjacentTile) {
      // Check if this colony has explored this adjacent tile
      const hasExplored = await hasColonyExploredTile(
        adjacentTile._id.toString(),
        colonyId,
        session
      );
      if (hasExplored) {
        return true; // Adjacent tile is explored by this colony
      }
    }
  }

  return false; // No adjacent explored tiles
}

/**
 * Get a 5x5 grid of tiles centered on x,y coordinates, filtered for colony's fog of war
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
      
      // Only include tiles that this colony has explored using UserMapTile
      if (tile) {
        const hasExplored = await hasColonyExploredTile(
          tile._id.toString(),
          colonyId,
          session
        );
        if (hasExplored) {
          gridRow.push(tile);
        } else {
          gridRow.push(null); // Fog of war
        }
      } else {
        gridRow.push(null); // Tile doesn't exist yet
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

        // All assignments associated with this tile
        const tileAssignments = assignments.filter(a => a.location && a.location.x === colIndex && a.location.y === rowIndex);

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
           // icon: tile.icon
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