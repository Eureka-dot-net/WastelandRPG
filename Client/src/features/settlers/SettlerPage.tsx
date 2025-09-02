import { useState } from "react";
import {
  Container, Grid, useTheme, useMediaQuery
} from "@mui/material";

import { useColony } from "../../lib/hooks/useColony";
import { useSettler } from "../../lib/hooks/useSettler";
import { useServerContext } from "../../lib/contexts/ServerContext";
import type { Settler } from "../../lib/types/settler";
import SettlerGrid from "./SettlerGrid";
import ErrorDisplay from "../../app/shared/components/ui/ErrorDisplay";
import LoadingDisplay from "../../app/shared/components/ui/LoadingDisplay";
import ProgressHeader from "../../app/shared/components/ui/ProgressHeader";

function SettlerPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentServerId: serverId } = useServerContext();
  const [isLoading, setIsLoading] = useState(false);

  const { colony, colonyLoading } = useColony(serverId);
  const colonyId = colony?._id;
  const { rejectSettler } = useSettler(serverId, colonyId);

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
  const activeSettlers = settlers.filter(s => s.status !== "resting").length;

  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 0 : 2 }}>
      <ProgressHeader
        title="Colony Settlers"
        emoji="👥"
        alertMessage={
          totalSettlers === 0 
            ? "Your colony has no settlers yet. Recruit your first settler to begin building your wasteland community." 
            : `Managing ${totalSettlers} settler${totalSettlers !== 1 ? 's' : ''} in your colony.`
        }
        alertSeverity={totalSettlers === 0 ? "warning" : "info"}
        progressLabel="Active Settlers"
        currentValue={activeSettlers}
        totalValue={totalSettlers}
        progressColor="secondary"
      />

      {/* Settlers Grid */}
      {totalSettlers === 0 ? (
        <LoadingDisplay
          title="No Settlers"
          subtitle="Your colony doesn't have any settlers yet. Complete the settler selection process to begin recruiting survivors."
          emoji="🏜️"
          showContainer={false}
          showPaper={true}
          minHeight="40vh"
        />
      ) : (
        <Grid container spacing={isMobile ? 1.5 : 3}>
          <Grid size={12}>
            <SettlerGrid
              settlers={settlers}
              actions={[
                {
                  label: () => 
                    rejectSettler.isPending || isLoading ? 'Banishing...' : 'Banish',
                  onClick: handleBanishSettler,
                  variant: 'outlined',
                  color: 'error',
                  disabled: rejectSettler.isPending || isLoading
                }
              ]}
              gridSizes={{ xs: 12, sm: 6, md: 4 }}
              showFullWidthActions={false}
            />
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default SettlerPage;