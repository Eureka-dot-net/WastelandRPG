import React from 'react';
import { Grid } from '@mui/material';
import type { Settler } from '../../lib/types/settler';
import SettlerStatusCard from './SettlerStatusCard';

interface SettlerStatusAction {
  label: string | ((settler: Settler) => string);
  onClick: (settler: Settler) => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
}

interface SettlerStatusGridProps {
  settlers: Settler[];
  actions: SettlerStatusAction[];
  gridSizes?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

const SettlerStatusGrid: React.FC<SettlerStatusGridProps> = ({
  settlers,
  actions,
  gridSizes = { xs: 12, sm: 6, md: 4, lg: 3 }
}) => {
  return (
    <Grid container spacing={2}>
      {settlers.map((settler) => (
        <Grid size={gridSizes} key={settler._id}>
          <SettlerStatusCard
            settler={settler}
            actions={actions}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default SettlerStatusGrid;