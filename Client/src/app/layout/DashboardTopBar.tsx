import React, { useState, useMemo, type ReactElement } from "react";

import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";


import BuildIcon from '@mui/icons-material/Build'; // Scrap Metal
import NatureIcon from '@mui/icons-material/Nature'; // Wood

import SelfImprovementIcon from '@mui/icons-material/SelfImprovement'; // Idle
import ShieldIcon from '@mui/icons-material/Shield'; // Shield
import VisibilityIcon from '@mui/icons-material/Visibility'; // Notoriety
import WarningAmberIcon from "@mui/icons-material/WarningAmber"; // Alerts
import HomeIcon from '@mui/icons-material/Home';
import { Box, Badge, Typography, Tooltip, useMediaQuery, Drawer, IconButton, Divider, List, ListItem, ListItemButton, ListItemText, AppBar, Button, Toolbar, Paper, type SvgIconProps } from "@mui/material";
import { useColony } from "../../lib/hooks/useColony";

import { GiCorn, GiCrownedSkull, GiHeartBeats, GiHorseshoe,  GiPerson, GiRunningNinja, GiShieldEchoes, GiWoodStick } from "react-icons/gi";

type StatItemProps = {
   icon: ReactElement<SvgIconProps>;
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
  color = 'text.primary',
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
        fontSize: '0.85rem',
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
      {alert && (
        <Badge
          color="error"
          variant="dot"
          sx={{
            '& .MuiBadge-badge': {
              top: 1,
              right: 2,
            }
          }}
        >
          <Box sx={{ color, fontSize: '0.9rem' }}>
             {React.isValidElement(icon) ? React.cloneElement(icon, { fontSize: 'inherit' }) : icon}
          </Box>
        </Badge>
      )}
      {!alert && (
        <Box sx={{ color, fontSize: '1.1rem' }}>
           {icon}
        </Box>
      )}
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color, lineHeight: 1.2 }}>
          {value}
        </Typography>
       
      </Box>
    </Box>
  );

  return  (
    <Tooltip title={tooltip || value + ' ' + label} arrow>
      {content}
    </Tooltip>
  );
};

type Props = {
  serverId?: string;
}

