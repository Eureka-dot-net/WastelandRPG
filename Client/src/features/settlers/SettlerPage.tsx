import { useState } from "react";
import {
  Container, Grid, useTheme, useMediaQuery, Box, Typography, Avatar, 
  LinearProgress, Card, CardContent, Chip, Divider, Button, IconButton,
  Collapse, Tooltip
} from "@mui/material";
import { 
  Person, Security, Build, LocalHospital, Agriculture, Science, Star, 
  Speed, Psychology, Shield, ExpandMore, ExpandLess, Inventory,
  Restaurant, BatteryFull, Favorite, SentimentSatisfied
} from '@mui/icons-material';

import { useColony } from "../../lib/hooks/useColony";
import { useSettler } from "../../lib/hooks/useSettler";
import { useServerContext } from "../../lib/contexts/ServerContext";
import type { Settler } from "../../lib/types/settler";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import DynamicIcon from "../../app/shared/components/DynamicIcon";

function SettlerPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const [isLoading, setIsLoading] = useState(false);
  const [backstoryExpanded, setBackstoryExpanded] = useState(false);

  const { colony, colonyLoading } = useColony(serverId);
  const colonyId = colony?._id;
  const { rejectSettler } = useSettler(serverId, colonyId);

  // Helper functions for icons and colors
  const getSkillIcon = (skill: string) => {
    const icons: Record<string, React.ReactElement> = {
      combat: <Security />,
      engineering: <Build />,
      medical: <LocalHospital />,
      farming: <Agriculture />,
      crafting: <Build />,
      scavenging: <Science />
    };
    return icons[skill] || <Star />;
  };

  const getStatIcon = (stat: string) => {
    const icons: Record<string, React.ReactElement> = {
      strength: <Security />,
      speed: <Speed />,
      intelligence: <Psychology />,
      resilience: <Shield />
    };
    return icons[stat] || <Star />;
  };

  const getStatColor = (value: number): "success" | "warning" | "error" => {
    if (value >= 15) return 'success';
    if (value >= 10) return 'warning';
    return 'error';
  };

  const getSkillColor = (value: number): string => {
    if (value >= 15) return '#4caf50';
    if (value >= 10) return '#ff9800';
    return '#d32f2f';
  };

  const getQuickStatColor = (value: number): "success" | "warning" | "error" => {
    if (value >= 70) return 'success';
    if (value >= 40) return 'warning';
    return 'error';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'idle': return '#4caf50';
      case 'busy': return '#ff9800';
      case 'resting': return '#2196f3';
      default: return '#757575';
    }
  };

  const handleBanishSettler = async (settler: Settler) => {
    if (!colonyId) return;
    
    setIsLoading(true);
    try {
      await rejectSettler.mutateAsync({
        settlerId: settler._id
      });
      // Note: The mutation should handle cache updates automatically
    } catch (error) {
      console.error("Error banishing settler:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (colonyLoading || !serverId) {
    return (
      <LoadingDisplay
        showContainer={true}
        minHeight="100vh"
        size={80}
      />
    );
  }

  if (!colony) {
    return (
      <ErrorDisplay
        error="Failed to load colony data"
        showContainer={true}
      />
    );
  }

  const settlers = colony.settlers || [];
  const totalSettlers = settlers.length;
  
  // Display the first settler for detailed view
  const settler = settlers[0];

  if (totalSettlers === 0) {
    return (
      <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
        <ProgressHeader
          title="Settler Details"
          emoji="👤"
          alertMessage="Your colony has no settlers yet. Recruit your first settler to begin building your wasteland community."
          alertSeverity="warning"
          progressLabel="Settlers"
          currentValue={0}
          totalValue={1}
        />
        <LoadingDisplay
          title="No Settlers"
          subtitle="Your colony doesn't have any settlers yet. Complete the settler selection process to begin recruiting survivors."
          emoji="🏜️"
          showContainer={false}
          showPaper={true}
          minHeight="40vh"
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
      <ProgressHeader
        title="Settler Details"
        emoji="👤"
        alertMessage={`Viewing details for ${settler.name}`}
        alertSeverity="info"
        progressLabel="Current Settler"
        currentValue={1}
        totalValue={totalSettlers}
      />

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Top Section: Avatar, Name, Status, Quick Stats */}
        <Grid size={12}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={3} alignItems={isMobile ? 'center' : 'flex-start'}>
                {/* Avatar and basic info */}
                <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: theme.palette.primary.main,
                      fontSize: '2rem'
                    }}
                  >
                    <Person fontSize="large" />
                  </Avatar>
                  <Chip 
                    label={settler.status.toUpperCase()} 
                    sx={{ 
                      bgcolor: getStatusColor(settler.status),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>

                {/* Name and Quick Stats */}
                <Box flex={1}>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {settler.name}
                  </Typography>
                  
                  <Typography variant="h6" color="text.primary" gutterBottom sx={{ mt: 2 }}>
                    Quick Stats
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Favorite color="error" />
                        <Typography variant="body2">Health</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={settler.health}
                        color={getQuickStatColor(settler.health)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {settler.health}%
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <SentimentSatisfied color="primary" />
                        <Typography variant="body2">Morale</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={settler.morale}
                        color={getQuickStatColor(settler.morale)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {settler.morale}%
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Restaurant color="secondary" />
                        <Typography variant="body2">Hunger</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(0, 100 - (settler.hunger || 0))}
                        color={getQuickStatColor(Math.max(0, 100 - (settler.hunger || 0)))}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {100 - (settler.hunger || 0)}%
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <BatteryFull color="info" />
                        <Typography variant="body2">Energy</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={settler.energy || 100}
                        color={getQuickStatColor(settler.energy || 100)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {settler.energy || 100}%
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content: Left and Right Columns */}
        <Grid size={{ xs: 12, md: 6 }}>
          {/* Left Column: Core Stats and Skills */}
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              {/* Core Stats */}
              <Typography variant="h6" color="text.primary" gutterBottom>
                Core Stats
              </Typography>
              {Object.entries(settler.stats).map(([stat, value]) => (
                <Box key={stat} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatIcon(stat)}
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {stat}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color={`${getStatColor(value)}.main`}>
                      {value}/20
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(value / 20) * 100}
                    color={getStatColor(value)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              {/* Skills */}
              <Typography variant="h6" color="text.primary" gutterBottom>
                Skills
              </Typography>
              {Object.entries(settler.skills).map(([skill, value]) => (
                <Box key={skill} display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getSkillIcon(skill)}
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {skill}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: getSkillColor(value) }}>
                    {value}/20
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {/* Right Column: Traits and Interests */}
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              {/* Traits */}
              <Typography variant="h6" color="text.primary" gutterBottom>
                Traits
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                {settler.traits.map((trait) => (
                  <Tooltip
                    key={trait.traitId}
                    title={trait.description}
                    sx={{ cursor: 'help' }}
                  >
                    <Chip
                      avatar={
                        <Avatar sx={{ width: 20, height: 20, bgcolor: 'transparent' }}>
                          <DynamicIcon name={trait.icon || 'GiQuestionMark'} />
                        </Avatar>
                      }
                      label={trait.name || trait.traitId}
                      color={trait.type === "positive" ? "success" : "error"}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        bgcolor: trait.type === "positive" ? "#2a3d2a" : "#3d2a2a",
                        color: '#fff',
                        borderColor: trait.type === "positive" ? "#4a704a" : "#704a4a",
                        fontSize: '0.75rem',
                        height: 28,
                        '&:hover': {
                          bgcolor: trait.type === "positive" ? "#3a4d3a" : "#4d3a3a",
                          borderColor: trait.type === "positive" ? "#6a906a" : "#905a5a"
                        },
                        '& .MuiChip-avatar': { width: 20, height: 20 },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Interests */}
              <Typography variant="h6" color="text.primary" gutterBottom>
                Interests
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {settler.interests.map((interest, index) => (
                  <Chip
                    key={index}
                    label={interest}
                    variant="outlined"
                    sx={{
                      borderColor: theme.palette.secondary.main,
                      color: theme.palette.secondary.main,
                      '&:hover': {
                        bgcolor: theme.palette.secondary.main + '20',
                      }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bottom Section: Equipment and Inventory */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.primary" gutterBottom>
                Equipment & Inventory
              </Typography>
              
              <Grid container spacing={2}>
                {/* Equipment Slots */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle1" color="text.primary" gutterBottom>
                    Equipment
                  </Typography>
                  
                  <Box display="flex" gap={2} mb={2}>
                    <Card variant="outlined" sx={{ p: 2, minWidth: 80, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Weapon</Typography>
                      <Box sx={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {settler.equipment.weapon ? (
                          <Tooltip title={settler.equipment.weapon.name}>
                            <Typography variant="body2">{settler.equipment.weapon.name}</Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.disabled">None</Typography>
                        )}
                      </Box>
                    </Card>
                    
                    <Card variant="outlined" sx={{ p: 2, minWidth: 80, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Armor</Typography>
                      <Box sx={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {settler.equipment.armor ? (
                          <Tooltip title={settler.equipment.armor.name}>
                            <Typography variant="body2">{settler.equipment.armor.name}</Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.disabled">None</Typography>
                        )}
                      </Box>
                    </Card>
                  </Box>
                </Grid>

                {/* Carry Inventory */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle1" color="text.primary" gutterBottom>
                    Carry Inventory ({settler.carry.length}/{settler.maxCarrySlots})
                  </Typography>
                  
                  <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={1}>
                    {Array.from({ length: settler.maxCarrySlots }).map((_, index) => {
                      const item = settler.carry[index];
                      return (
                        <Card key={index} variant="outlined" sx={{ p: 1, minHeight: 60, textAlign: 'center' }}>
                          {item ? (
                            <Tooltip title={`${item.name}${item.quantity ? ` (${item.quantity})` : ''}`}>
                              <Box>
                                <Inventory fontSize="small" />
                                <Typography variant="caption" display="block">
                                  {item.name}
                                </Typography>
                                {item.quantity && (
                                  <Typography variant="caption" color="text.secondary">
                                    x{item.quantity}
                                  </Typography>
                                )}
                              </Box>
                            </Tooltip>
                          ) : (
                            <Box sx={{ color: 'text.disabled', pt: 1 }}>
                              <Inventory fontSize="small" />
                              <Typography variant="caption" display="block">Empty</Typography>
                            </Box>
                          )}
                        </Card>
                      );
                    })}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Expandable Section: Backstory */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" color="text.primary">
                  Backstory & Details
                </Typography>
                <IconButton 
                  onClick={() => setBackstoryExpanded(!backstoryExpanded)}
                  sx={{ color: 'text.secondary' }}
                >
                  {backstoryExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              <Collapse in={backstoryExpanded}>
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {settler.backstory}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle2" color="text.primary">
                        Food Consumption
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {settler.foodConsumption || 1} units/day
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle2" color="text.primary">
                        Joined Colony
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(settler.createdAt).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="subtitle2" color="text.primary">
                        Theme
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {settler.theme || 'Standard'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>

        {/* Actions */}
        <Grid size={12}>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button
              variant="outlined"
              color="error"
              size="large"
              onClick={() => handleBanishSettler(settler)}
              disabled={rejectSettler.isPending || isLoading}
              sx={{ minWidth: 120 }}
            >
              {rejectSettler.isPending || isLoading ? 'Banishing...' : 'Banish Settler'}
            </Button>
            
            {/* Placeholder for future actions */}
            <Button
              variant="outlined"
              color="primary"
              size="large"
              disabled
              sx={{ minWidth: 120 }}
            >
              Assign Task
            </Button>
            
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              disabled
              sx={{ minWidth: 120 }}
            >
              Heal
            </Button>
            
            <Button
              variant="outlined"
              color="info"
              size="large"
              disabled
              sx={{ minWidth: 120 }}
            >
              Equip
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default SettlerPage;