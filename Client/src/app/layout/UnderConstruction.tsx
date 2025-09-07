import {
  Build, ArrowBack, Schedule, Code, Settings
} from "@mui/icons-material";
import {
  Container, Paper, Typography, Alert, Box, Button, Card, CardContent, 
  Grid, Chip, LinearProgress, Avatar
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  featureName?: string;
  expectedCompletion?: string;
}

function UnderConstructionPage({ featureName, expectedCompletion }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract feature name from URL if not provided as prop
  const getFeatureFromPath = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    
    // Convert kebab-case to Title Case
    return lastSegment
      ?.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Feature';
  };

  const displayFeatureName = featureName || getFeatureFromPath();

  const constructionSteps = [
    { name: "Design Planning", status: "completed", icon: <Code /> },
    { name: "Core Development", status: "in-progress", icon: <Build /> },
    { name: "UI Implementation", status: "pending", icon: <Settings /> },
    { name: "Testing & Polish", status: "pending", icon: <Settings /> }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in-progress": return "warning";
      case "pending": return "default";
      default: return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "✓";
      case "in-progress": return "⚡";
      case "pending": return "⏳";
      default: return "❓";
    }
  };

  const completedSteps = constructionSteps.filter(step => step.status === "completed").length;
  const progress = (completedSteps / constructionSteps.length) * 100;

  return (
    <Container maxWidth="lg">
      {/* Main Construction Notice */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Avatar sx={{ bgcolor: 'warning.main', width: 64, height: 64 }}>
            <Build fontSize="large" />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" gutterBottom sx={{ color: 'warning.main' }}>
              🚧 {displayFeatureName} Under Construction
            </Typography>
            <Typography variant="h6" color="text.secondary">
              This feature is currently being built by our wasteland engineers.
            </Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          The {displayFeatureName.toLowerCase()} feature is not yet available. Our settlers are working hard to get it ready for you!
          {expectedCompletion && ` Expected completion: ${expectedCompletion}`}
        </Alert>

        {/* Progress Bar */}
        <Box sx={{ mt: 3 }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">Development Progress</Typography>
            <Typography variant="body2" color="text.secondary">{Math.round(progress)}% Complete</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            color="warning" 
            sx={{ height: 8, borderRadius: 4 }} 
          />
        </Box>
      </Paper>

      {/* Construction Timeline */}
      <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
        Development Timeline
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {constructionSteps.map((step, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card sx={{
              height: '100%',
              border: step.status === 'in-progress' ? '2px solid orange' : '1px solid #333',
              opacity: step.status === 'pending' ? 0.7 : 1
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ color: step.status === 'completed' ? 'success.main' : 
                            step.status === 'in-progress' ? 'warning.main' : 'text.secondary', mb: 2 }}>
                  {step.icon}
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  {step.name}
                </Typography>
                
                <Chip 
                  label={getStatusIcon(step.status) + " " + step.status.replace('-', ' ').toUpperCase()}
                  color={getStatusColor(step.status)}
                  variant={step.status === 'in-progress' ? 'filled' : 'outlined'}
                  size="small"
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Fun Wasteland Message */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Schedule color="success" /> Meanwhile in the Wasteland...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          While we build this feature, here are some things you can do:
        </Typography>
        <Box component="ul" sx={{ color: 'text.secondary', pl: 3 }}>
          <li>Complete more cleanup assignments to unlock additional areas</li>
          <li>Manage your settlers and optimize their task assignments</li>
          <li>Explore other available features in your homestead</li>
          <li>Check back soon - construction moves fast in the wasteland!</li>
        </Box>
      </Paper>

      {/* Navigation */}
      <Box display="flex" gap={2}>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ fontWeight: 600 }}
        >
          Go Back
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/quests')}
          sx={{ fontWeight: 600 }}
        >
          Return to Quests
        </Button>
      </Box>

      {/* Footer Message */}
      <Paper elevation={1} sx={{ p: 2, mt: 4, opacity: 0.8, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          💡 <strong>Tip:</strong> Bookmark this page and check back regularly for updates on the {displayFeatureName.toLowerCase()} feature!
        </Typography>
      </Paper>
    </Container>
  );
};

export default UnderConstructionPage;