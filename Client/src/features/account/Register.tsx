import { VisibilityOff, Visibility } from "@mui/icons-material";
import { Container, Box, Alert, Button, CircularProgress, IconButton, Paper, TextField, Typography } from "@mui/material";
import { useAuth } from "../../lib/hooks/useAuth";
import { useAuthForm } from "../../lib/hooks/useForm";
import { useRegister } from "../../lib/hooks/useRegister";
import { Navigate, Link } from "react-router-dom";

export default function Register() {
  const { isAuthenticated } = useAuth();
  const {
    email,
    password,
    showPassword,
    setEmail,
    setPassword,
    togglePasswordVisibility,
  } = useAuthForm();

  const registerMutation = useRegister();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!email || !password) return;
    registerMutation.mutate({ email, password });
  };
  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" gutterBottom>
              🧟 WASTELAND RPG
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Join the wasteland
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoFocus
            />
            
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <IconButton onClick={togglePasswordVisibility} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />

            {registerMutation.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {registerMutation.error?.message || 'Registration failed'}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={registerMutation.isPending}
              sx={{ mt: 3, mb: 2 }}
            >
              {registerMutation.isPending && <CircularProgress size={20} sx={{ mr: 1 }} />}
              Create Survivor
            </Button>

            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#d32f2f' }}>
                  Login here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};