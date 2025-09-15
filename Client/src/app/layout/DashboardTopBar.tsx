import React, { useState, useMemo, type ReactElement, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";

import BuildIcon from '@mui/icons-material/Build';
import NatureIcon from '@mui/icons-material/Nature';

import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import ShieldIcon from '@mui/icons-material/Shield';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HomeIcon from '@mui/icons-material/Home';
import FeedIcon from '@mui/icons-material/Feed';
import { 
  Box, Typography, Tooltip, useMediaQuery, Drawer, IconButton, Divider, 
  List, ListItem, ListItemButton, ListItemText, AppBar, Button, Toolbar, 
  Paper, Collapse, LinearProgress, type SvgIconProps 
} from "@mui/material";
import { useColony } from "../../lib/hooks/useColony";
import { useServerContext } from "../../lib/contexts/ServerContext";
import ServerSelector from "../../components/ServerSelector/ServerSelector";
import { useAuth } from "../../lib/hooks/useAuth";

import { GiCorn, GiCrownedSkull, GiHeartBeats, GiHorseshoe, GiPerson, GiRunningNinja, GiShieldEchoes, GiWoodStick, GiChest, GiBackpack } from "react-icons/gi";
import { BatteryFull } from '@mui/icons-material';
import type { Settler } from "../../lib/types/settler";

type StatItemProps = {
  icon: ReactElement<SvgIconProps>;
  label: string;
  value: string | number;
  color?: string;
  tooltip?: string;
  onClick?: () => void;
  clickable?: boolean;
};

const StatItem: React.FC<StatItemProps> = ({
  icon,
  label,
  value,
  color = 'text.primary',
  tooltip,
  onClick,
  clickable = false,
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
        cursor: clickable ? 'pointer' : 'default',
        '&:hover': {
          bgcolor: clickable ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
        }
      }}
      onClick={clickable ? onClick : undefined}
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

  if (isMobile) {
    return content;
  }

  return (
    <Tooltip title={tooltip || `${value} ${label}`} arrow>
      {content}
    </Tooltip>
  );
};

type SettlerDetailRowProps = {
  settler: Settler;
  getSettlerCurrentEnergy: (index: number) => number;
  settlerIndex: number;
};

