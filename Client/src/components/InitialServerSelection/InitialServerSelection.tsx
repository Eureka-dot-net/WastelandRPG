import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Public as PublicIcon,
  Security as SecurityIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';
import { useServers } from '../../lib/hooks/useServers';
import { useJoinServer } from '../../lib/hooks/useJoinServer';
import { toast } from 'react-toastify';

const getServerIcon = (serverType: string) => {
  switch (serverType) {
    case 'PvE':
      return <FavoriteIcon fontSize="small" />;
    case 'PvP':
      return <SecurityIcon fontSize="small" />;
    default:
      return <PublicIcon fontSize="small" />;
  }
};

const getServerTypeColor = (serverType: string) => {
  switch (serverType) {
    case 'PvE':
      return 'success';
    case 'PvP':
      return 'warning';
    default:
      return 'info';
  }
};

const InitialServerSelection: React.FC = () => {
  const { data: serversData, isLoading } = useServers();
  const joinServerMutation = useJoinServer();
  
  const [selectedServerId, setSelectedServerId] = useState('');
  const [colonyName, setColonyName] = useState('');

  const availableServers = serversData?.servers || [];

  const handleJoinServer = async () => {
    if (!selectedServerId) return;

    try {
      await joinServerMutation.mutateAsync({
        serverId: selectedServerId,
        colonyName: colonyName.trim() || undefined,
      });
      
      toast.success('Successfully joined server! Welcome to the wasteland!');
    } catch {
      toast.error('Failed to join server. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading servers...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
            🧟 Welcome to the Wasteland
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Choose your first server to begin your journey. Each server offers a different experience:
          </Typography>

          <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
            <InputLabel>Select Server</InputLabel>
            <Select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              label="Select Server"
            >
              {availableServers.map((server) => (
                <MenuItem key={server.id} value={server.id} sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {getServerIcon(server.type)}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {server.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {server.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={server.type}
                      size="small"
                      color={getServerTypeColor(server.type) as 'success' | 'warning' | 'info'}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Colony Name (Optional)"
            placeholder="Enter a name for your colony"
            value={colonyName}
            onChange={(e) => setColonyName(e.target.value)}
            margin="normal"
            helperText="If left blank, a unique name will be generated for you"
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            size="large"
            variant="contained"
            onClick={handleJoinServer}
            disabled={!selectedServerId || joinServerMutation.isPending}
            sx={{ py: 1.5 }}
          >
            {joinServerMutation.isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Joining Server...
              </>
            ) : (
              'Join Server & Start Playing'
            )}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InitialServerSelection;