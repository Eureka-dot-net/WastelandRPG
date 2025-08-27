import React, { useState } from "react";

import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

// Resource Icons
import BuildIcon from '@mui/icons-material/Build'; // Scrap Metal
import NatureIcon from '@mui/icons-material/Nature'; // Wood

// Settler Icons
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'; // Busy
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement'; // Idle
import FavoriteIcon from "@mui/icons-material/Favorite"; // Morale

// Other Icons
import ShieldIcon from '@mui/icons-material/Shield'; // Shield
import VisibilityIcon from '@mui/icons-material/Visibility'; // Notoriety
import RestaurantIcon from '@mui/icons-material/Restaurant'; // Food
import WarningAmberIcon from "@mui/icons-material/WarningAmber"; // Alerts
import { Box, Badge, Typography, Tooltip, useMediaQuery, Drawer, IconButton, Divider, List, ListItem, ListItemButton, ListItemText, AppBar, Button, Toolbar } from "@mui/material";

type StatItemProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
  tooltip?: string;
  alert?: boolean;
};

const StatItem: React.FC<StatItemProps> = ({
  icon,
  label,
  value,
  color = '#ffffff',
  tooltip,
  alert = false,
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: 'fit-content',
        position: 'relative',
      }}
    >
      {alert && (
        <Badge
          color="error"
          variant="dot"
          sx={{
            '& .MuiBadge-badge': {
              top: 2,
              right: 2,
            }
          }}
        >
          <Box sx={{ color, fontSize: '1rem' }}>
            {icon}
          </Box>
        </Badge>
      )}
      {!alert && (
        <Box sx={{ color, fontSize: '1rem' }}>
          {icon}
        </Box>
      )}
      <Box sx={{ textAlign: 'center', minWidth: 32 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', lineHeight: 1 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1, color }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );

  return tooltip ? (
    <Tooltip title={tooltip} arrow>
      {content}
    </Tooltip>
  ) : content;
};

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Homestead", href: "/homestead" },
  { label: "Settlers", href: "/settlers" },
  { label: "Map", href: "/map" },
  { label: "Inventory", href: "/inventory" },
  { label: "Crafting", href: "/crafting" },
];

const DashboardTopBar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Example data - replace with actual game state
  const resources: StatItemProps[] = [
    {
      icon: <BuildIcon />,
      label: "Scrap",
      value: "247",
      color: "#9e9e9e",
    },
    {
      icon: <NatureIcon />,
      label: "Wood",
      value: "89",
      color: "#8d6e63",
    },
    {
      icon: <RestaurantIcon />,
      label: "Food",
      value: "12d",
      color: "#ffc107",
      tooltip: "12 days of food remaining",
    },
  ];

  const settlers: StatItemProps[] = [
    {
      icon: <SelfImprovementIcon />,
      label: "Idle",
      value: 3,
      color: "#2196f3",
    },
    {
      icon: <DirectionsRunIcon />,
      label: "Busy",
      value: 7,
      color: "#4caf50",
      tooltip: "Tasks: 3 Farming, 2 Crafting, 2 Patrolling",
    },
    {
      icon: <FavoriteIcon />,
      label: "Morale",
      value: "78%",
      color: "#e91e63",
    },
  ];

  const status: StatItemProps[] = [
    {
      icon: <ShieldIcon />,
      label: "Shield",
      value: "ON",
      color: "#4caf50",
      tooltip: "Defense systems active",
    },
    {
      icon: <VisibilityIcon />,
      label: "Notoriety",
      value: "Low",
      color: "#ff9800",
    },
    {
      icon: <WarningAmberIcon />,
      label: "Alerts",
      value: "2",
      color: "#f44336",
      alert: true,
      tooltip: "2 active alerts - click to view",
    },
  ];

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const renderMobileMenu = (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={handleMobileMenuClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          bgcolor: 'background.paper',
          border: '1px solid #333',
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            🧟 WASTELAND RPG
            {/* To do: Add colony name */}
          </Typography>
          <IconButton onClick={handleMobileMenuClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Resources in mobile menu */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Resources
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {resources.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>
        
        {/* Settlers in mobile menu */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Settlers
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {settlers.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>
        
        {/* Status in mobile menu */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Status
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {status.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Navigation in mobile menu */}
        <List>
          {NAV_ITEMS.map((item) => (
            <ListItem key={item.label} disablePadding>
              <ListItemButton
                component="a"
                href={item.href}
                onClick={handleMobileMenuClose}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                  },
                }}
              >
                <ListItemText 
                  primary={item.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={3}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid #333',
        }}
      >
        {/* Top Row - Title/Logo and Navigation */}
        <Box
          sx={{
            bgcolor: 'rgba(211, 47, 47, 0.1)',
            borderBottom: '1px solid rgba(211, 47, 47, 0.3)',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Title and hamburger for mobile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                letterSpacing: 1,
                textShadow: '0 0 10px rgba(211, 47, 47, 0.5)',
              }}
            >
              🧟 WASTELAND RPG
               {/* To do: Add colony name */}
            </Typography>
            {isMobile && (
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={handleMobileMenuToggle}
                sx={{ ml: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>
          {/* Navigation in top row - Desktop only */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.label}
                  href={item.href}
                  variant="text"
                  size="small"
                  sx={{
                    fontWeight: 600,
                    textTransform: 'none',
                    color: 'rgba(255,255,255,0.9)',
                    px: 2,
                    fontSize: '0.85rem',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Box>

        {/* Bottom Row - Stats and Navigation (desktop only) */}
        {!isMobile && (
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
            {/* Resources Section */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {resources.map((stat) => (
                <StatItem key={stat.label} {...stat} />
              ))}
            </Box>

            {/* Divider */}
            <Box sx={{ width: 1, height: 30, mx: 3 }} />

            {/* Settlers Section */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {settlers.map((stat) => (
                <StatItem key={stat.label} {...stat} />
              ))}
            </Box>

            {/* Divider */}
            <Box sx={{ width: 1, height: 30, mx: 3 }} />

            {/* Status Section */}
            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
              {status.map((stat) => (
                <StatItem key={stat.label} {...stat} />
              ))}
            </Box>
          </Toolbar>
        )}
      </AppBar>

      {/* Mobile Menu Drawer */}
      {renderMobileMenu}
    </>
  );
};

export default DashboardTopBar;