// utils/mapUtils.ts
import { ClientSession } from 'mongoose';
import { MapTileModel, MapTileDoc, LootInfo, ThreatInfo, EventInfo } from '../models/Server/MapTile';
import { 
  getRandomTerrain, 
  generateTileLoot, 
  generateTileThreat, 
  generateTileEvent,
  getAdjacentCoordinates,
  getTerrainCatalogue 
} from './gameUtils';

/**
 * Create or update a map tile with terrain and generated content
 */
export async function createOrUpdateMapTile(
  serverId: string,
  x: number,
  y: number,
  options: {
    terrain?: string;
    exploredBy?: string;
    colony?: string;
    session?: ClientSession;
  } = {}
): Promise<MapTileDoc> {
  const {
    terrain = getRandomTerrain(),
    exploredBy = 'system',
    colony,
    session
  } = options;

  // Try to find existing tile first
  const query = { serverId, x, y };
  let existingTile = session 
    ? await MapTileModel.findOne(query).session(session)
    : await MapTileModel.findOne(query);

  if (existingTile) {
    // Update existing tile if not already explored by this entity
    if (!existingTile.exploredBy.includes(exploredBy)) {
      existingTile.exploredBy.push(exploredBy);
      existingTile.exploredAt = new Date();
      if (colony && !existingTile.colony) {
        existingTile.colony = colony as any;
      }
      return session ? await existingTile.save({ session }) : await existingTile.save();
    }
    return existingTile;
  }

  // Generate tile content
  const loot: LootInfo[] = generateTileLoot(terrain);
  const threat: ThreatInfo | null = generateTileThreat(terrain);
  const event: EventInfo | null = generateTileEvent(terrain);

  const tileData = {
    serverId,
    x,
    y,
    terrain,
    loot,
    threat,
    event,
    exploredBy: [exploredBy],
    exploredAt: new Date(),
    ...(colony && { colony })
  };

  return session 
    ? await MapTileModel.create([tileData], { session }).then(docs => docs[0])
    : await MapTileModel.create(tileData);
}

/**
 * Assign terrain to adjacent tiles when a tile is explored
 */
export async function assignAdjacentTerrain(
  serverId: string,
  centerX: number,
  centerY: number,
  exploredBy: string,
  session?: ClientSession
): Promise<MapTileDoc[]> {
  const adjacentCoords = getAdjacentCoordinates(centerX, centerY);
  const createdTiles: MapTileDoc[] = [];

  for (const coord of adjacentCoords) {
    try {
      const tile = await createOrUpdateMapTile(serverId, coord.x, coord.y, {
        exploredBy: 'auto_generated',
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
        ? await MapTileModel.findOne(query).session(session)
        : await MapTileModel.findOne(query);
      
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
    ? await MapTileModel.find(query).session(session)
    : await MapTileModel.find(query);
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
    ? await MapTileModel.findOne(query).session(session)
    : await MapTileModel.findOne(query);
  
  return !!tile && tile.exploredBy.length > 0;
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
    ? await MapTileModel.findOne(query).session(session)
    : await MapTileModel.findOne(query);
}

/**
 * Check if a tile can be explored (must be adjacent to an explored tile or homestead)
 */
export async function canTileBeExplored(
  serverId: string,
  colonyId: string,
  x: number,
  y: number,
  session?: ClientSession
): Promise<boolean> {
  // Check if tile is already explored
  const existingTile = await getTile(serverId, x, y, session);
  if (existingTile) {
    return true; // Can always re-explore existing tiles
  }

  // Check if any adjacent tile is explored by this colony
  const adjacentCoords = getAdjacentCoordinates(x, y);
  
  for (const coord of adjacentCoords) {
    const adjacentTile = await getTile(serverId, coord.x, coord.y, session);
    if (adjacentTile && (
      adjacentTile.colony?.toString() === colonyId ||
      adjacentTile.exploredBy.some(explorer => explorer !== 'auto_generated')
    )) {
      return true; // Adjacent tile is explored by this colony
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
        ? await MapTileModel.findOne(query).session(session)
        : await MapTileModel.findOne(query);
      
      // Only include tiles that this colony has explored or that are homestead tiles
      if (tile && (
        tile.colony?.toString() === colonyId ||
        tile.exploredBy.some(explorer => explorer !== 'auto_generated')
      )) {
        gridRow.push(tile);
      } else {
        gridRow.push(null); // Fog of war
      }
    }
    
    grid.push(gridRow);
  }
  
  return grid;
}

/**
 * Transform grid to a more API-friendly format
 */
export function formatGridForAPI(grid: (MapTileDoc | null)[][]): any {
  return {
    size: grid.length,
    tiles: grid.map((row, rowIndex) => 
      row.map((tile, colIndex) => ({
        position: { row: rowIndex, col: colIndex },
        ...(tile ? {
          x: tile.x,
          y: tile.y,
          terrain: {
            type: tile.terrain,
            ...(getTerrainCatalogue(tile.terrain) || {})
          },
          loot: tile.loot,
          threat: tile.threat,
          event: tile.event,
          exploredBy: tile.exploredBy,
          exploredAt: tile.exploredAt,
          colony: tile.colony
        } : null)
      }))
    )
  };
}