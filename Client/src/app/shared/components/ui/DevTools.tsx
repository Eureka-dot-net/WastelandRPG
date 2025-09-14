import React, { useState } from 'react';
import {
  Paper, Typography, Box, Select, MenuItem, FormControl, InputLabel, TextField, Button, Accordion, AccordionSummary, AccordionDetails, Alert
} from '@mui/material';
import { ExpandMore, Engineering, ElectricBolt } from '@mui/icons-material';
import { useDevTools } from '../../../../lib/hooks/useDevTools';
import { useServerContext } from '../../../../lib/contexts/ServerContext';
import type { Settler } from '../../../../lib/types/settler';
import SettlerAvatar from '../../../../lib/avatars/SettlerAvatar';

interface DevToolsProps {
  settlers: Settler[];
}

const DevTools: React.FC<DevToolsProps> = ({ settlers }) => {
  const { currentServerId: serverId } = useServerContext();
  const { updateSettlerEnergy } = useDevTools(serverId);
  
  const [selectedSettler, setSelectedSettler] = useState<string>('');
  const [energyValue, setEnergyValue] = useState<number>(100);

  const handleUpdateEnergy = () => {
    if (selectedSettler) {
      updateSettlerEnergy.mutate({
        settlerId: selectedSettler,
        energy: energyValue
      });
    }
  };

  // Only show in development
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ mt: 3, overflow: 'hidden' }}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{ 
            bgcolor: 'warning.light', 
            color: 'warning.contrastText',
            '& .MuiAccordionSummary-content': {
              alignItems: 'center'
            }
          }}
        >
          <Engineering sx={{ mr: 1 }} />
          <Typography variant="h6">Developer Tools</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Development mode only - These tools modify game state for testing purposes.
          </Alert>
          
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ElectricBolt />
            Settler Energy Management
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Settler</InputLabel>
              <Select
                value={selectedSettler}
                label="Select Settler"
                onChange={(e) => setSelectedSettler(e.target.value)}
              >
                {settlers.map(settler => (
                  <MenuItem key={settler._id} value={settler._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SettlerAvatar settler={settler} size={24} />
                      {settler.name} (Current: {settler.energy ?? 0}/100)
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="New Energy Value"
              type="number"
              value={energyValue}
              onChange={(e) => setEnergyValue(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              inputProps={{ min: 0, max: 100 }}
              sx={{ width: 150 }}
            />
            
            <Button 
              variant="contained" 
              onClick={handleUpdateEnergy}
              disabled={!selectedSettler || updateSettlerEnergy.isPending}
            >
              {updateSettlerEnergy.isPending ? 'Updating...' : 'Update Energy'}
            </Button>
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Instantly set a settler's energy level for testing sleep assignments and energy recovery.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default DevTools;