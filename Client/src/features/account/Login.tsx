import { Container, Box, Paper, Typography, TextField, Button, CircularProgress, IconButton, Alert } from "@mui/material";
import { Link, Navigate } from "react-router-dom";
import { useLogin } from "../../lib/hooks/useLogin";
import { useAuth } from "../../lib/hooks/useAuth";
import { useAuthForm } from "../../lib/hooks/useForm";
import { Visibility, VisibilityOff, } from "@mui/icons-material";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const {
    email,
    password,
    showPassword,
    setEmail,
    setPassword,
    togglePasswordVisibility,
  } = useAuthForm();

  const loginMutation = useLogin();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
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
              Welcome back, survivor
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

            {loginMutation.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {loginMutation.error.message || 'Login failed'}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loginMutation.isPending}
              sx={{ mt: 3, mb: 2 }}
            >
              {loginMutation.isPending && <CircularProgress size={20} sx={{ mr: 1 }} />}
              Enter Wasteland
            </Button>

            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                New survivor?{' '}
                <Link to="/register" style={{ color: '#4caf50' }}>
                  Register here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};