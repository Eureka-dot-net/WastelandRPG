import { Types, ClientSession } from "mongoose";
import { Colony, ColonyDoc } from "../models/Player/Colony";
import { createOrUpdateMapTile, assignAdjacentTerrain, createUserMapTile } from "../utils/mapUtils";
import { SpiralCounter } from "../models/Server/SpiralCounter";

export async function createColonyWithSpiralLocation(
    userId: Types.ObjectId,
    serverId: string,
    colonyName: string,
    serverType: string,
    serverName: string,
    steps: number = 10,
    maxRetries: number = 5,
    session?: ClientSession
): Promise<ColonyDoc> {

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Get the next spiral index atomically
            const nextIndex = await getNextSpiralIndex(serverId, session);

            // Calculate spiral location based on the index
            const spiralData = calculateSpiralLocationFromIndex(nextIndex, steps);

            // Create the colony with the calculated location
            const colony = new Colony({
                userId,
                serverId,
                serverName,
                colonyName,
                serverType,
                homesteadLocation: { x: spiralData.x, y: spiralData.y },
                spiralLayer: spiralData.spiralLayer,
                spiralPosition: spiralData.spiralPosition,
                spiralDirection: spiralData.spiralDirection,
                spiralIndex: nextIndex
            });

            await colony.save({ session });
            
            // Create the homestead tile and assign adjacent terrain
            const homesteadTile = await createOrUpdateMapTile(serverId, spiralData.x, spiralData.y, {
                terrain: 'colony', // Homesteads are typically in town center terrain
                colony: colony._id.toString(),
                session
            });
            
            // Create the initial UserMapTile record for this colony's homestead
            const homesteadUserTile = await createUserMapTile(
                homesteadTile._id.toString(), 
                colony._id.toString(), 
                0, // distance from homestead is 0 for homestead itself
                300000, // base exploration time (5 minutes)
                1.0, // no loot multiplier for homestead
                [], // no loot for homestead tiles
                session
            );
            
            // Mark homestead as already explored
            homesteadUserTile.isExplored = true;
            await homesteadUserTile.save({ session });
            
            // Generate adjacent tiles when homestead is created
            await assignAdjacentTerrain(serverId, spiralData.x, spiralData.y, session);
        
            return colony;

        } catch (error) {
            // Narrow the type: Check if error is object and has 'code'
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as any).code === 11000 &&
                'keyPattern' in error &&
                (error as any).keyPattern?.spiralIndex
            ) {
                // Duplicate key error on spiralIndex
                if (attempt === maxRetries - 1) {
                    throw new Error('Failed to create colony after maximum retries due to race condition');
                }
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                continue;
            }
            throw error;
        }
    }

    throw new Error('Failed to create colony after maximum retries');
}

async function getNextSpiralIndex(serverId: string, session?: ClientSession): Promise<number> {
    // Use MongoDB's findOneAndUpdate with upsert for atomic increment
    // Using the properly imported SpiralCounter model
    const result = await SpiralCounter.findOneAndUpdate(
        { serverId },
        { $inc: { nextIndex: 1 } },
        { upsert: true, new: true, session }
    );

    if (!result) {
        // This should never happen due to upsert: true
        throw new Error('Failed to increment spiral index for server: ' + serverId);
    }

    return (result as any).nextIndex - 1; // Return the index we just claimed (before increment)
}

// Calculate spiral location from sequential index
function calculateSpiralLocationFromIndex(index: number, steps: number = 1): {
    x: number;
    y: number;
    spiralLayer: number;
    spiralPosition: number;
    spiralDirection: number;
} {
    // Adjust index by steps
    const targetIndex = index * steps;

    if (targetIndex === 0) {
        return { x: 0, y: 0, spiralLayer: 0, spiralPosition: 0, spiralDirection: 0 };
    }

    // Find which layer this index belongs to
    let layer = 1;
    let totalPositionsUpToLayer = 1; // Layer 0 has 1 position (center)

    while (totalPositionsUpToLayer < targetIndex + 1) {
        const positionsInLayer = layer * 8; // Each layer n has 8n positions
        totalPositionsUpToLayer += positionsInLayer;
        if (totalPositionsUpToLayer >= targetIndex + 1) break;
        layer++;
    }

    // Calculate position within the layer
    const positionsBeforeThisLayer = totalPositionsUpToLayer - (layer * 8);
    const positionInLayer = targetIndex - positionsBeforeThisLayer;

    // Calculate coordinates based on position in layer
    const coords = calculateCoordsInLayer(layer, positionInLayer);

    return {
        x: coords.x,
        y: coords.y,
        spiralLayer: layer,
        spiralPosition: positionInLayer,
        spiralDirection: coords.direction
    };
}

function calculateCoordsInLayer(layer: number, positionInLayer: number): {
    x: number;
    y: number;
    direction: number;
} {
    // Start at the rightmost position of the layer
    let x = layer;
    let y = -(layer - 1);
    let currentPos = 0;

    // Direction segments for layer n:
    // Right: n positions (but we start here, so n-1 moves)
    // Down: 2*layer positions  
    // Left: 2*layer positions
    // Up: 2*layer positions
    // Right: layer-1 positions

    const segments = [
        layer - 1,      // remaining right moves from starting position
        2 * layer,      // down
        2 * layer,      // left  
        2 * layer,      // up
        layer - 1       // right (to complete the layer)
    ];

    const directions = [
        { x: 0, y: 1 },   // 0: down (we start going down from rightmost)
        { x: -1, y: 0 },  // 1: left
        { x: 0, y: -1 },  // 2: up
        { x: 1, y: 0 },   // 3: right
        { x: 0, y: 1 }    // 4: down again (wrapping)
    ];

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
        const segmentLength = segments[segmentIndex];

        if (currentPos + segmentLength > positionInLayer) {
            // The target position is in this segment
            const stepsInSegment = positionInLayer - currentPos;
            const dir = directions[segmentIndex];

            x += dir.x * stepsInSegment;
            y += dir.y * stepsInSegment;

            return { x, y, direction: segmentIndex % 4 };
        }

        // Move through the entire segment
        const dir = directions[segmentIndex];
        x += dir.x * segmentLength;
        y += dir.y * segmentLength;
        currentPos += segmentLength;
    }

    return { x, y, direction: 0 };
}

// Helper function to get colony location (for backward compatibility)
export async function getNextColonyLocation(serverId: string, steps: number = 1, session?: ClientSession) {
    const latestColony = await Colony.findOne({ serverId }).sort({ spiralIndex: -1 }).lean({ session });

    if (!latestColony) {
        return { x: 0, y: 0, spiralLayer: 0, spiralPosition: 0, spiralDirection: 0, spiralIndex: 0 };
    }

    // Calculate next position based on latest colony's spiral index
    const nextIndex = latestColony.spiralIndex + 1;
    return calculateSpiralLocationFromIndex(nextIndex, steps);
}