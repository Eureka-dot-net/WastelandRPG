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
  const offset = Math.floor(gridSize / 2); // 2 for 5x5

  // Get all UserMapTiles for this colony in the 5x5 area
  const userTiles = await getUserMapTilesInArea(
    colonyId,
    centerX - offset, centerX + offset,
    centerY - offset, centerY + offset,
    session
  );

  // Create coordinate lookup
  const tileMap = new Map<string, any>();
  userTiles.forEach(userTile => {
    const mapTile = userTile.serverTile as MapTileDoc;
    const key = `${mapTile.x},${mapTile.y}`;
    tileMap.set(key, {
      position: {
        row: mapTile.y - (centerY - offset),
        col: mapTile.x - (centerX - offset)
      },
      explored: userTile.isExplored,
      canExplore: true, // Can always re-explore known tiles
      x: mapTile.x,
      y: mapTile.y,
      terrain: userTile.terrain,
      loot: mapTile.loot || [],
      threat: mapTile.threat,
      icon: mapTile.icon,
      event: mapTile.event
    });
  });

  // Build 5x5 grid
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
      if (knownTile) {
        gridRow.push(knownTile);
      } else {
        // Check if this unknown location can be explored (adjacent to known tiles)
        const canExplore = await canExploreLocation(colonyId, x, y, session);

        gridRow.push({
          position: { row, col },
          explored: false,
          canExplore,
          x,
          y
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
  // Get all UserMapTiles for this colony, populated with MapTile data
  const query = {
    colonyId,
    'serverTile.x': { $gte: minX, $lte: maxX },
    'serverTile.y': { $gte: minY, $lte: maxY }
  };

  return session
    ? await UserMapTile.find(query).populate('serverTile').session(session)
    : await UserMapTile.find(query).populate('serverTile');
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
    distanceFromHomestead: distance,
    explorationTime,
    lootMultiplier,
    isExplored,
    exploredAt: new Date()
  };

  const userTile = new UserMapTile(userTileData);
  return await userTile.save({ session });
}