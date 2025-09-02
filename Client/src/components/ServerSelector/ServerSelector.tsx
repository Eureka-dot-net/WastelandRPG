import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Public as PublicIcon,
  Security as SecurityIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';
import { useServerContext } from '../../lib/contexts/ServerContext';
import { useServers } from '../../lib/hooks/useServers';
import { useUserColonies } from '../../lib/hooks/useUserColonies';
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

interface ServerSelectorProps {
  isMobile?: boolean;
}

const ServerSelector: React.FC<ServerSelectorProps> = ({ isMobile = false }) => {
  const { currentServerId, setCurrentServer, hasMultipleServers } = useServerContext();
  const { data: serversData, error: serversError } = useServers();
  const { data: coloniesData, error: serverContextError } = useUserColonies();
  const joinServerMutation = useJoinServer();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [colonyName, setColonyName] = useState('');

  const userColonies = coloniesData?.colonies || [];
  const availableServers = serversData?.servers || [];

  // Find current colony from colonies data
  const currentColony = userColonies.find(colony => colony.serverId === currentServerId);

  // Handle errors
  if (serverContextError || serversError) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
        <Typography variant="body2">Failed to load servers</Typography>
      </Box>
    );
  }

  if (!currentColony) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2">Loading...</Typography>
      </Box>
    );
  }

  const joinedServerIds = userColonies.map(colony => colony.serverId);
  const unjoinedServers = availableServers.filter(server => !joinedServerIds.includes(server.id));

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (hasMultipleServers || unjoinedServers.length > 0) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleServerSwitch = (serverId: string) => {
    setCurrentServer(serverId);
    handleClose();
  };

  const handleJoinServerClick = () => {
    setJoinDialogOpen(true);
    handleClose();
  };

  const handleJoinServer = async () => {
    if (!selectedServerId) return;

    try {
      await joinServerMutation.mutateAsync({
        serverId: selectedServerId,
        colonyName: colonyName.trim() || undefined,
      });
      
      toast.success('Successfully joined server!');
      setJoinDialogOpen(false);
      setSelectedServerId('');
      setColonyName('');
      
      // Switch to the newly joined server
      setCurrentServer(selectedServerId);
    } catch (error) {
      toast.error('Failed to join server' + error);
    }
  };

  const serverDisplayName = currentColony.serverName || 'Unknown Server';
  const serverType = currentColony.serverType || 'Unknown';

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outlined"
        size={isMobile ? "medium" : "small"}
        endIcon={(hasMultipleServers || unjoinedServers.length > 0) ? <ExpandMoreIcon /> : null}
        sx={{
          fontWeight: 600,
          textTransform: 'none',
          borderColor: 'rgba(255,255,255,0.2)',
          color: 'text.primary',
          minWidth: isMobile ? 'auto' : 200,
          justifyContent: 'space-between',
          '&:hover': {
            bgcolor: 'primary.main',
            borderColor: 'primary.main',
            color: 'white',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getServerIcon(serverType)}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {currentColony.colonyName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, lineHeight: 1 }}>
              {serverDisplayName}
            </Typography>
          </Box>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
       
      >
        {[
          ...(hasMultipleServers ? [
            <Typography key="colonies-header" variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
              Your Colonies
            </Typography>,
            ...userColonies.map((colony) => (
              <MenuItem
                key={colony.serverId}
                onClick={() => handleServerSwitch(colony.serverId)}
                selected={colony.serverId === currentServerId}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  py: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getServerIcon(colony.serverType || '')}
                  </ListItemIcon>
                  <ListItemText
                    primary={colony.colonyName}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {colony.serverName}
                        </Typography>
                        <Chip
                          label={colony.serverType}
                          size="small"
                          color={getServerTypeColor(colony.serverType || '') }
                          sx={{ height: 16, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                  />
                </Box>
              </MenuItem>
            ))
          ] : []),
          ...(unjoinedServers.length > 0 ? [
            ...(hasMultipleServers ? [<Divider key="divider" />] : []),
            <Typography key="servers-header" variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
              Available Servers
            </Typography>,
            <MenuItem key="join-server" onClick={handleJoinServerClick}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Join New Server" />
            </MenuItem>
          ] : [])
        ]}
      </Menu>

      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Join New Server</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Server</InputLabel>
            <Select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              label="Select Server"
            >
              {unjoinedServers.map((server) => (
                <MenuItem key={server.id} value={server.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {getServerIcon(server.type)}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {server.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {server.description}
                      </Typography>
                    </Box>
                    <Chip
                      label={server.type}
                      size="small"
                      color={getServerTypeColor(server.type)}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Colony Name (Optional)"
            placeholder="Enter a custom name for your colony"
            value={colonyName}
            onChange={(e) => setColonyName(e.target.value)}
            margin="normal"
            helperText="If left blank, a default name will be generated"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleJoinServer}
            variant="contained"
            disabled={!selectedServerId || joinServerMutation.isPending}
          >
            {joinServerMutation.isPending ? 'Joining...' : 'Join Server'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ServerSelector;