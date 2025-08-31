import { Box, Container, CssBaseline } from '@mui/material'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
function App() {

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <ScrollRestoration />
      <CssBaseline />

          <Container maxWidth='xl' sx={{ minHeight: '100vh' }}>
            <ToastContainer />
            <Outlet />
          </Container>
    </Box>
  )
}

export default App