const SettlerDetailRow: React.FC<SettlerDetailRowProps> = ({ 
  settler, 
  getSettlerCurrentEnergy, 
  settlerIndex 
}) => {
  const currentEnergy = getSettlerCurrentEnergy(settlerIndex);
  
  const getStatColor = (value: number, isEnergy = false) => {
    const threshold = isEnergy ? 70 : 60;
    if (value >= threshold) return 'success';
    if (value >= (threshold - 20)) return 'warning';
    return 'error';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 0.5,
        px: 2,
        bgcolor: 'rgba(255,255,255,0.03)',
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Settler Name */}
      <Typography
        variant="body2"
        sx={{
          minWidth: 100,
          fontWeight: 600,
          color: 'text.primary',
        }}
      >
        {settler.name}
      </Typography>

      {/* Status */}
      <Box
        sx={{
          minWidth: 80,
          px: 1,
          py: 0.25,
          bgcolor: settler.status === 'idle' ? 'info.main' : 'success.main',
          borderRadius: 0.5,
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
          {settler.status.toUpperCase()}
        </Typography>
      </Box>

      {/* Morale */}
      <Box sx={{ minWidth: 100 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Morale</Typography>
          <Typography variant="caption" color="text.secondary">{settler.morale}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={settler.morale}
          color={getStatColor(settler.morale)}
          sx={{ height: 4, borderRadius: 2 }}
        />
      </Box>

      {/* Energy */}
      <Box sx={{ minWidth: 100 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Energy</Typography>
          <Typography variant="caption" color="text.secondary">{Math.round(currentEnergy)}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={currentEnergy}
          color={getStatColor(currentEnergy, true)}
          sx={{ height: 4, borderRadius: 2 }}
        />
      </Box>
    </Box>
  );
};

const DashboardTopBar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation(); 
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [settlerDetailsOpen, setSettlerDetailsOpen] = useState(false);
  const { logout } = useAuth();

  const { currentServerId } = useServerContext();

  useEffect(() => {
    if (navigatingTo && location.pathname === navigatingTo) {
      setNavigatingTo(null);
    }
  }, [location.pathname, navigatingTo]);

  // Use the enhanced useColony hook with energy tracking
  const { colony, getSettlerCurrentEnergy, colonyLoading } = useColony(currentServerId || undefined);
  
  const displayColony = colony;

  const NAV_ITEMS = useMemo(() => {
    if (!displayColony) return [];

    const baseItems = [
      { label: "Quests", href: "/quests", icon: <WarningAmberIcon /> },
      { label: "Events", href: "/events", icon: <FeedIcon /> },
    ];

    const conditionalItems = [
      { label: "Homestead", href: "/homestead", condition: displayColony.unlocks.homestead, icon: <HomeIcon /> },
      { label: "Settlers", href: "/settlers", condition: displayColony.settlerCount > 0, icon: <SelfImprovementIcon /> },
      { label: "Map", href: "/map", condition: displayColony.unlocks.map, icon: <VisibilityIcon /> },
      { label: "Inventory", href: "/inventory", condition: displayColony.unlocks.inventory, icon: <BuildIcon /> },
      { label: "Crafting", href: "/crafting", condition: displayColony.unlocks.crafting, icon: <BuildIcon /> },
      { label: "Lodging", href: "/lodging", condition: displayColony.unlocks.lodgings, icon: <HomeIcon /> },
      { label: "Farming", href: "/farming", condition: displayColony.unlocks.farming, icon: <NatureIcon /> },
      { label: "Defence", href: "/defence", condition: displayColony.unlocks.defence, icon: <ShieldIcon /> },
    ];

    return [
      ...baseItems,
      ...conditionalItems.filter(item => item.condition)
    ];
  }, [displayColony]);

  // Enhanced settler stats with energy tracking
  const settlerStats = useMemo(() => {
    if (!displayColony?.settlers) return { 
      idle: 0, working: 0, lowMorale: 0, carrying: 0, total: 0, 
      lowestMorale: 100, lowestEnergy: 100 
    };

    const idle = displayColony.settlers.filter(s => s.status === "idle").length;
    const working = displayColony.settlers.filter(s => s.status !== "idle").length;
    const lowMorale = displayColony.settlers.filter(s => (s.morale || 0) < 60).length;
    const carrying = displayColony.settlers.filter(s => s.carry && s.carry.length > 0).length;

    // Calculate lowest morale and energy
    const lowestMorale = Math.min(...displayColony.settlers.map(s => s.morale || 100));
    const lowestEnergy = Math.min(...displayColony.settlers.map((_, index) => 
      getSettlerCurrentEnergy ? getSettlerCurrentEnergy(index) : 100
    ));

    return { 
      idle, working, lowMorale, carrying, total: displayColony.settlers.length,
      lowestMorale, lowestEnergy
    };
  }, [displayColony?.settlers, getSettlerCurrentEnergy]);

  const getNotorietyColor = (notoriety: number) => {
    if (notoriety <= 10) return "success.main";
    if (notoriety <= 25) return "success.light";
    if (notoriety <= 50) return "warning.main";
    if (notoriety <= 75) return "error.light";
    return "error.main";
  };

  const getLowStatColor = (value: number, isEnergy = false) => {
    const threshold = isEnergy ? 70 : 60;
    if (value >= threshold) return "success.main";
    if (value >= (threshold - 20)) return "warning.main";
    return "error.main";
  };

  const getCarryingColor = (count: number) => {
    return count > 0 ? "warning.main" : "text.secondary";
  };

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
        clickable: true,
        onClick: () => setSettlerDetailsOpen(!settlerDetailsOpen),
      },
      {
        icon: <GiRunningNinja fontSize="inherit" />,
        label: "Working",
        value: settlerStats.working,
        color: "success.main",
        tooltip: settlerStats.working > 0 ? `${settlerStats.working} settlers working on tasks` : "No settlers currently working",
        clickable: true,
        onClick: () => setSettlerDetailsOpen(!settlerDetailsOpen),
      },
      {
        icon: <GiHeartBeats fontSize="inherit" />,
        label: "Low Morale",
        value: `${settlerStats.lowMorale} (${settlerStats.lowestMorale}%)`,
        color: getLowStatColor(settlerStats.lowestMorale),
        tooltip: `${settlerStats.lowMorale} settlers with low morale. Lowest: ${settlerStats.lowestMorale}%`,
        clickable: true,
        onClick: () => setSettlerDetailsOpen(!settlerDetailsOpen),
      },
      {
        icon: <BatteryFull fontSize="inherit" />,
        label: "Low Energy",
        value: `${Math.round(settlerStats.lowestEnergy)}%`,
        color: getLowStatColor(settlerStats.lowestEnergy, true),
        tooltip: `Lowest energy settler: ${Math.round(settlerStats.lowestEnergy)}%`,
        clickable: true,
        onClick: () => setSettlerDetailsOpen(!settlerDetailsOpen),
      },
      {
        icon: <GiBackpack fontSize="inherit" />,
        label: "Carrying",
        value: settlerStats.carrying,
        color: getCarryingColor(settlerStats.carrying),
        tooltip: settlerStats.carrying > 0 
          ? `${settlerStats.carrying} settlers are carrying items` 
          : "No settlers carrying items",
        clickable: true,
        onClick: () => setSettlerDetailsOpen(!settlerDetailsOpen),
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
  }, [displayColony, settlerStats, settlerDetailsOpen]);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleNavigation = (href: string) => {
    setNavigatingTo(href);
    navigate(href);
    handleMobileMenuClose();
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

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            Current Server
          </Typography>
          <ServerSelector isMobile={true} />
        </Box>

        <Divider sx={{ mb: 2 }} />

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

    return (
      <Toolbar sx={{ minHeight: { xs: 48, sm: 46 }, px: 1, gap: 0.5, display: 'flex' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {allStats.resources.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1, justifyContent: 'center' }}>
          {allStats.settlers.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {allStats.status.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </Box>
      </Toolbar>
    );
  };

  const renderSettlerDetails = () => {
    if (!displayColony?.settlers || displayColony.settlers.length === 0) return null;

    return (
      <Collapse in={settlerDetailsOpen}>
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(0,0,0,0.4)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 0,
            p: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: '300px',
              overflow: 'auto',
            }}
          >
            {displayColony.settlers.map((settler, index) => (
              <SettlerDetailRow
                key={settler._id}
                settler={settler}
                getSettlerCurrentEnergy={getSettlerCurrentEnergy}
                settlerIndex={index}
              />
            ))}
          </Box>
        </Paper>
      </Collapse>
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

        {renderStats()}
        {renderSettlerDetails()}
      </AppBar>

      {renderMobileMenu}
    </>
  );
};

export default DashboardTopBar;