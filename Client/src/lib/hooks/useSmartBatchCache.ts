// Smart caching system for batch preview requests
// Only fetches new combinations and reuses existing data

import { useCallback, useRef } from 'react';
import { agent } from '../api/agent';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function useSmartBatchCache<T>(
  baseUrl: (colonyId: string) => string,
  keyBuilder: (item1: string, item2: string) => string,
  staleTime: number = 5 * 60 * 1000 // 5 minutes
) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const getCachedData = useCallback((keys: Array<{ item1: string; item2: string }>) => {
    const now = Date.now();
    const cachedResults: Record<string, Record<string, T>> = {};
    
    keys.forEach(({ item1, item2 }) => {
      const key = keyBuilder(item1, item2);
      const cached = cacheRef.current.get(key);
      
      if (cached && (now - cached.timestamp) < staleTime) {
        if (!cachedResults[item1]) {
          cachedResults[item1] = {};
        }
        cachedResults[item1][item2] = cached.data;
      }
    });
    
    return cachedResults;
  }, [keyBuilder, staleTime]);

  const getUncachedKeys = useCallback((keys: Array<{ item1: string; item2: string }>) => {
    const now = Date.now();
    const uncached: Array<{ item1: string; item2: string }> = [];
    
    keys.forEach((key) => {
      const cacheKey = keyBuilder(key.item1, key.item2);
      const cached = cacheRef.current.get(cacheKey);
      
      if (!cached || (now - cached.timestamp) >= staleTime) {
        uncached.push(key);
      }
    });
    
    return uncached;
  }, [keyBuilder, staleTime]);

  const setCachedData = useCallback((
    keys: Array<{ item1: string; item2: string }>,
    data: Record<string, Record<string, T>>
  ) => {
    const now = Date.now();
    
    keys.forEach(({ item1, item2 }) => {
      const key = keyBuilder(item1, item2);
      const value = data[item1]?.[item2];
      
      if (value) {
        cacheRef.current.set(key, {
          data: value,
          timestamp: now
        });
      }
    });
  }, [keyBuilder]);

  const fetchBatchData = useCallback(async (
    colonyId: string,
    item1Param: string,
    item2Param: string,
    keys: Array<{ item1: string; item2: string }>
  ): Promise<{ results: Record<string, Record<string, T>> }> => {
    const url = `${baseUrl(colonyId)}?${item1Param}&${item2Param}`;
    const response = await agent.get(url);
    const batchData = response.data as { results: Record<string, Record<string, T>> };
    
    // Cache the new data
    setCachedData(keys, batchData.results);
    
    return batchData;
  }, [baseUrl, setCachedData]);

  const getSmartBatchData = useCallback(async (
    colonyId: string,
    item1s: string[],
    item2s: string[],
    item1ParamName: string,
    item2ParamName: string
  ): Promise<{ results: Record<string, Record<string, T>> }> => {
    if (item1s.length === 0 || item2s.length === 0) {
      return { results: {} };
    }

    // Generate all combinations
    const allKeys: Array<{ item1: string; item2: string }> = [];
    item1s.forEach(item1 => {
      item2s.forEach(item2 => {
        allKeys.push({ item1, item2 });
      });
    });

    // Get cached data
    const cachedData = getCachedData(allKeys);
    
    // Find uncached keys
    const uncachedKeys = getUncachedKeys(allKeys);
    
    if (uncachedKeys.length === 0) {
      // All data is cached
      return { results: cachedData };
    }

    // Extract unique item1s and item2s from uncached keys
    const uncachedItem1s = [...new Set(uncachedKeys.map(k => k.item1))];
    const uncachedItem2s = [...new Set(uncachedKeys.map(k => k.item2))];
    
    // Fetch only uncached data
    const item1Param = `${item1ParamName}=${uncachedItem1s.join(',')}`;
    const item2Param = `${item2ParamName}=${uncachedItem2s.join(',')}`;
    
    console.log(
      `Smart batch: Found ${Object.keys(cachedData).length * Object.keys(Object.values(cachedData)[0] || {}).length} cached, ` +
      `fetching ${uncachedItem1s.length} × ${uncachedItem2s.length} = ${uncachedKeys.length} new combinations`
    );

    const newBatchData = await fetchBatchData(colonyId, item1Param, item2Param, uncachedKeys);
    
    // Merge cached and new data
    const mergedResults: Record<string, Record<string, T>> = { ...cachedData };
    
    Object.keys(newBatchData.results).forEach(item1 => {
      if (!mergedResults[item1]) {
        mergedResults[item1] = {};
      }
      Object.assign(mergedResults[item1], newBatchData.results[item1]);
    });

    return { results: mergedResults };
  }, [getCachedData, getUncachedKeys, fetchBatchData]);

  // Clean up old cache entries periodically
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const staleThreshold = staleTime * 2; // Keep cache for twice the stale time
    
    for (const [key, entry] of cacheRef.current.entries()) {
      if ((now - entry.timestamp) > staleThreshold) {
        cacheRef.current.delete(key);
      }
    }
  }, [staleTime]);

  return {
    getSmartBatchData,
    cleanupCache,
    getCacheSize: () => cacheRef.current.size
  };
}