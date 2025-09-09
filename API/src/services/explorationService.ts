// import { Settler } from "../models/Player/Settler";
// import { UserMapTileDoc, UserMapTile } from "../models/Player/UserMapTile";
// import { calculateDistance, calculateDistanceModifiers } from "../utils/gameUtils";
// import { SettlerManager } from "../managers/SettlerManager";
// import { createOrUpdateMapTile, canExploreLocation } from "../utils/mapUtils"; 

// interface ExplorationCalculationResult {
//   coordinates: { x: number; y: number };
//   distance: number;
//   duration: number;
//   rewards: Record<string, number>;
//   settler: {
//     id: string;
//     name: string;
//     stats: any;
//   };
//   mapTile: any;
//   userMapTile: UserMapTileDoc | null;
//   adjustments: any;
// }

// // Enhanced calculateExplorationDetails that supports both single and batch mode
// interface BatchContext {
//   settlerMap: Map<string, any>;
//   mapTileMap: Map<string, any>;
//   userMapTileMap: Map<string, any>;
//   canExploreMap: Map<string, boolean>;
// }

// export const calculateExplorationDetails = async (
//   colony: any,
//   tileX: number,
//   tileY: number,
//   settlerId: string,
//   session: any,
//   batchContext?: BatchContext
// ): Promise<ExplorationCalculationResult> => {
//   let settler, mapTile, userMapTile, canExplore;

//   if (batchContext) {
//     // Use pre-fetched data from batch context
//     settler = batchContext.settlerMap.get(settlerId);
//     mapTile = batchContext.mapTileMap.get(`${tileX}:${tileY}`);
//     userMapTile = batchContext.userMapTileMap.get(`${tileX}:${tileY}`);
//     canExplore = batchContext.canExploreMap.get(`${tileX}:${tileY}`);
//   } else {
//     // Individual mode - fetch data as needed
//     settler = await Settler.findById(settlerId).session(session);
//     mapTile = await createOrUpdateMapTile(colony.serverId, tileX, tileY, session);
//     userMapTile = await UserMapTile.findOne({
//       colonyId: colony._id.toString(),
//       x: tileX,
//       y: tileY
//     }).session(session);
//     canExplore = await canExploreLocation(colony._id.toString(), tileX, tileY, session);
//   }

//   // Validation logic (same for both modes)
//   if (!settler) {
//     throw new Error('Settler not found');
//   }

//   if (settler.status !== 'idle') {
//     throw new Error('Settler is not available');
//   }

//   if (!canExplore) {
//     throw new Error('Cannot explore this location - must be adjacent to known area');
//   }

//   if ('error' in mapTile) {
//     throw new Error('Failed to load map tile');
//   }

//   // Check if settler has enough energy for exploration
//   const settlerManager = new SettlerManager(settler);
  
//   // Calculate exploration duration first to check energy requirements
//   let explorationTime: number;
//   let distance: number;
  
//   if (userMapTile) {
//     explorationTime = userMapTile.explorationTime;
//     distance = userMapTile.distanceFromHomestead;
//   } else {
//     distance = calculateDistance(colony.homesteadLocation.x, colony.homesteadLocation.y, tileX, tileY);
//     const distanceModifiers = calculateDistanceModifiers(distance);
//     const baseDuration = 300000; // 5 minutes
//     explorationTime = baseDuration * distanceModifiers.durationMultiplier;
//   }
  
//   // Convert exploration time to hours for energy calculation
//   const explorationHours = explorationTime / (1000 * 60 * 60);
  
//   // Check if settler has enough energy for exploration
//   if (!settlerManager.canCompleteTask('exploring', explorationHours)) {
//     throw new Error('Settler does not have enough energy to complete this exploration');
//   }

//   // Calculate exploration details (same logic)
//   let lootMultiplier = userMapTile ? userMapTile.lootMultiplier : calculateDistanceModifiers(distance).lootMultiplier;

//   // Calculate rewards without settler adjustments
//   const baseRewards: Record<string, number> = {};
//   if (mapTile.loot) {
//     mapTile.loot.forEach((lootItem: any) => {
//       baseRewards[lootItem.item] = lootItem.amount * lootMultiplier;
//     });
//   }

