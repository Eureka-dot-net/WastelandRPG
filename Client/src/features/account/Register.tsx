import { VisibilityOff, Visibility } from "@mui/icons-material";
import { Container, Box, Alert, Button, CircularProgress, IconButton, Paper, TextField, Typography, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useAuth } from "../../lib/hooks/useAuth";
import { useAuthForm } from "../../lib/hooks/useForm";
import { useRegister } from "../../lib/hooks/useRegister";
import { useServers } from "../../lib/hooks/useServers";
import { Navigate, Link } from "react-router-dom";
import { useState } from "react";

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
  
  const [serverId, setServerId] = useState<string>('');
  const [colonyName, setColonyName] = useState<string>('');
  const registerMutation = useRegister();
  const { data: serversData, isLoading: serversLoading, error: serversError } = useServers();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleServerChange = (event: SelectChangeEvent) => {
    setServerId(event.target.value as string);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!email || !password || !serverId) return;
    registerMutation.mutate({ email, password, serverId, colonyName: colonyName.trim() || undefined });
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

            <FormControl fullWidth margin="normal" required>
              <InputLabel id="server-select-label">Server</InputLabel>
              <Select
                labelId="server-select-label"
                value={serverId}
                label="Server"
                onChange={handleServerChange}
                disabled={serversLoading}
              >
                {serversData?.servers.map((server) => (
                  <MenuItem key={server.id} value={server.id}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {server.name} ({server.type})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {server.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Colony Name (Optional)"
              placeholder="Enter a name for your colony"
              value={colonyName}
              onChange={(e) => setColonyName(e.target.value)}
              margin="normal"
              helperText="If left blank, your colony will be named 'First Colony'"
            />

            {serversError && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Failed to load servers. Please try again.
              </Alert>
            )}

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
              disabled={registerMutation.isPending || serversLoading || !serverId}
              sx={{ mt: 3, mb: 2 }}
            >
              {registerMutation.isPending && <CircularProgress size={20} sx={{ mr: 1 }} />}
              Create Colony
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