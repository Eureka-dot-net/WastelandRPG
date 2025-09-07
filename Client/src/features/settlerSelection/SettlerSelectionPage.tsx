// File: src/components/settlers/SettlerSelection.tsx
import  { useState, useEffect } from 'react';
import { Container, Box, Paper, useTheme, useMediaQuery } from '@mui/material';
import { Navigate } from 'react-router-dom';
import type { Settler } from '../../lib/types/settler';
import { useColony } from '../../lib/hooks/useColony';
import { useSettler } from '../../lib/hooks/useSettler';
import ErrorDisplay from '../../app/shared/components/ui/ErrorDisplay';
import LoadingDisplay from '../../app/shared/components/ui/LoadingDisplay';
import PageHeader from '../../app/shared/components/ui/PageHeader';
import SuccessModal from '../../app/shared/components/ui/SuccessModal';
import SettlerGrid from '../settlers/SettlerGrid';
import { useServerContext } from '../../lib/contexts/ServerContext';


function SettlerSelection() {
  console.log('settler selection loaded');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedSettler, setSelectedSettler] = useState<Settler | null>(null);
  const [settlers, setSettlers] = useState<Settler[]>([]);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [settlerError, setSettlerError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);
  
  // Track selected interests for each settler
  const [settlerInterests, setSettlerInterests] = useState<Record<string, string[]>>({});
  
  const { currentServerId: serverId } = useServerContext();

  const { colony, colonyLoading, colonyError } = useColony(serverId);
  const colonyId = colony?._id ?? null;
  const { onboardSettler, selectSettler } = useSettler(serverId, colonyId);

  useEffect(() => {
    console.log("colony: " + colony);
    const fetchSettlers = async () => {
      if (!colony) return;
      setIsOnboarding(true);
      try {
        //onboardSettler returns three settlers.
        const newSettlers: Settler[] = await onboardSettler.mutateAsync();
        console.log("newSettlers: " + newSettlers);
        setSettlers(newSettlers);
        
        // Initialize interests state with existing interests from settlers
        const initialInterests: Record<string, string[]> = {};
        newSettlers.forEach(settler => {
          initialInterests[settler._id] = settler.interests || [];
        });
        setSettlerInterests(initialInterests);
        
      } catch (error) {
        console.error("Error onboarding settlers:", error);
        setSettlerError("Failed to load settlers. Please try again.");
      } finally {
        setIsOnboarding(false);
      }
    };

    if (colony && settlers.length === 0 && !isOnboarding) {
      fetchSettlers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colony]);

  const handleInterestToggle = (settlerId: string, interest: string) => {
    setSettlerInterests(prev => {
      const currentInterests = prev[settlerId] || [];
      const isSelected = currentInterests.includes(interest);
      
      if (isSelected) {
        // Remove interest
        return {
          ...prev,
          [settlerId]: currentInterests.filter(i => i !== interest)
        };
      } else {
        // Add interest if under limit
        if (currentInterests.length < 2) {
          return {
            ...prev,
            [settlerId]: [...currentInterests, interest]
          };
        }
      }
      
      return prev;
    });
  };

  const canSelectSettler = (settlerId: string) => {
    const interests = settlerInterests[settlerId] || [];
    return interests.length === 2;
  };

  const handleSelectSettler = (settler: Settler) => {
    if (colony) {
      const selectedInterests = settlerInterests[settler._id] || [];
      
      selectSettler.mutate({
        settlerId: settler._id,
        interests: selectedInterests
      }, {
        onError: (error) => {
          console.error("Error selecting settler:", error);
          setSettlerError("Failed to select settler. Please try again.");
        },
        onSuccess: (data) => {
          console.log("Settler selected successfully:", data);
          setSelectedSettler(data);
          setShowSuccessModal(true);
        }
      });
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
  };

  const handleModalContinue = () => {
    setShowSuccessModal(false);
    setShouldNavigate(true);
  };

  // Handle navigation after modal is closed
  if (shouldNavigate) {
    return <Navigate to="/quests" replace />;
  }

  // Loading state for colony
  if (colonyLoading || (colony === undefined)) {
    return (
      <LoadingDisplay 
        showContainer={true}
        minHeight="50vh"
      />
    );
  }

  // Error state for colony
  if (colonyError) {
    return (
      <ErrorDisplay 
        error="Failed to load colony data. Please try again."
        showContainer={true}
      />
    );
  }

  // Loading state for settlers
  if (isOnboarding || settlers.length === 0) {
    return (
      <LoadingDisplay 
        title="Recruiting Settlers..."
        subtitle="Searching the wasteland for survivors willing to join your colony..."
        emoji="🔍"
        showContainer={true}
        showPaper={true}
        minHeight="60vh"
      />
    );
  }

  // Main settler selection state
  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        minHeight="100vh"
        py={isMobile ? 2 : 4}
      >
        <Paper elevation={3} sx={{ p: isMobile ? 2 : 4, width: '100%' }}>
          <ErrorDisplay error={settlerError} sx={{ mb: 2 }} />
          
          <PageHeader
            title="Choose Your First Settler"
            subtitle={`Three survivors have approached ${colony.colonyName}. Choose wisely - they will be your foundation in the wasteland.`}
            emoji="👥"
            textAlign="center"
            marginBottom={4}
          />

          <SettlerGrid
            settlers={settlers}
            actions={[
              {
                label: (settler: Settler) => {
                  const canSelect = canSelectSettler(settler._id);
                  const interests = settlerInterests[settler._id] || [];
                  
                  if (selectSettler.isPending) return 'Selecting...';
                  if (!canSelect) return `Select Interests (${interests.length}/2)`;
                  return `Select ${settler.name.split(' ')[0]}`;
                },
                onClick: handleSelectSettler,
                variant: 'contained',
                color: 'primary',
                disabled: (settler: Settler) => selectSettler.isPending || !canSelectSettler(settler._id)
              }
            ]}
            gridSizes={{ xs: 12, md: 4 }}
            showFullWidthActions={true}
            selectedInterests={settlerInterests}
            onInterestToggle={handleInterestToggle}
            maxInterests={2}
            showInterestSelection={true}
          />
        </Paper>
      </Box>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onClose={handleModalClose}
        title={`Welcome to ${colony.colonyName}!`}
        subtitle={selectedSettler ? `${selectedSettler.name} has joined your colony` : ''}
        successMessage={selectedSettler ? `${selectedSettler.name} is now part of your colony and ready to help you survive in the wasteland.` : ''}
        entityName={selectedSettler?.name || ''}
        entityDescription={selectedSettler?.backstory}
        continueButtonText="Continue"
        onContinue={handleModalContinue}
        emoji="🎉"
      />
    </Container>
  );
};

export default SettlerSelection;