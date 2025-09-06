import { Types } from "mongoose";

interface BatchPreviewRequest {
  coordinates: Array<{ x: number; y: number }>;
  settlerIds: string[];
}

export const validateExplorationParams = (
  x?: string, 
  y?: string, 
  settlerId?: string
): { tileX: number; tileY: number; settlerId: string } | { error: string } => {
  if (!x || !y || !settlerId) {
    return { error: 'x, y coordinates and settlerId are required' };
  }

  const tileX = parseInt(x);
  const tileY = parseInt(y);

  if (isNaN(tileX) || isNaN(tileY) || !Types.ObjectId.isValid(settlerId)) {
    return { error: 'Invalid coordinates or settlerId' };
  }

  return { tileX, tileY, settlerId };
};

export const validateBatchPreviewParams = (
  coordinates?: string,
  settlerIds?: string
): BatchPreviewRequest | { error: string } => {
  if (!coordinates || !settlerIds) {
    return { error: 'coordinates and settlerIds are required' };
  }

  try {
    // Parse coordinates: "x1:y1,x2:y2" format
    const coordinateArray = coordinates.split(',').map(coord => {
      const [x, y] = coord.split(':');
      const parsedX = parseInt(x);
      const parsedY = parseInt(y);
      
      if (isNaN(parsedX) || isNaN(parsedY)) {
        throw new Error(`Invalid coordinate format: ${coord}`);
      }
      
      return { x: parsedX, y: parsedY };
    });

    // Parse settler IDs: "id1,id2,id3" format
    const settlerIdArray = settlerIds.split(',').map(id => id.trim());
    
    // Validate all settler IDs
    for (const settlerId of settlerIdArray) {
      if (!Types.ObjectId.isValid(settlerId)) {
        throw new Error(`Invalid settlerId: ${settlerId}`);
      }
    }

    return {
      coordinates: coordinateArray,
      settlerIds: settlerIdArray
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid parameters format' };
  }
};
