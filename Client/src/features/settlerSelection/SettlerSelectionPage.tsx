import React, { useState, useEffect } from 'react';

import DynamicIcon from '../../app/shared/components/DynamicIcon';
import { Security, Build, LocalHospital, Agriculture, Science, Star, Speed, Psychology, Shield, Person } from '@mui/icons-material';
import { Container, Box, CircularProgress, Alert, Paper, Typography, Card, CardContent, Grid, Divider, LinearProgress, Tooltip, Chip, CardActions, Button, Avatar } from '@mui/material';
import type { Settler } from '../../lib/types/settler';
import { useColony } from '../../lib/hooks/useColony';
import { useSettler } from '../../lib/hooks/useSettler';


interface SettlerSelectionProps {
  serverId?: string;
}

function SettlerSelection({ serverId = "server-1" }: SettlerSelectionProps) {
  console.log('settler selection loaded');
  const [selectedSettler, setSelectedSettler] = useState<Settler | null>(null);
  const [settlers, setSettlers] = useState<Settler[]>([]);
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
  const [settlerError, setSettlerError] = useState<string | null>(null);

  const { colony, colonyLoading, colonyError } = useColony(serverId);

  const { onboardSettler, selectSettler } = useSettler();

  useEffect(() => {
    console.log("colony: " + colony);
    const fetchSettlers = async () => {
      if (!colony) return;
      setIsOnboarding(true);
      try {
        //onboardSettler returns three settlers.
        const newSettlers: Settler[] = await onboardSettler.mutateAsync(colony._id);
        console.log("newSettlers: " + newSettlers);
        setSettlers(newSettlers);
      } catch (error) {
        console.error("Error onboarding settlers:", error);
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
        colonyId: colony._id,
        settlerId: settler._id
      }, {
        onError: (error) => {
          console.error("Error selecting settler:", error);
          setSettlerError("Failed to select settler. Please try again.");
        },
        onSuccess: (data) => {
          console.log("Settler selected successfully:", data);
          setSelectedSettler(data);
        }
      });
    }
  };

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
    if (value >= 8) return 'success';
    if (value >= 6) return 'warning';
    return 'error';
  };

  const getSkillColor = (value: number): string => {
    if (value >= 8) return '#4caf50';
    if (value >= 6) return '#ff9800';
    return '#d32f2f';
  };

  if (colonyLoading || (colony === undefined)) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress color="primary" />
        </Box>
      </Container>
    );
  }

  if (colonyError) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load colony data. Please try again.
        </Alert>
      </Container>
    );
  }

  if (isOnboarding || settlers.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              🔍 Recruiting Settlers...
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Searching the wasteland for survivors willing to join your colony...
            </Typography>
            <CircularProgress color="primary" size={60} />
          </Paper>
        </Box>
      </Container>
    );
  }

  if (selectedSettler) {
    return (
      <Container maxWidth="lg">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 600 }}>
            <Box textAlign="center" mb={3}>
              <Typography variant="h4" gutterBottom>
                🎉 Welcome to {colony.colonyName}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {selectedSettler.name} has joined your colony
              </Typography>
            </Box>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                {selectedSettler.name} is now part of your colony and ready to help you survive in the wasteland.
              </Typography>
            </Alert>

            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Person color="primary" />
                  <Typography variant="h5" color="primary">
                    {selectedSettler.name}
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {selectedSettler.backstory}
                </Typography>
              </CardContent>
            </Card>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 4 }}
                component="a"
                href="/assignments"
              >
                Continue
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

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
          {settlerError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {settlerError}
            </Alert>
          )}
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" gutterBottom>
              👥 Choose Your First Settler
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Three survivors have approached {colony.colonyName}. Choose wisely - they will be your foundation in the wasteland.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {settlers.map((settler) => (
              <Grid size={{ xs: 12, md: 4 }} key={settler._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Person color="primary" />
                      <Typography variant="h6" color="primary">
                        {settler.name}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: '80px' }}>
                      {settler.backstory}
                    </Typography>

                    <Divider sx={{ mb: 2 }} />

                    <Typography variant="subtitle1" color="text.primary" gutterBottom>
                      Core Stats
                    </Typography>
                    {Object.entries(settler.stats).map(([stat, value]) => (
                      <Box key={stat} mb={1.5}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getStatIcon(stat)}
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {stat}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color={`${getStatColor(value)}.main`}>
                            {value}/10
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(value / 10) * 100}
                          color={getStatColor(value)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle1" color="text.primary" gutterBottom>
                      Skills
                    </Typography>
                    {Object.entries(settler.skills)
                      .map(([skill, value]) => (
                        <Box key={skill} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getSkillIcon(skill)}
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {skill}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: getSkillColor(value) }}>
                            {value}
                          </Typography>
                        </Box>
                      ))}

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle1" color="text.primary" gutterBottom>
                      Traits
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
                      {settler.traits.map((trait) => (
                        <Tooltip
                          key={trait.traitId}
                          title={trait.description}
                          // You can add a custom cursor style here
                          sx={{ cursor: 'help' }}
                        >
                          <Box>
                            <Chip
                              avatar={<Avatar sx={{ width: 20, height: 20, bgcolor: 'transparent' }}><DynamicIcon name={trait.icon || 'GiQuestionMark'} /></Avatar>}
                              label={trait.traitId}

                              color={trait.type === "positive" ? "success" : "error"}
                              variant="outlined"
                              sx={{
                                borderRadius: 2,
                                bgcolor: trait.type === "positive" ? "#2a3d2a" : "#3d2a2a",
                                color: '#fff',
                                borderColor: trait.type === "positive" ? "#4a704a" : "#704a4a",
                                fontSize: '0.75rem',
                                height: 26,
                                '&:hover': {
                                  bgcolor: trait.type === "positive" ? "#3a4d3a" : "#4d3a3a",
                                  borderColor: trait.type === "positive" ? "#6a906a" : "#905a5a"
                                },
                                '& .MuiChip-avatar': { width: 20, height: 20 },
                              }}
                            />
                          </Box>
                        </Tooltip>
                      ))}
                    </Box>

                    <Typography variant="subtitle1" color="text.primary" gutterBottom>
                      Status
                    </Typography>
                    <Box display="flex" justifyContent="space-between" gap={2}>
                      <Typography variant="body2" color="text.secondary">
                        Health: {settler.health}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Morale: {settler.morale}%
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleSelectSettler(settler)}
                      sx={{
                        fontSize: '1rem',
                        fontWeight: 600
                      }}
                    >
                      Select {settler.name.split(' ')[0]}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default SettlerSelection;