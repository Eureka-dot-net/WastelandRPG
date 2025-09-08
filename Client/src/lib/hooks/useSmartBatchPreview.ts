// Smart batch preview with intelligent caching for individual combinations
// Only fetches missing settler+assignment/coordinate combinations

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

// Generic smart cache hook for tracking individual combinations
function useSmartCache<T>(
  staleTime: number = 5 * 60 * 1000 // 5 minutes
) {
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

/**
 * Smart batch assignment preview that only fetches missing combinations
 */
export function useSmartBatchPreviewAssignment(
  colonyId: string,
  settlerIds: string[],
  assignmentIds: string[],
  enabled = true
) {
  const { getCachedCombinations, getMissingKeys, setCachedData } = useSmartCache<AssignmentPreviewResult>();

  return useQuery<{ results: Record<string, Record<string, AssignmentPreviewResult>> }, Error>({
    queryKey: ["smartAssignmentPreviewBatch", colonyId, settlerIds.sort(), assignmentIds.sort()],
    queryFn: async () => {
      if (settlerIds.length === 0 || assignmentIds.length === 0) {
        return { results: {} };
      }

      // Generate all possible combination keys
      const allCombinations: Array<{settlerId: string, assignmentId: string, key: string}> = [];
      settlerIds.forEach(settlerId => {
        assignmentIds.forEach(assignmentId => {
          allCombinations.push({
            settlerId,
            assignmentId, 
            key: `${settlerId}:${assignmentId}`
          });
        });
      });

      const allKeys = allCombinations.map(c => c.key);
      
      // Get cached data
      const cachedData = getCachedCombinations(allKeys);
      
      // Find missing combinations that need to be fetched
      const missingKeys = getMissingKeys(allKeys);
      const missingCombinations = allCombinations.filter(c => missingKeys.includes(c.key));
      
      let freshData: Record<string, AssignmentPreviewResult> = {};
      
      // Fetch missing data if needed
      if (missingCombinations.length > 0) {
        console.log(`Fetching ${missingCombinations.length} missing assignment preview combinations`);
        
        // Extract unique settler and assignment IDs from missing combinations
        const missingSettlerIds = [...new Set(missingCombinations.map(c => c.settlerId))];
        const missingAssignmentIds = [...new Set(missingCombinations.map(c => c.assignmentId))];
        
        const settlerIdsParam = missingSettlerIds.join(',');
        const assignmentIdsParam = missingAssignmentIds.join(',');
        const url = `/colonies/${colonyId}/assignments/preview-batch?settlerIds=${settlerIdsParam}&assignmentIds=${assignmentIdsParam}`;
        
        const response = await agent.get(url);
        const batchData = response.data as { results: Record<string, Record<string, AssignmentPreviewResult>> };
        
        // Flatten the batch response into our flat key format  
        const fetchedData: Record<string, AssignmentPreviewResult> = {};
        Object.entries(batchData.results).forEach(([settlerId, assignmentResults]) => {
          Object.entries(assignmentResults).forEach(([assignmentId, result]) => {
            const key = `${settlerId}:${assignmentId}`;
            fetchedData[key] = result;
          });
        });
        
        freshData = fetchedData;
        
        // Cache the fresh data
        setCachedData(freshData);
      }
      
      // Combine cached and fresh data
      const combinedData = { ...cachedData, ...freshData };
      
      // Convert back to nested structure expected by components
      const results: Record<string, Record<string, AssignmentPreviewResult>> = {};
      Object.entries(combinedData).forEach(([key, result]) => {
        const [settlerId, assignmentId] = key.split(':');
        if (!results[settlerId]) results[settlerId] = {};
        results[settlerId][assignmentId] = result;
      });
      
      console.log(`Assignment previews: ${Object.keys(cachedData).length} from cache, ${Object.keys(freshData).length} newly fetched`);
      
      return { results };
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && assignmentIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Smart batch map exploration preview that only fetches missing combinations  
 */
export function useSmartBatchPreviewMapExploration(
  colonyId: string,
  settlerIds: string[],
  coordinates: Coordinate[],
  enabled = true
) {
  const { getCachedCombinations, getMissingKeys, setCachedData } = useSmartCache<MapExplorationPreviewResult>();

  return useQuery<{ results: Record<string, Record<string, MapExplorationPreviewResult>> }, Error>({
    queryKey: ["smartMapExplorationPreviewBatch", colonyId, settlerIds.sort(), coordinates],
    queryFn: async () => {
      if (settlerIds.length === 0 || coordinates.length === 0) {
        return { results: {} };
      }

      // Generate all possible combination keys
      const allCombinations: Array<{settlerId: string, coordStr: string, key: string}> = [];
      settlerIds.forEach(settlerId => {
        coordinates.forEach(coord => {
          const coordStr = `${coord.x}:${coord.y}`;
          allCombinations.push({
            settlerId,
            coordStr,
            key: `${settlerId}:${coordStr}`
          });
        });
      });

      const allKeys = allCombinations.map(c => c.key);
      
      // Get cached data
      const cachedData = getCachedCombinations(allKeys);
      
      // Find missing combinations that need to be fetched
      const missingKeys = getMissingKeys(allKeys);
      const missingCombinations = allCombinations.filter(c => missingKeys.includes(c.key));
      
      let freshData: Record<string, MapExplorationPreviewResult> = {};
      
      // Fetch missing data if needed
      if (missingCombinations.length > 0) {
        console.log(`Fetching ${missingCombinations.length} missing map exploration preview combinations`);
        
        // Extract unique settler IDs and coordinate strings from missing combinations
        const missingSettlerIds = [...new Set(missingCombinations.map(c => c.settlerId))];
        const missingCoordStrs = [...new Set(missingCombinations.map(c => c.coordStr))];
        
        const settlerIdsParam = missingSettlerIds.join(',');
        const coordinatesParam = missingCoordStrs.join(',');
        const url = `/colonies/${colonyId}/map/preview-batch?settlerIds=${settlerIdsParam}&coordinates=${coordinatesParam}`;
        
        const response = await agent.get(url);
        const batchData = response.data as { results: Record<string, Record<string, MapExplorationPreviewResult>> };
        
        // Flatten the batch response into our flat key format
        const fetchedData: Record<string, MapExplorationPreviewResult> = {};
        Object.entries(batchData.results).forEach(([settlerId, coordResults]) => {
          Object.entries(coordResults).forEach(([coordStr, result]) => {
            const key = `${settlerId}:${coordStr}`;
            fetchedData[key] = result;
          });
        });
        
        freshData = fetchedData;
        
        // Cache the fresh data
        setCachedData(freshData);
      }
      
      // Combine cached and fresh data
      const combinedData = { ...cachedData, ...freshData };
      
      // Convert back to nested structure expected by components
      const results: Record<string, Record<string, MapExplorationPreviewResult>> = {};
      Object.entries(combinedData).forEach(([key, result]) => {
        const [settlerId, coordStr] = key.split(':');
        if (!results[settlerId]) results[settlerId] = {};
        results[settlerId][coordStr] = result;
      });
      
      console.log(`Map exploration previews: ${Object.keys(cachedData).length} from cache, ${Object.keys(freshData).length} newly fetched`);
      
      return { results };
    },
    enabled: enabled && !!colonyId && settlerIds.length > 0 && coordinates.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}