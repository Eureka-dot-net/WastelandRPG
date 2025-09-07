import React, { useState, useMemo, type ReactElement, useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";

import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";

import BuildIcon from '@mui/icons-material/Build'; // Scrap Metal
import NatureIcon from '@mui/icons-material/Nature'; // Wood

import SelfImprovementIcon from '@mui/icons-material/SelfImprovement'; // Idle
import ShieldIcon from '@mui/icons-material/Shield'; // Shield
import VisibilityIcon from '@mui/icons-material/Visibility'; // Notoriety
import WarningAmberIcon from "@mui/icons-material/WarningAmber"; // Alerts
import HomeIcon from '@mui/icons-material/Home';
import FeedIcon from '@mui/icons-material/Feed'; // Events
import { Box, Typography, Tooltip, useMediaQuery, Drawer, IconButton, Divider, List, ListItem, ListItemButton, ListItemText, AppBar, Button, Toolbar, Paper, type SvgIconProps } from "@mui/material";
import { useColony } from "../../lib/hooks/useColony";
import { useServerContext } from "../../lib/contexts/ServerContext";
import ServerSelector from "../../components/ServerSelector/ServerSelector";
import { useAuth } from "../../lib/hooks/useAuth";

import { GiCorn, GiCrownedSkull, GiHeartBeats, GiHorseshoe, GiPerson, GiRunningNinja, GiShieldEchoes, GiWoodStick, GiChest, GiBackpack } from "react-icons/gi";

type StatItemProps = {
  icon: ReactElement<SvgIconProps>;
  label: string;
  value: string | number;
  color?: string;
  tooltip?: string;
};

const StatItem: React.FC<StatItemProps> = ({
  icon,
  label,
  value,
  color = 'text.primary',
  tooltip,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        gap: isMobile ? 0 : 0.3,
        px: isMobile ? 1 : 1.5,
        py: 0.3,
        fontSize: isMobile ? '0.75rem' : '0.85rem',
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: 'fit-content',
        position: 'relative',
        '&:hover': {
          bgcolor: 'rgba(255,255,255,0.08)',
        }
      }}
    >
      <Box sx={{
        color,
        fontSize: isMobile ? '0.9rem' : '1.1rem',
        lineHeight: 1,
      }}>
        {React.isValidElement(icon) ? React.cloneElement(icon, { fontSize: 'inherit' }) : icon}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          color,
          lineHeight: 1.2,
          fontSize: isMobile ? '0.75rem' : undefined,
          mt: { xs: 0, sm: 0 },
          mb: { xs: 0.3, sm: 0.3 }
        }}
      >
        {value}
      </Typography>
      {isMobile && (
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.6rem',
            lineHeight: 1,
            color: 'text.secondary',
            textAlign: 'center',
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );

  // On mobile, don't use tooltip since labels are shown
  if (isMobile) {
    return content;
  }

  return (
    <Tooltip title={tooltip || `${value} ${label}`} arrow>
      {content}
    </Tooltip>
  );
};