//   // Use SettlerManager for adjustments instead of calculateSettlerAdjustments
//   const timeMultiplier = settlerManager.adjustedTimeMultiplier('exploration');
//   const lootMultiplier_adjusted = settlerManager.adjustedLootMultiplier('exploration');
  
//   const adjustedDuration = Math.round(explorationTime / timeMultiplier);
  
//   // Apply loot multiplier to planned rewards
//   const adjustedPlannedRewards: Record<string, number> = {};
//   Object.entries(baseRewards).forEach(([key, amount]) => {
//     adjustedPlannedRewards[key] = Math.max(1, Math.round(amount * lootMultiplier_adjusted));
//   });

//   const adjustments = {
//     adjustedDuration,
//     effectiveSpeed: 1 / timeMultiplier,
//     lootMultiplier: lootMultiplier_adjusted,
//     adjustedPlannedRewards,
//     effects: {
//       speedEffects: [],
//       lootEffects: [],
//       traitEffects: []
//     }
//   };

//   return {
//     coordinates: { x: tileX, y: tileY },
//     distance,
//     duration: adjustments.adjustedDuration,
//     rewards: adjustments.adjustedPlannedRewards,
//     settler: {
//       id: settler._id,
//       name: settler.name,
//       stats: settler.stats
//     },
//     mapTile,
//     userMapTile,
//     adjustments
//   };
// };

// interface BatchPreviewResult {
//   coordinate: { x: number; y: number };
//   settlerId: string;
//   preview?: ExplorationCalculationResult;
//   error?: string;
// }

// // Optimized batch calculation using the enhanced function
// export const calculateBatchExplorationPreviews = async (
//   colony: any,
//   coordinates: Array<{ x: number; y: number }>,
//   settlerIds: string[],
//   session: any
// ): Promise<BatchPreviewResult[]> => {
//   // Step 1: Pre-fetch all data in parallel
//   const [settlers, mapTileResults, userMapTiles, canExploreResults] = await Promise.all([
//     // Fetch all settlers
//     Settler.find({ _id: { $in: settlerIds } }).session(session),
    
//     // Pre-fetch all MapTiles
//     Promise.all(coordinates.map(({ x, y }) => 
//       createOrUpdateMapTile(colony.serverId, x, y, session).catch(error => ({ error, x, y }))
//     )),
    
//     // Pre-fetch all UserMapTiles
//     UserMapTile.find({
//       $or: coordinates.map(({ x, y }) => ({
//         colonyId: colony._id.toString(),
//         x,
//         y
//       }))
//     }).session(session),
    
//     // Pre-check exploration permissions
//     Promise.all(coordinates.map(({ x, y }) =>
//       canExploreLocation(colony._id.toString(), x, y, session).catch(() => false)
//     ))
//   ]);

//   // Step 2: Create lookup maps
//   const batchContext: BatchContext = {
//     settlerMap: new Map(settlers.map(s => [s._id.toString(), s])),
//     mapTileMap: new Map(),
//     userMapTileMap: new Map(userMapTiles.map(umt => [`${umt.x}:${umt.y}`, umt])),
//     canExploreMap: new Map()
//   };

//   // Populate map tile and permission maps
//   coordinates.forEach((coord, index) => {
//     const key = `${coord.x}:${coord.y}`;
//     batchContext.mapTileMap.set(key, mapTileResults[index]);
//     batchContext.canExploreMap.set(key, canExploreResults[index]);
//   });

//   // Step 3: Calculate all combinations in parallel using the enhanced function
//   const calculationPromises = coordinates.flatMap(coordinate =>
//     settlerIds.map(async (settlerId): Promise<BatchPreviewResult> => {
//       try {
//         const explorationData = await calculateExplorationDetails(
//           colony,
//           coordinate.x,
//           coordinate.y,
//           settlerId,
//           session,
//           batchContext
//         );

//         const { ...previewData } = explorationData;
//         return {
//           coordinate,
//           settlerId,
//           preview: previewData
//         };
//       } catch (error) {
//         return {
//           coordinate,
//           settlerId,
//           error: error instanceof Error ? error.message : 'Calculation failed'
//         };
//       }
//     })
//   );

//   return Promise.all(calculationPromises);
// };