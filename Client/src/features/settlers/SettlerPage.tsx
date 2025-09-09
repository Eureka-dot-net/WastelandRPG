import { useState } from "react";
import {
  Container, Grid, useTheme, useMediaQuery, Box, Typography, Avatar,
  LinearProgress, Card, CardContent, Chip, Divider, Button, IconButton,
  Collapse, Tooltip
} from "@mui/material";
import {
  Security, Build, LocalHospital, Agriculture, Science, Star,
  Speed, Psychology, Shield, ExpandMore, ExpandLess, Inventory,
  Restaurant, BatteryFull, Favorite, SentimentSatisfied, ArrowBack,
  Delete as DropIcon
} from '@mui/icons-material';

import { useColony } from "../../lib/hooks/useColony";
import { useSettler } from "../../lib/hooks/useSettler";
import { useServerContext } from "../../lib/contexts/ServerContext";
import type { Settler } from "../../lib/types/settler";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import DynamicIcon from "../../app/shared/components/DynamicIcon";
import SettlerStatusGrid from "./SettlerStatusGrid";
import SettlerAvatar from "../../lib/avatars/SettlerAvatar";

function SettlerPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const [isLoading, setIsLoading] = useState(false);
  const [backstoryExpanded, setBackstoryExpanded] = useState(false);
  const [selectedSettler, setSelectedSettler] = useState<Settler | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
  const [droppingItems, setDroppingItems] = useState<Set<string>>(new Set());

  const { colony, colonyWithCurrentEnergy, getSettlerCurrentEnergy, colonyLoading } = useColony(serverId);
  const colonyId = colony?._id;
  const { rejectSettler, dropSettlerItem } = useSettler(serverId, colonyId);

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
      case 'working': return '#ff9800';
      case 'resting': return '#2196f3';
      case 'exploring': return '#9c27b0';
      case 'crafting': return '#f44336';
      case 'questing': return '#3f51b5';
      default: return '#757575';
    }
  };

  const handleViewDetails = (settler: Settler) => {
    setSelectedSettler(settler);
    setViewMode('detail');
    setBackstoryExpanded(false); // Reset expanded state when viewing new settler
  };

  const handleBackToOverview = () => {
    setSelectedSettler(null);
    setViewMode('overview');
    setBackstoryExpanded(false);
  };

  const handleBanishSettler = async (settler: Settler) => {
    if (!colonyId) return;

    setIsLoading(true);
    try {
      await rejectSettler.mutateAsync({
        settlerId: settler._id
      });
      // Go back to overview after banishing
      handleBackToOverview();
    } catch (error) {
      console.error("Error banishing settler:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDropSettlerItem = async (settlerId: string, itemId: string) => {
    setDroppingItems(prev => new Set(prev).add(`${settlerId}-${itemId}`));

    try {
      await dropSettlerItem.mutateAsync({ settlerId, itemId });
    } catch (error) {
      console.error("Error dropping item from settler:", error);
    } finally {
      setDroppingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${settlerId}-${itemId}`);
        return newSet;
      });
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

  const settlers = colonyWithCurrentEnergy?.settlers || [];
  const totalSettlers = settlers.length;

  if (totalSettlers === 0) {
    return (
      <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
        <ProgressHeader
          title="Settlers"
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

  // Overview mode - show all settlers in a grid
  if (viewMode === 'overview') {
    const settlerActions = [
      {
        label: "View Details",
        onClick: handleViewDetails,
        variant: 'contained' as const,
        color: 'primary' as const
      }
    ];

    return (
      <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
        <ProgressHeader
          title="Settlers"
          emoji="👤"
          alertMessage={`Managing ${totalSettlers} settler${totalSettlers > 1 ? 's' : ''} in your colony`}
          alertSeverity="info"
          progressLabel="Colony Population"
          currentValue={totalSettlers}
          totalValue={Math.max(totalSettlers, colony.maxSettlers)} // Show growth potential
        />

        <SettlerStatusGrid
          settlers={settlers}
          actions={settlerActions}
          gridSizes={{ xs: 12, sm: 6, md: 4, lg: 3 }}
        />
      </Container>
    );
  }

  // Detail mode - show selected settler details
  const settler = selectedSettler!;
  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
      {/* Header with back button */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBackToOverview}
          sx={{ minWidth: 'auto' }}
        >
          Back to Overview
        </Button>
      </Box>

      <ProgressHeader
        title="Settler Details"
        emoji="👤"
        alertMessage={`Viewing details for ${settler.name}`}
        alertSeverity="info"
        progressLabel={`Settler ${settlers.indexOf(settler) + 1} of ${totalSettlers}`}
        currentValue={settlers.indexOf(settler) + 1}
        totalValue={totalSettlers}
      />

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Top Section: Avatar, Name, Status, Quick Stats - Made smaller */}
        <Grid size={12}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}> {/* Reduced padding */}
              <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} alignItems={isMobile ? 'center' : 'flex-start'}> {/* Reduced gap */}
                {/* Avatar and basic info - Made smaller */}
                <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                  <SettlerAvatar settler={settler} size={80} />
                  <Chip
                    label={settler.status.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: getStatusColor(settler.status),
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>

                {/* Name and Quick Stats */}
                <Box flex={1}>
                  <Typography variant="h5" color="primary" gutterBottom>
                    {settler.name}
                  </Typography>

                  <Typography variant="subtitle1" color="text.primary" gutterBottom sx={{ mt: 1.5 }}>
                    Quick Stats
                  </Typography>

                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Favorite color="error" fontSize="small" />
                        <Typography variant="body2">Health</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={settler.health}
                        color={getQuickStatColor(settler.health)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {settler.health}%
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <SentimentSatisfied color="primary" fontSize="small" />
                        <Typography variant="body2">Morale</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={settler.morale}
                        color={getQuickStatColor(settler.morale)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {settler.morale}%
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Restaurant color="secondary" fontSize="small" />
                        <Typography variant="body2">Hunger</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(0, 100 - (settler.hunger || 0))}
                        color={getQuickStatColor(Math.max(0, 100 - (settler.hunger || 0)))}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {100 - (settler.hunger || 0)}%
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <BatteryFull color="info" fontSize="small" />
                        <Typography variant="body2">Energy</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getSettlerCurrentEnergy(settlers.indexOf(settler)) || 100}
                        color={getQuickStatColor(getSettlerCurrentEnergy(settlers.indexOf(settler)) || 100)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(getSettlerCurrentEnergy(settlers.indexOf(settler)))}%
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content: Left and Right Columns - Made more compact */}
        <Grid size={{ xs: 12, md: 6 }}>
          {/* Left Column: Core Stats and Skills */}
          <Card sx={{ height: 'fit-content' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}> {/* Reduced padding */}
              {/* Core Stats */}
              <Typography variant="subtitle1" color="text.primary" gutterBottom> {/* Reduced from h6 */}
                Core Stats
              </Typography>
              {Object.entries(settler.stats).map(([stat, value]) => (
                <Box key={stat} mb={1.5}> {/* Reduced margin */}
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
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              ))}

              <Divider sx={{ my: 1.5 }} /> {/* Reduced margin */}

              {/* Skills */}
              <Typography variant="subtitle1" color="text.primary" gutterBottom>
                Skills
              </Typography>
              {Object.entries(settler.skills).map(([skill, value]) => {
                const isFavorite = settler.interests?.includes(skill);
                return (
                  <Box key={skill} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getSkillIcon(skill)}
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {skill}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      {isFavorite && (
                        <Favorite sx={{ fontSize: 16, color: 'gold' }} />
                      )}
                      <Typography variant="body2" sx={{ color: getSkillColor(value) }}>
                        {value}/20
                      </Typography>

                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {/* Right Column: Traits and Interests */}
          <Card sx={{ height: 'fit-content' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              {/* Traits */}
              <Typography variant="subtitle1" color="text.primary" gutterBottom>
                Traits
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}> {/* Reduced gap and margin */}
                {settler.traits.map((trait) => (
                  <Tooltip
                    key={trait.traitId}
                    title={trait.description}
                    sx={{ cursor: 'help' }}
                  >
                    <Chip
                      avatar={
                        <Avatar sx={{ width: 18, height: 18, bgcolor: 'transparent' }}>
                          <DynamicIcon name={trait.icon || 'GiQuestionMark'} />
                        </Avatar>
                      }
                      label={trait.name || trait.traitId}
                      color={trait.type === "positive" ? "success" : "error"}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderRadius: 2,
                        bgcolor: trait.type === "positive" ? "#2a3d2a" : "#3d2a2a",
                        color: '#fff',
                        borderColor: trait.type === "positive" ? "#4a704a" : "#704a4a",
                        fontSize: '0.7rem',
                        height: 24,
                        '&:hover': {
                          bgcolor: trait.type === "positive" ? "#3a4d3a" : "#4d3a3a",
                          borderColor: trait.type === "positive" ? "#6a906a" : "#905a5a"
                        },
                        '& .MuiChip-avatar': { width: 18, height: 18 },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Interests */}
              <Typography variant="subtitle1" color="text.primary" gutterBottom>
                Interests
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {settler.interests.map((interest, index) => (
                  <Chip
                    key={index}
                    label={interest}
                    variant="outlined"
                    size="small"
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

        {/* Bottom Section: Equipment and Inventory - Made more compact */}
        <Grid size={12}>
          <Card>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="subtitle1" color="text.primary" gutterBottom> {/* Reduced from h6 */}
                Equipment & Inventory
              </Typography>

              <Grid container spacing={1.5}> {/* Reduced spacing */}
                {/* Equipment Slots */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body1" color="text.primary" gutterBottom> {/* Reduced from subtitle1 */}
                    Equipment
                  </Typography>

                  <Box display="flex" gap={1.5} mb={1.5}> {/* Reduced gap and margin */}
                    <Card variant="outlined" sx={{ p: 1.5, minWidth: 70, textAlign: 'center' }}> {/* Reduced padding and width */}
                      <Typography variant="caption" color="text.secondary">Weapon</Typography>
                      <Box sx={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {settler.equipment.weapon ? (
                          <Tooltip title={settler.equipment.weapon.name}>
                            <Box>
                              <Typography variant="caption">{settler.equipment.weapon.name}</Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">None</Typography>
                        )}
                      </Box>
                    </Card>

                    <Card variant="outlined" sx={{ p: 1.5, minWidth: 70, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Armor</Typography>
                      <Box sx={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {settler.equipment.armor ? (
                          <Tooltip title={settler.equipment.armor.name}>
                            <Box>
                              <Typography variant="caption">{settler.equipment.armor.name}</Typography>
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">None</Typography>
                        )}
                      </Box>
                    </Card>
                  </Box>
                </Grid>

                {/* Carry Inventory */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body1" color="text.primary" gutterBottom>
                    Carry Inventory ({settler.carry.length}/{settler.maxCarrySlots})
                  </Typography>

                  <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={0.5}> {/* Reduced gap */}
                    {Array.from({ length: settler.maxCarrySlots }).map((_, index) => {
                      const item = settler.carry[index];
                      const isDropping = droppingItems.has(`${settler._id}-${item?.itemId}`);
                      return (
                        <Card key={index} variant="outlined" sx={{ p: 0.5, minHeight: 50, textAlign: 'center' }}> {/* Reduced padding and height */}
                          {item ? (
                            <Box>
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
                              <Tooltip title="Drop this item">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDropSettlerItem(settler._id, item.itemId)}
                                  disabled={isDropping}
                                  sx={{
                                    p: 0.25,
                                    mt: 0.25,
                                    color: 'error.main',
                                    '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
                                    opacity: isDropping ? 0.6 : 1
                                  }}
                                >
                                  <DropIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : (
                            <Box sx={{ color: 'text.disabled', pt: 0.5 }}>
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

        {/* Expandable Section: Backstory - Made more compact */}
        <Grid size={12}>
          <Card>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" color="text.primary"> {/* Reduced from h6 */}
                  Backstory & Details
                </Typography>
                <IconButton
                  onClick={() => setBackstoryExpanded(!backstoryExpanded)}
                  sx={{ color: 'text.secondary' }}
                  size="small"
                >
                  {backstoryExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={backstoryExpanded}>
                <Box mt={1.5}> {/* Reduced margin */}
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {settler.backstory}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} /> {/* Reduced margin */}

                  <Grid container spacing={1.5}> {/* Reduced spacing */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="body2" color="text.primary"> {/* Reduced from subtitle2 */}
                        Food Consumption
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {settler.foodConsumption || 1} units/day
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="body2" color="text.primary">
                        Joined Colony
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(settler.createdAt).toLocaleDateString()}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Typography variant="body2" color="text.primary">
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

        {/* Actions - Made more compact */}
        <Grid size={12}>
          <Box display="flex" justifyContent="center" gap={1.5}> {/* Reduced gap */}
            <Button
              variant="outlined"
              color="error"
              size="medium"
              onClick={() => handleBanishSettler(settler)}
              disabled={rejectSettler.isPending || isLoading}
              sx={{ minWidth: 100 }}
            >
              {rejectSettler.isPending || isLoading ? 'Banishing...' : 'Banish Settler'}
            </Button>

            {/* Placeholder for future actions */}
            <Button
              variant="outlined"
              color="primary"
              size="medium"
              disabled
              sx={{ minWidth: 100 }}
            >
              Assign Task
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              size="medium"
              disabled
              sx={{ minWidth: 100 }}
            >
              Heal
            </Button>

            <Button
              variant="outlined"
              color="info"
              size="medium"
              disabled
              sx={{ minWidth: 100 }}
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