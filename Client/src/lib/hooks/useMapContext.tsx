import  { createContext, useContext, useState, type ReactNode } from 'react';
import type { Colony } from '../types/colony';

interface MapContextType {
  centerX: number;
  centerY: number;
  moveUp: () => void;
  moveDown: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  setPosition: (x: number, y: number) => void;
  zoomOut: () => void; // For future implementation
}

const MapContext = createContext<MapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
  colony: Colony;
}

export function MapProvider({ children, colony }: MapProviderProps) {
  const [centerX, setCenterX] = useState(colony.homesteadLocation.x);
  const [centerY, setCenterY] = useState(colony.homesteadLocation.y);

  const moveUp = () => {
    setCenterY(prev => prev - 1);
  };

  const moveDown = () => {
    setCenterY(prev => prev + 1);
  };

  const moveLeft = () => {
    setCenterX(prev => prev - 1);
  };

  const moveRight = () => {
    setCenterX(prev => prev + 1);
  };

  const setPosition = (x: number, y: number) => {
    setCenterX(x);
    setCenterY(y);
  };

  const zoomOut = () => {
    // Placeholder for future zoom functionality
    console.log('Zoom out functionality coming soon');
  };

  const value: MapContextType = {
    centerX,
    centerY,
    moveUp,
    moveDown,
    moveLeft,
    moveRight,
    setPosition,
    zoomOut,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}