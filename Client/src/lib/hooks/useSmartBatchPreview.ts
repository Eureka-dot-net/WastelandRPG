// Generic smart batch preview with intelligent caching
// Supports any settler + target combination (assignments, coordinates, etc.)

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from 'react';
import { agent } from "../api/agent";
import type { AssignmentPreviewResult, MapExplorationPreviewResult } from "../types/preview";

export interface Coordinate {
  x: number;
  y: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Generic smart cache hook
function useSmartCache<T>(staleTime: number = 5 * 60 * 1000) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const getCachedCombinations = useCallback((keys: string[]) => {
    const now = Date.now();
    const cached: Record<string, T> = {};

    keys.forEach(key => {
      const entry = cacheRef.current.get(key);
      if (entry && (now - entry.timestamp) < staleTime) {
        cached[key] = entry.data;
      }
    });

    return cached;
  }, [staleTime]);

  const getMissingKeys = useCallback((keys: string[]) => {
    const now = Date.now();
    return keys.filter(key => {
      const entry = cacheRef.current.get(key);
      return !entry || (now - entry.timestamp) >= staleTime;
    });
  }, [staleTime]);

  const setCachedData = useCallback((data: Record<string, T>) => {
    const now = Date.now();
    Object.entries(data).forEach(([key, value]) => {
      cacheRef.current.set(key, {
        data: value,
        timestamp: now
      });
    });
  }, []);

  return { getCachedCombinations, getMissingKeys, setCachedData };
}

// Generic batch preview hook
function useSmartBatchPreview<T>(
  colonyId: string,
  settlerIds: string[],
  targets: unknown[],
  config: {
    queryKeyPrefix: string;
    endpointPath: string;
    targetToString: (target: unknown) => string;
    targetToParam: (targets: string[]) => string;
    paramName: string;
  },
  enabled = true
) {
  const { getCachedCombinations, getMissingKeys, setCachedData } = useSmartCache<T>();

  return useQuery<{ results: Record<string, Record<string, T>> }, Error>({
    queryKey: [config.queryKeyPrefix, colonyId, settlerIds.sort(), targets],
    queryFn: async () => {
      if (settlerIds.length === 0 || targets.length === 0) {
        return { results: {} };
      }

      // Generate all possible combination keys
      const allCombinations: Array<{ settlerId: string, targetStr: string, key: string }> = [];
      settlerIds.forEach(settlerId => {
        targets.forEach(target => {
          const targetStr = config.targetToString(target);
          allCombinations.push({
            settlerId,
            targetStr,
            key: `${settlerId}:${targetStr}`
          });
        });
      });

      const allKeys = allCombinations.map(c => c.key);

      // Get cached data
      const cachedData = getCachedCombinations(allKeys);

      // Find missing combinations
      const missingKeys = getMissingKeys(allKeys);
      const missingCombinations = allCombinations.filter(c => missingKeys.includes(c.key));

      let freshData: Record<string, T> = {};

      // Fetch missing data if needed
      if (missingCombinations.length > 0) {
        console.log(`Fetching ${missingCombinations.length} missing ${config.queryKeyPrefix} combinations`);

        const missingSettlerIds = [...new Set(missingCombinations.map(c => c.settlerId))];
        const missingTargetStrs = [...new Set(missingCombinations.map(c => c.targetStr))];

        const settlerIdsParam = missingSettlerIds.join(',');
        const targetsParam = config.targetToParam(missingTargetStrs);
        const url = `/colonies/${colonyId}/${config.endpointPath}?settlerIds=${settlerIdsParam}&${config.paramName}=${targetsParam}`;

        const response = await agent.get(url);
        const batchData = response.data as { results: Record<string, Record<string, T>> };

        // Flatten batch response
        const fetchedData: Record<string, T> = {};
        Object.entries(batchData.results).forEach(([settlerId, targetResults]) => {
          Object.entries(targetResults).forEach(([targetStr, result]) => {
            const key = `${settlerId}:${targetStr}`;
            fetchedData[key] = result;
          });
        });

        freshData = fetchedData;
        setCachedData(freshData);
      }

      // Combine cached and fresh data
      const combinedData = { ...cachedData, ...freshData };

      // Convert back to nested structure
      const results: Record<string, Record<string, T>> = {};
      Object.entries(combinedData).forEach(([key, result]) => {
        const index = key.indexOf(':');
        const settlerId = key.substring(0, index);
        const targetStr = key.substring(index + 1);
        if (!results[settlerId]) results[settlerId] = {};
        results[settlerId][targetStr] = result;
      });

      console.log(`${config.queryKeyPrefix}: ${Object.keys(cachedData).length} from cache, ${Object.keys(freshData).length} newly fetched`);

      return { results };
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && targets.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Smart batch assignment preview
 */
export function useSmartBatchPreviewAssignment(
  colonyId: string,
  settlerIds: string[],
  assignmentIds: string[],
  enabled = true
) {
  return useSmartBatchPreview<AssignmentPreviewResult>(
    colonyId,
    settlerIds,
    assignmentIds,
    {
      queryKeyPrefix: "smartAssignmentPreviewBatch",
      endpointPath: "assignments/preview-batch",
      targetToString: (target: unknown) => target as string,
      targetToParam: (assignmentIds: string[]) => assignmentIds.join(','),
      paramName: "assignmentIds"
    },
    enabled
  );
}

/**
 * Smart batch map exploration preview
 */
export function useSmartBatchPreviewMapExploration(
  colonyId: string,
  settlerIds: string[],
  coordinates: Coordinate[],
  enabled = true
) {
  return useSmartBatchPreview<MapExplorationPreviewResult>(
    colonyId,
    settlerIds,
    coordinates,
    {
      queryKeyPrefix: "smartMapExplorationPreviewBatch",
      endpointPath: "map/preview-batch",
      targetToString: (target: unknown) => {
        const coord = target as Coordinate;
        return `${coord.x}:${coord.y}`;
      },
      targetToParam: (coordStrs: string[]) => coordStrs.join(','),
      paramName: "coordinates"
    },
    enabled
  );
}