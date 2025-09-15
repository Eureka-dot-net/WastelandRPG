import {
  Hotel, SingleBed, Timer, Warning
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Grid, useTheme, useMediaQuery, Box, Card, CardContent
} from "@mui/material";
import { useMemo, useState } from "react";
import "react-toastify/dist/ReactToastify.css";

import { useLodging } from "../../lib/hooks/useLodging";
import { useColony } from "../../lib/hooks/useColony";
import { useAssignment } from "../../lib/hooks/useAssignment";
import { useAssignmentNotifications } from "../../lib/hooks/useAssignmentNotifications";
import type { Settler } from "../../lib/types/settler";
import type { Bed } from "../../lib/types/lodgingResponse";
import type { BasePreviewResult } from "../../lib/types/preview";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";
import SettlerSelectorDialog from "../../app/shared/components/settlers/SettlerSelectorDialog";
import { useServerContext } from "../../lib/contexts/ServerContext";
import LatestEventCard from "../../components/events/LatestEventCard";
import SettlerAvatar from "../../lib/avatars/SettlerAvatar";
import DevTools from "../../app/shared/components/ui/DevTools";
import { formatTimeRemaining } from "../../lib/utils/timeUtils";

interface BedVisualizationProps {
  bed: Bed;
  index: number;
  settler?: Settler;
  isResting: boolean;
  timeRemaining?: number;
  onClick: () => void;
}

const BedVisualization: React.FC<BedVisualizationProps> = ({ bed, index, settler, isResting, timeRemaining, onClick }) => {
  const theme = useTheme();
  
  const getBedColor = (level: number) => {
    switch (level) {
      case 1: return '#8B4513'; // Brown
      case 2: return '#4A90E2'; // Blue
      case 3: return '#9B59B6'; // Purple
      default: return '#8B4513';
    }
  };

  const getBedName = (level: number) => {
    switch (level) {
      case 1: return 'Basic Bed';
      case 2: return 'Comfortable Bed';
      case 3: return 'Luxury Bed';
      default: return 'Basic Bed';
    }
  };

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        },
        position: 'relative',
        minHeight: 160
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SingleBed sx={{ color: getBedColor(bed.level) }} />
          {getBedName(bed.level)} #{index + 1}
        </Typography>
        
        {/* SVG Bed Visualization with Sleeping Settler */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, position: 'relative' }}>
          <svg width="120" height="80" viewBox="0 0 120 80">
            {/* Bed Frame */}
            <rect x="10" y="40" width="100" height="30" fill={getBedColor(bed.level)} rx="5" />
            {/* Bed Head */}
            <rect x="5" y="35" width="10" height="40" fill={getBedColor(bed.level)} rx="3" />
            {/* Bed Foot */}
            <rect x="105" y="45" width="10" height="30" fill={getBedColor(bed.level)} rx="3" />
            {/* Mattress */}
            <rect x="15" y="35" width="90" height="15" fill="#F5F5DC" rx="3" />
            {/* Pillow */}
            <rect x="15" y="30" width="25" height="10" fill="#FFFFFF" rx="5" />
            
            {/* Bed Level Indicators */}
            {Array.from({ length: bed.level }).map((_, i) => (
              <circle
                key={i}
                cx={25 + i * 8}
                cy={55}
                r="2"
                fill="#FFD700"
              />
            ))}
          </svg>
          
          {/* Sleeping Settler Avatar positioned on top of the bed */}
          {isResting && settler && (
            <Box
              sx={{
                position: 'absolute',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
                opacity: 0.8,
              }}
            >
              <SettlerAvatar settler={settler} size={32} />
            </Box>
          )}
        </Box>

        {/* Settler Status */}
        {isResting && settler ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {settler.name} is resting...
              </Typography>
              <Timer sx={{ fontSize: 16, color: theme.palette.warning.main }} />
            </Box>
            {timeRemaining !== undefined && timeRemaining > 0 && (
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {formatTimeRemaining(timeRemaining)} remaining
              </Typography>
            )}
            {timeRemaining !== undefined && timeRemaining <= 0 && (
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                Sleep completed - ready to wake up!
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SingleBed sx={{ fontSize: 16 }} />
            Available for use
          </Typography>
        )}

        {/* Bed Quality Info */}
        <Typography variant="caption" color="text.secondary">
          Energy Recovery: {bed.level === 1 ? '1.0x' : bed.level === 2 ? '1.3x' : '1.6x'} rate
        </Typography>
      </CardContent>
    </Card>
  );
};

function LodgingPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  
  const { colony } = useColony(serverId);
  const { lodging, loadingLodging, startSleep } = useLodging(serverId, colony?._id);
  
  // Get resting assignments for time tracking and completion
  const { assignments: restingAssignments } = useAssignment(serverId, colony?._id, { type: ['resting'] });
  
  // Get assignment notification system for time remaining
  const { timers } = useAssignmentNotifications();

  const [selectedBed, setSelectedBed] = useState<{ bed: Bed; index: number } | null>(null);
  const [sleepDialogOpen, setSleepDialogOpen] = useState(false);
  const [settlerPreviews, setSettlerPreviews] = useState<Record<string, BasePreviewResult>>({});
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [previewsError, setPreviewsError] = useState<Error | null>(null);

  // Get available settlers (idle ones with less than 100 energy)
  const availableSettlers = useMemo(() => {
    if (!colony?.settlers) return [];
    return colony.settlers.filter(settler => 
      settler.status === 'idle' && 
      (settler.energy ?? 0) < 100
    );
  }, [colony?.settlers]);

  // Calculate sleep duration for a settler and bed level on frontend
  const calculateSleepDuration = (settler: Settler, bedLevel: number): number => {
    if (settler.energy >= 100) return 0;
    
    // Base energy delta for resting (this would come from server originally)
    const baseEnergyDelta = 10; // 10 energy per hour for resting
    
    // Apply bed level multiplier (higher level beds = faster recovery)
    const bedMultiplier = 1 + (bedLevel - 1) * 0.3;
    const effectiveEnergyDelta = baseEnergyDelta * bedMultiplier;
    
    // Calculate energy needed and hours needed
    const energyNeeded = 100 - settler.energy;
    const hoursNeeded = energyNeeded / effectiveEnergyDelta;
    
    // Convert to milliseconds
    return Math.ceil(hoursNeeded * 60 * 60 * 1000);
  };

  // Load previews when dialog opens - now calculated on frontend
  const loadPreviews = async (bedLevel: number) => {
    if (availableSettlers.length === 0) return;

    setPreviewsLoading(true);
    setPreviewsError(null);

    try {
      const previews: Record<string, BasePreviewResult> = {};
      
      availableSettlers.forEach(settler => {
        const duration = calculateSleepDuration(settler, bedLevel);
        
        // Note: We could add validation here later if needed
        // const canSleep = settler.status === 'idle' && duration > 0;
        // const reason = settler.status !== 'idle' ? `Settler is currently ${settler.status}` : undefined;

        previews[settler._id] = {
          settlerId: settler._id,
          settlerName: settler.name,
          baseDuration: duration,
          basePlannedRewards: {},
          adjustments: {
            adjustedDuration: duration,
            effectiveSpeed: 1,
            lootMultiplier: 1
          }
        };
      });

      setSettlerPreviews(previews);
    } catch (error) {
      setPreviewsError(error as Error);
    } finally {
      setPreviewsLoading(false);
    }
  };

  // Get resting settlers with their assignments and time remaining
  const restingSettlersWithTime = useMemo(() => {
    if (!colony?.settlers || !restingAssignments) return [];
    
    return colony.settlers
      .filter(settler => settler.status === 'resting')
      .map(settler => {
        // Find the corresponding resting assignment
        const assignment = restingAssignments.find(a => a.settlerId === settler._id);
        const timeRemaining = assignment ? timers[assignment._id] : undefined;
        
        return {
          settler,
          assignment,
          timeRemaining
        };
      });
  }, [colony?.settlers, restingAssignments, timers]);

  const handleBedClick = (bed: Bed, index: number) => {
    // Check if bed is occupied by finding matching resting settler
    const isOccupied = restingSettlersWithTime.some((_, settlerIndex) => settlerIndex === index);

    if (!isOccupied && availableSettlers.length > 0) {
      setSelectedBed({ bed, index });
      setSleepDialogOpen(true);
      loadPreviews(bed.level);
    }
  };

  const handleSettlerSelect = (settler: Settler) => {
    if (selectedBed) {
      startSleep.mutate({
        settlerId: settler._id,
        bedLevel: selectedBed.bed.level
      }, {
        onSuccess: () => {
          setSleepDialogOpen(false);
          setSelectedBed(null);
          setSettlerPreviews({});
        }
      });
    }
  };

  const handleDialogClose = () => {
    setSleepDialogOpen(false);
    setSelectedBed(null);
    setSettlerPreviews({});
  };

  if (loadingLodging || !serverId) {
    return (
      <LoadingDisplay
        showContainer={true}
        minHeight="100vh"
        size={80}
      />
    );
  }

  if (!lodging || !colony) {
    return (
      <ErrorDisplay
        error="Failed to load lodging data"
        showContainer={true}
      />
    );
  }

  // Get the latest event for display
  const latestEvent = colony.logs && colony.logs.length > 0
    ? [...colony.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  const totalBeds = lodging.lodging.beds.length;
  const occupiedBeds = restingSettlersWithTime.length;

  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
      <ProgressHeader
        title="Sleeping Quarters"
        emoji="🛏️"
        alertMessage="Manage your colony's sleeping arrangements. Settlers need rest to recover energy."
        alertSeverity="info"
        progressLabel="Bed Utilization"
        currentValue={occupiedBeds}
        totalValue={totalBeds}
        progressColor="primary"
      />

      {/* Latest Event Card */}
      <LatestEventCard event={latestEvent} />

      {/* Available Settlers Warning */}
      {availableSettlers.length === 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: theme.palette.warning.light, color: theme.palette.warning.contrastText }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            No settlers available for sleep. All settlers are either busy or already have full energy.
          </Typography>
        </Paper>
      )}

      {/* Beds Grid */}
      <Grid container spacing={isMobile ? 2 : 3}>
        {lodging.lodging.beds.map((bed, index) => {
          // Find if this bed is occupied and get time remaining
          const restingData = index < restingSettlersWithTime.length ? restingSettlersWithTime[index] : undefined;
          const isResting = !!restingData;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <BedVisualization
                bed={bed}
                index={index}
                settler={restingData?.settler}
                isResting={isResting}
                timeRemaining={restingData?.timeRemaining}
                onClick={() => handleBedClick(bed, index)}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* Sleep Assignment Dialog */}
      <SettlerSelectorDialog
        open={sleepDialogOpen}
        onClose={handleDialogClose}
        onSelect={handleSettlerSelect}
        settlers={availableSettlers}
        title={`Assign Settler to Sleep - ${selectedBed ? `Bed Level ${selectedBed.bed.level}` : ''}`}
        emptyStateMessage="No available settlers"
        emptyStateSubMessage="All settlers are currently assigned to other tasks or have full energy."
        showSkills={true}
        showStats={false}
        confirmPending={startSleep.isPending}
        settlerPreviews={settlerPreviews}
        previewsLoading={previewsLoading}
        previewsError={previewsError}
      />

      {/* Dev Tools */}
      <DevTools settlers={colony.settlers || []} />

      {/* Future Features */}
      <Paper elevation={2} sx={{ p: isMobile ? 2 : 3, mt: isMobile ? 2 : 4, opacity: 0.6 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Hotel color="secondary" /> Lodging Upgrades (Coming Soon)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Future features: Upgrade beds to higher quality levels, build additional sleeping quarters, and manage sleep schedules.
        </Typography>
      </Paper>
    </Container>
  );
}

export default LodgingPage;