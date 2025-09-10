import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import type { Colony } from "../types/colony";
import { agent } from "../api/agent";

export function useColony(serverId?: string | null) {
    const { data: colony, isLoading: colonyLoading, error: colonyError, refetch } = useQuery<Colony>({
        queryKey: ["colony", serverId],
        queryFn: async () => {
            if (!serverId) throw new Error("No serverId provided");
            const res = await agent.get(`/servers/${serverId}/colony`);
            return res.data as Colony;
        },
        enabled: !!serverId, // Only run query if serverId is provided
        staleTime: 3600000, // 1 hour
        gcTime: 3600000, // 1 hour
    });

    // Track energy values separately to avoid re-rendering issues
    const [settlerEnergies, setSettlerEnergies] = useState<Record<number, number>>({});
    const lastUpdateRef = useRef<number>(Date.now());

    // Initialize energy tracking when colony data loads
    useEffect(() => {
        if (colony?.settlers) {
            const energies: Record<number, number> = {};
            colony.settlers.forEach((settler, index) => {
                energies[index] = settler.energy;
            });
            setSettlerEnergies(energies);
            lastUpdateRef.current = Date.now();
        }
    }, [colony?.settlers]);

    // Update energy values every 5 seconds
    useEffect(() => {
        if (!colony?.settlers) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const timeDeltaHours = (now - lastUpdateRef.current) / (1000 * 60 * 60);
            
            setSettlerEnergies(prevEnergies => {
                const newEnergies = { ...prevEnergies };
                colony.settlers.forEach((settler, index) => {
                    newEnergies[index] = Math.max(0, Math.min(100, prevEnergies[index] + (settler.energy * timeDeltaHours)));
                });
                return newEnergies;
            });
            
            lastUpdateRef.current = now;
        }, 60000);

        return () => clearInterval(interval);
    }, [colony?.settlers]);

    // Reset energy calculations when refetching
    const handleRefetch = () => {
        lastUpdateRef.current = Date.now();
        return refetch();
    };

    // Utility function to get current energy for a settler by index
    const getSettlerCurrentEnergy = (settlerIndex: number): number => {
        return settlerEnergies[settlerIndex] ?? colony?.settlers[settlerIndex]?.energy ?? 0;
    };

    // Get colony with updated energy values (for display purposes)
    const colonyWithCurrentEnergy = colony ? {
        ...colony,
        settlers: colony.settlers.map((settler, index) => ({
            ...settler,
            energy: settlerEnergies[index] ?? settler.energy
        }))
    } : undefined;

    return { 
        colony, // Original colony object (stable for useEffect dependencies)
        colonyWithCurrentEnergy, // Colony with real-time energy updates (for display)
        getSettlerCurrentEnergy, // Get individual settler's current energy
        colonyLoading, 
        colonyError,
        refetch: handleRefetch
    };
}