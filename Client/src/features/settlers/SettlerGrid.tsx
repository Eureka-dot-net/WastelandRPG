// File: src/components/settlers/SettlerGrid.tsx
import React from 'react';
import { Grid } from '@mui/material';
import type { Settler } from '../../lib/types/settler';
import SettlerCard from './SettlerCard';

interface SettlerAction {
  label: string | ((settler: Settler) => string);
  onClick: (settler: Settler) => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean | ((settler: Settler) => boolean);
}

interface SettlerGridProps {
  settlers: Settler[];
  actions: SettlerAction[];
  gridSizes?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  showFullWidthActions?: boolean;
  customContent?: (settler: Settler) => React.ReactNode;
  // Interest selection props
  selectedInterests?: Record<string, string[]>;
  onInterestToggle?: (settlerId: string, interest: string) => void;
  maxInterests?: number;
  showInterestSelection?: boolean;
}

const SettlerGrid: React.FC<SettlerGridProps> = ({
  settlers,
  actions,
  gridSizes = { xs: 12, md: 4 },
  showFullWidthActions = true,
  customContent,
  selectedInterests,
  onInterestToggle,
  maxInterests = 2,
  showInterestSelection = false
}) => {
  return (
    <Grid container spacing={3}>
      {settlers.map((settler) => (
        <Grid size={gridSizes} key={settler._id}>
          <SettlerCard
            settler={settler}
            actions={actions}
            showFullWidth={showFullWidthActions}
            customContent={customContent}
            selectedInterests={selectedInterests?.[settler._id] || []}
            onInterestToggle={onInterestToggle ? (interest) => onInterestToggle(settler._id, interest) : undefined}
            maxInterests={maxInterests}
            showInterestSelection={showInterestSelection}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default SettlerGrid;