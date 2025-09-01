// File: src/components/settlers/SettlerSelection.tsx
import  { useState, useEffect } from 'react';
import { Container, Box, Paper } from '@mui/material';
import { Navigate } from 'react-router-dom';
import type { Settler } from '../../lib/types/settler';
import { useColony } from '../../lib/hooks/useColony';
import { useSettler } from '../../lib/hooks/useSettler';
import ErrorDisplay from '../../app/shared/components/ui/ErrorDisplay';
import LoadingDisplay from '../../app/shared/components/ui/LoadingDisplay';
import PageHeader from '../../app/shared/components/ui/PageHeader';
import SuccessModal from '../../app/shared/components/ui/SuccessModal';
import SettlerGrid from '../settlers/SettlerGrid';



interface SettlerSelectionProps {
  serverId?: string;
}

function SettlerSelection({ serverId = "server-1" }: SettlerSelectionProps) {
  console.log('settler selection loaded');
  const [selectedSettler, setSelectedSettler] = useState<Settler | null>(null);
  const [settlers, setSettlers] = useState<Settler[]>([]);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [settlerError, setSettlerError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(false);

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

  const handleSelectSettler = (settler: Settler) => {
    if (colony) {
      selectSettler.mutate({
        settlerId: settler._id
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
    return <Navigate to="/assignments" replace />;
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
    <Container maxWidth="lg">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        minHeight="100vh"
        py={4}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
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
                label: (settler: Settler) => selectSettler.isPending ? 'Selecting...' : `Select ${settler.name.split(' ')[0]}`,
                onClick: handleSelectSettler,
                variant: 'contained',
                color: 'primary',
                disabled: selectSettler.isPending
              }
            ]}
            gridSizes={{ xs: 12, md: 4 }}
            showFullWidthActions={true}
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