const DashboardTopBar: React.FC<Props> = ({ serverId = "server-1" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get dynamic colony data
  const { colony, colonyLoading } = useColony(serverId);

  // Dynamic navigation based on unlocked features
  const NAV_ITEMS = useMemo(() => {
    if (!colony) return [];

    const baseItems = [
      { label: "Assignments", href: "/assignments", icon: <WarningAmberIcon /> },
    ];

    const conditionalItems = [
      { label: "Homestead", href: "/homestead", condition: colony.homeUnlocked, icon: <HomeIcon /> },
      { label: "Settlers", href: "/settlers", condition: colony.hasSettlers, icon: <SelfImprovementIcon /> },
      { label: "Map", href: "/map", condition: colony.mapUnlocked, icon: <VisibilityIcon /> },
      { label: "Inventory", href: "/inventory", condition: true, icon: <BuildIcon /> },
      { label: "Crafting", href: "/crafting", condition: colony.craftingUnlocked, icon: <BuildIcon /> },
      { label: "Sleeping Quarters", href: "/sleeping-quarters", condition: colony.sleepingQuartersUnlocked, icon: <HomeIcon /> },
      { label: "Farming", href: "/farming", condition: colony.farmingUnlocked, icon: <NatureIcon /> },
      { label: "Defence", href: "/defence", condition: colony.defenceUnlocked, icon: <ShieldIcon /> },
    ];

    return [
      ...baseItems,
      ...conditionalItems.filter(item => item.condition)
    ];
  }, [colony]);

  // Calculate dynamic settler stats
  const settlerStats = useMemo(() => {
    if (!colony?.settlers) return { idle: 0, busy: 0, averageMorale: 0, total: 0 };

    const idle = colony.settlers.filter(s => s.status === "idle").length;
    const busy = colony.settlers.filter(s => s.status !== "idle").length;
    const totalMorale = colony.settlers.reduce((sum, s) => sum + (s.morale || 0), 0);
    const averageMorale = colony.settlers.length > 0 ? Math.round(totalMorale / colony.settlers.length) : 0;

    return { idle, busy, averageMorale, total: colony.settlers.length };
  }, [colony?.settlers]);

  // Get notoriety color
  const getNotorietyColor = (notoriety: number) => {
    if (notoriety <= 10) return "success.main";
    if (notoriety <= 25) return "success.light";
    if (notoriety <= 50) return "warning.main";
    if (notoriety <= 75) return "error.light";
    return "error.main";
  };

  // Get morale color
  const getMoraleColor = (morale: number) => {
    if (morale >= 70) return "success.main";
    if (morale >= 40) return "warning.main";
    return "error.main";
  };

  // Example resources - you'd replace this with actual inventory data
  const resources: StatItemProps[] = [
    {
      icon: <GiHorseshoe fontSize="inherit" />,
      label: "Scrap",
      value: colony?.scrapMetal || 0, // This would come from inventory
      color: "text.secondary",
    },
    {
      icon: <GiWoodStick fontSize="inherit"  />,
      label: "Wood",
      value: colony?.wood || 0, // This would come from inventory
      color: "success.main",
    },
    {
      icon: <GiCorn fontSize="inherit"  />,
      label: "Food",
      value: colony?.daysFood || 0 + "d",
      color: "warning.main",
      tooltip: "12 days of food remaining",
    },
  ];

  const settlers: StatItemProps[] = [
    {
      icon: <GiPerson  fontSize="inherit"  />,
      label: "Idle",
      value: settlerStats.idle,
      color: "info.main",
    },
    {
      icon: <GiRunningNinja fontSize="inherit"  />,
      label: "Busy",
      value: settlerStats.busy,
      color: "success.main",
      tooltip: settlerStats.busy > 0 ? `${settlerStats.busy} settlers working on tasks` : "No settlers currently working",
    },
    {
      icon: <GiHeartBeats fontSize="inherit"  />,
      label: "Morale",
      value: `${settlerStats.averageMorale}%`,
      color: getMoraleColor(settlerStats.averageMorale),
    },
  ];

  const status: StatItemProps[] = [
    {
      icon: <GiShieldEchoes fontSize="inherit"  />,
      label: "Shield",
      value: "On",
      color: "success.main",
      tooltip: "Shield active"
    },
    {
      icon: <GiCrownedSkull fontSize="inherit"  />,
      label: "Notoriety",
      value: colony?.notoriety || 0,
      color: getNotorietyColor(colony?.notoriety || 0),
      tooltip: `Notoriety level: ${colony?.notoriety || 0}/100`,
    },
  ];

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  if (colonyLoading) {
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
            🧟 WASTELAND RPG {colony?.colonyName || "🧟 WASTELAND RPG"}
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
          Settlers ({settlerStats.total})
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
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Navigation
        </Typography>
        <List sx={{ pt: 0 }}>
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
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
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
        {/* Header Section */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(211, 47, 47, 0.1)',
            border: '1px solid rgba(211, 47, 47, 0.3)',
            borderRadius: 0,
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
              }}
            >
              🧟 WASTELAND RPG
            </Typography>
            {isMobile && (
              <IconButton
                color="primary"
                aria-label="menu"
                onClick={handleMobileMenuToggle}
                sx={{ ml: 'auto' }}
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
                  variant="outlined"
                  size="small"
                  startIcon={item.icon}
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
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Paper>

        {/* Stats Row - Desktop only */}
        {!isMobile && (
          <Toolbar sx={{ minHeight: { xs: 48, sm: 56 }, px: 1, gap: 1, display: 'flex' }}>
            {/* Resources Section - Left */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {resources.map((stat) => (
                <StatItem key={stat.label} {...stat} />
              ))}
            </Box>

            {/* Settlers Section - Center */}
            <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, justifyContent: 'center' }}>
              {settlers.map((stat) => (
                <StatItem key={stat.label} {...stat} />
              ))}
            </Box>

            {/* Status Section - Right */}
            <Box sx={{ display: 'flex', gap: 2 }}>
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