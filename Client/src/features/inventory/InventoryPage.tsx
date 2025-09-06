import {
  Container, Paper, Typography, Box, Grid, Card, CardContent, CardActions, Button, 
  Chip, Tooltip
} from "@mui/material";
import { Delete as DropIcon, Inventory2 as InventoryIcon } from "@mui/icons-material";
import { useState } from "react";
import { useInventory } from "../../lib/hooks/useInventory";
import { useColony } from "../../lib/hooks/useColony";
import type { InventoryItem } from "../../lib/types/inventory";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import DynamicIcon from "../../app/shared/components/DynamicIcon";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import { useServerContext } from "../../lib/contexts/ServerContext";

function InventoryPage() {
  const [droppingItems, setDroppingItems] = useState<Set<string>>(new Set());
  const {currentServerId : serverId} = useServerContext();

  const { colony, colonyLoading, colonyError } = useColony(serverId);
  const colonyId = colony?._id;

  const { inventory, loadingInventory, errorInventory, dropColonyItem } = useInventory(colonyId || "");

  const handleDropItem = async (itemId: string) => {
    setDroppingItems(prev => new Set(prev).add(itemId));
    
    try {
      await dropColonyItem.mutateAsync(itemId);
    } catch (error) {
      console.error("Error dropping item:", error);
      // Error handling is managed by the mutation's onError callback
    } finally {
      setDroppingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const getItemTypeColor = (type: InventoryItem['type']) => {
    switch (type) {
      case 'base': return 'default';
      case 'crafted': return 'secondary';
      case 'currency': return 'warning';
      case 'farming': return 'success';
      case 'food': return 'info';
      case 'medicine': return 'error';
      case 'quest': return 'primary';
      default: return 'default';
    }
  };

  const getItemTypeLabel = (type: InventoryItem['type']) => {
    switch (type) {
      case 'base': return 'Base Material';
      case 'crafted': return 'Crafted Item';
      case 'currency': return 'Currency';
      case 'farming': return 'Farming';
      case 'food': return 'Food';
      case 'medicine': return 'Medicine';
      case 'quest': return 'Quest Item';
      default: return 'Unknown';
    }
  };

  const formatProperties = (properties?: Record<string, unknown>) => {
    if (!properties || Object.keys(properties).length === 0) return [];
    
    return Object.entries(properties).map(([key, value]) => {
      if (typeof value === 'boolean') {
        return value ? key : null;
      }
      return `${key}: ${value}`;
    }).filter(Boolean);
  };

  const getTotalItems = () => {
    return inventory?.items.reduce((total, item) => total + item.quantity, 0) || 0;
  };

  const getUniqueItems = () => {
    return inventory?.items.length || 0;
  };

  const getAvailableSlots = () => {
    const maxSlots = colony?.maxInventory || 0;
    const usedSlots = colony?.currentInventoryStacks || 0;
    return maxSlots - usedSlots;
  };

  const getSlotUtilization = () => {
    const maxSlots = colony?.maxInventory || 1;
    const usedSlots = colony?.currentInventoryStacks || 0;
    return (usedSlots / maxSlots) * 100;
  };

  if (colonyLoading || loadingInventory || !serverId) {
    return (
      <LoadingDisplay 
        title="Loading Inventory" 
        subtitle="Fetching your colony's items..."
        emoji="📦"
      />
    );
  }

  if (colonyError || errorInventory) {
    return (
      <ErrorDisplay 
        error={colonyError || errorInventory} 
        showContainer
      />
    );
  }

  if (!inventory || !colony) {
    return (
      <ErrorDisplay 
        error="Failed to load inventory data"
        showContainer
      />
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Custom Header with Inventory Stats */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          📦 Colony Inventory
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Managing resources for {colony.colonyName}
        </Typography>
        
        {/* Compact Inventory Stats */}
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          flexWrap="wrap" 
          gap={{ xs: 2, sm: 3 }}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
            p: 2,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Chip 
            label={`${getTotalItems()} Items`}
            color="secondary"
            variant="filled"
            sx={{ fontWeight: 600, fontSize: '0.875rem' }}
          />
          <Chip 
            label={`${getUniqueItems()} Types`}
            color="secondary"
            variant="filled"
            sx={{ fontWeight: 600, fontSize: '0.875rem' }}
          />
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={`${colony?.currentInventoryStacks || 0}/${colony?.maxInventory || 0} Slots`}
              color={getAvailableSlots() <= 5 ? 'error' : 
                     getAvailableSlots() <= 10 ? 'warning' : 'success'}
              variant="filled"
              sx={{ fontWeight: 600, fontSize: '0.875rem' }}
            />
            <Box sx={{ width: 40, height: 6, borderRadius: 3, bgcolor: 'grey.700', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${getSlotUtilization()}%`,
                  bgcolor: getAvailableSlots() <= 5 ? 'error.main' : 
                           getAvailableSlots() <= 10 ? 'warning.main' : 'success.main',
                  transition: 'all 0.3s ease'
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Items Grid */}
      {inventory.items.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', opacity: 0.7 }}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Empty Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your colony doesn't have any items yet. Complete tasks and assignments to gather resources.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {inventory.items.map((item) => {
            const isDropping = droppingItems.has(item.itemId);
            const properties = formatProperties(item.properties);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.itemId}>
                <Card sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #333',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    borderColor: 'primary.main'
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <DynamicIcon name={item.icon} />
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            {item.name}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={getItemTypeLabel(item.type)}
                            color={getItemTypeColor(item.type)}
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      <Box 
                        sx={{
                          bgcolor: 'secondary.main',
                          color: 'secondary.contrastText',
                          borderRadius: 2,
                          px: 1.5,
                          py: 0.5,
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          minWidth: '32px',
                          textAlign: 'center',
                          boxShadow: 1
                        }}
                      >
                        {item.quantity > 999 ? '999+' : item.quantity}
                      </Box>
                    </Box>

                    {properties.length > 0 && (
  <Box
    display="flex"
    flexWrap="wrap"
    alignItems="center"
    gap={0.5}
    sx={{ mt: 2 }}
  >
    <Typography
      variant="subtitle2"
      color="text.secondary"
      sx={{ fontSize: '0.75rem', mr: 0.5 }}
    >
      Properties:
    </Typography>
    {properties.map((prop, index) => (
      <Chip
        key={index}
        size="small"
        label={prop}
        variant="filled"
        color="default"
        sx={{
          fontSize: '0.7rem',
          height: '20px',
          backgroundColor: 'rgba(255,255,255,0.1)',
        }}
      />
    ))}
  </Box>
)}
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Tooltip title="Drop this item from inventory">
                      <span style={{ width: '100%' }}>
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          size="small"
                          startIcon={<DropIcon />}
                          onClick={() => handleDropItem(item.itemId)}
                          disabled={isDropping}
                          sx={{ 
                            fontWeight: 600,
                            opacity: isDropping ? 0.6 : 1
                          }}
                        >
                          {isDropping ? "Dropping..." : "Drop Item"}
                        </Button>
                      </span>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Future Features Placeholder */}
      <Paper elevation={2} sx={{ p: 3, mt: 4, opacity: 0.6 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon color="secondary" /> Advanced Inventory Management (Coming Soon)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Future features: Item sorting, filtering, bulk operations, and inventory categories.
        </Typography>
      </Paper>
    </Container>
  );
}

export default InventoryPage;