const DashboardTopBar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation(); 
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const { logout } = useAuth();

  // Get current server from context
  const { currentServerId } = useServerContext();

  // Reset navigatingTo when route changes
  useEffect(() => {
    if (navigatingTo && location.pathname === navigatingTo) {
      setNavigatingTo(null);
    }
  }, [location.pathname, navigatingTo]);

  // Get dynamic colony data for current server
  const { colony, colonyLoading } = useColony(currentServerId || undefined);
  
  // Use colony data from context if available, fallback to API data
  const displayColony = colony;

  // Dynamic navigation based on unlocked features
  const NAV_ITEMS = useMemo(() => {
    if (!displayColony) return [];

    const baseItems = [
      { label: "Assignments", href: "/assignments", icon: <WarningAmberIcon /> },
      { label: "Events", href: "/events", icon: <FeedIcon /> },
    ];

    const conditionalItems = [
      { label: "Homestead", href: "/homestead", condition: displayColony.unlocks.homestead, icon: <HomeIcon /> },
      { label: "Settlers", href: "/settlers", condition: displayColony.settlerCount > 0, icon: <SelfImprovementIcon /> },
      { label: "Map", href: "/map", condition: displayColony.unlocks.map, icon: <VisibilityIcon /> },
      { label: "Inventory", href: "/inventory", condition: displayColony.unlocks.inventory, icon: <BuildIcon /> },
      { label: "Crafting", href: "/crafting", condition: displayColony.unlocks.crafting, icon: <BuildIcon /> },
      { label: "Lodgings", href: "/lodgings", condition: displayColony.unlocks.lodgings, icon: <HomeIcon /> },
      { label: "Farming", href: "/farming", condition: displayColony.unlocks.farming, icon: <NatureIcon /> },
      { label: "Defence", href: "/defence", condition: displayColony.unlocks.defence, icon: <ShieldIcon /> },
    ];

    return [
      ...baseItems,
      ...conditionalItems.filter(item => item.condition)
    ];
  }, [displayColony]);

  // Calculate dynamic settler stats
  const settlerStats = useMemo(() => {
    if (!displayColony?.settlers) return { idle: 0, busy: 0, lowMorale: 0, carrying: 0, total: 0 };

    const idle = displayColony.settlers.filter(s => s.status === "idle").length;
    const busy = displayColony.settlers.filter(s => s.status !== "idle").length;
    const lowMorale = displayColony.settlers.filter(s => (s.morale || 0) < 60).length;
    const carrying = displayColony.settlers.filter(s => s.carry && s.carry.length > 0).length;

    return { idle, busy, lowMorale, carrying, total: displayColony.settlers.length };
  }, [displayColony?.settlers]);

  // Get notoriety color
  const getNotorietyColor = (notoriety: number) => {
    if (notoriety <= 10) return "success.main";
    if (notoriety <= 25) return "success.light";
    if (notoriety <= 50) return "warning.main";
    if (notoriety <= 75) return "error.light";
    return "error.main";
  };

  // Get low morale color
  const getLowMoraleColor = (count: number) => {
    return count > 0 ? "error.main" : "success.main";
  };

  // Get carrying color
  const getCarryingColor = (count: number) => {
    return count > 0 ? "warning.main" : "text.secondary";
  };

  // Create unified stats array
  const allStats = useMemo(() => {
    if (!displayColony) return { resources: [], settlers: [], status: [] };

    const resources: StatItemProps[] = [
      {
        icon: <GiHorseshoe fontSize="inherit" />,
        label: "Scrap",
        value: displayColony.scrapMetal || 0,
        color: "text.secondary",
      },
      {
        icon: <GiWoodStick fontSize="inherit" />,
        label: "Wood",
        value: displayColony.wood || 0,
        color: "success.main",
      },
      {
        icon: <GiCorn fontSize="inherit" />,
        label: "Food",
        value: `${displayColony.daysFood || 0}d`,
        color: "warning.main",
        tooltip: `${displayColony.daysFood || 0} days of food remaining`,
      },
      {
        icon: <GiChest fontSize="inherit" />,
        label: "Inventory",
        value: `${displayColony.currentInventoryStacks || 0}/${displayColony.maxInventory || 0}`,
        color: "info.main",
        tooltip: `${displayColony.currentInventoryStacks || 0} stacks used of ${displayColony.maxInventory || 0} maximum`,
      },
    ];

    const settlers: StatItemProps[] = [
      {
        icon: <GiPerson fontSize="inherit" />,
        label: "Idle",
        value: settlerStats.idle,
        color: "info.main",
      },
      {
        icon: <GiRunningNinja fontSize="inherit" />,
        label: "Busy",
        value: settlerStats.busy,
        color: "success.main",
        tooltip: settlerStats.busy > 0 ? `${settlerStats.busy} settlers working on tasks` : "No settlers currently working",
      },
      {
        icon: <GiHeartBeats fontSize="inherit" />,
        label: "Low Morale",
        value: settlerStats.lowMorale,
        color: getLowMoraleColor(settlerStats.lowMorale),
        tooltip: settlerStats.lowMorale > 0 
          ? `${settlerStats.lowMorale} settlers have morale below 60` 
          : "All settlers have good morale",
      },
      {
        icon: <GiBackpack fontSize="inherit" />,
        label: "Carrying",
        value: settlerStats.carrying,
        color: getCarryingColor(settlerStats.carrying),
        tooltip: settlerStats.carrying > 0 
          ? `${settlerStats.carrying} settlers are carrying items` 
          : "No settlers carrying items",
      },
    ];

    const status: StatItemProps[] = [
      {
        icon: <GiShieldEchoes fontSize="inherit" />,
        label: "Shield",
        value: "On",
        color: "success.main",
        tooltip: "Shield active"
      },
      {
        icon: <GiCrownedSkull fontSize="inherit" />,
        label: "Notoriety",
        value: displayColony.notoriety || 0,
        color: getNotorietyColor(displayColony.notoriety || 0),
        tooltip: `Notoriety level: ${displayColony.notoriety || 0}/100`,
      },
    ];

    return { resources, settlers, status };
  }, [displayColony, settlerStats]);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleNavigation = (href: string) => {
    setNavigatingTo(href);
    navigate(href);
    handleMobileMenuClose(); // Close mobile menu if open
  };

  if (colonyLoading || !currentServerId) {
    return (
      <AppBar position="fixed" elevation={3} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #333' }}>
        <Toolbar>
          <Typography variant="h6">Loading...</Typography>
        </Toolbar>
      </AppBar>
    );
  }

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
          </Typography>
          <IconButton onClick={handleMobileMenuClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Server Selector in mobile menu */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Current Server
          </Typography>
          <ServerSelector isMobile={true} />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Navigation in mobile menu */}
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Navigation
        </Typography>
        <List sx={{ pt: 0 }}>
          {NAV_ITEMS.map((item) => {
            const isNavigating = navigatingTo === item.href;
            return (
              <ListItem key={item.label} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.href)}
                  disabled={isNavigating}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'white',
                    },
                  }}
                >
                  <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </Box>
                  <ListItemText
                    primary={isNavigating ? 'Loading...' : item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: 600,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}

          <Divider sx={{ mb: 2 }} />
          
          {/* Logout Button */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleMobileMenuClose();
                logout();
              }}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.main',
                  color: 'white',
                },
              }}
            >
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                <LogoutIcon />
              </Box>
              <ListItemText
                primary="Logout"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontWeight: 600,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );

  const renderStats = () => {
    if (isMobile) {
      // Mobile: Single scrollable row
      const allStatsFlat = [...allStats.resources, ...allStats.settlers, ...allStats.status];
      
      return (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 0,
            py: 0.75,
            px: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            overflow: 'auto',
          }}
        >
          {allStatsFlat.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Paper>
      );
    }

    // Desktop: Horizontal toolbar with sections
    return (
      <Toolbar sx={{ minHeight: { xs: 48, sm: 46 }, px: 1, gap: 0.5, display: 'flex' }}>
        {/* Resources Section - Left */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {allStats.resources.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>

        {/* Settlers Section - Center */}
        <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1, justifyContent: 'center' }}>
          {allStats.settlers.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>

        {/* Status Section - Right */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {allStats.status.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>
      </Toolbar>
    );
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={3}
        sx={{
          bgcolor: 'black',
          borderBottom: '1px solid #333',
        }}
      >
        {/* Header Section */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 0,
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Title and Server Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
              }}
            >
              🧟 WASTELAND RPG
            </Typography>
            {!isMobile && <ServerSelector />}
          </Box>

          {/* Right side - Navigation or Hamburger */}
          {isMobile ? (
            <IconButton
              color="primary"
              aria-label="menu"
              onClick={handleMobileMenuToggle}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {NAV_ITEMS.map((item) => {
                const isNavigating = navigatingTo === item.href;
                return (
                  <Button
                    key={item.label}
                    onClick={() => handleNavigation(item.href)}
                    variant="outlined"
                    size="small"
                    startIcon={item.icon}
                    disabled={isNavigating}
                    sx={{
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: 'text.primary',
                      '&:hover': {
                        bgcolor: 'primary.main',
                        borderColor: 'primary.main',
                        color: 'white',
                      },
                    }}
                  >
                    {isNavigating ? 'Loading...' : item.label}
                  </Button>
                );
              })}
              
              {/* Logout Button */}
              <Button
                onClick={logout}
                variant="outlined"
                size="small"
                startIcon={<LogoutIcon />}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  borderColor: 'error.main',
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: 'error.main',
                    borderColor: 'error.main',
                    color: 'white',
                  },
                }}
              >
                Logout
              </Button>
            </Box>
          )}
        </Paper>

        {/* Stats Section - Unified for mobile and desktop */}
        {renderStats()}
      </AppBar>

      {/* Mobile Menu Drawer */}
      {renderMobileMenu}
    </>
  );
};

// Dashboard Layout Component that includes top bar and content area
const DashboardLayout: React.FC = () => {
  return (
    <>
      <DashboardTopBar />
      {/* Content area with proper spacing below the fixed AppBar */}
      <Box component="main" sx={{ pt: { xs: '140px', md: '120px' }, minHeight: '100vh' }}>
        <Outlet />
      </Box>
    </>
  );
};

export default DashboardLayout;