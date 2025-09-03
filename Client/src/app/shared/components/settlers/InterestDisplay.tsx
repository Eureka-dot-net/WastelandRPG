// File: src/app/shared/components/settlers/InterestDisplay.tsx
import React from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { Favorite, FavoriteBorder, Security, LocalHospital, Agriculture, Build, Science } from '@mui/icons-material';
import DynamicIcon from '../DynamicIcon';

// Skill to icon mapping using MUI icons for consistency
const skillIcons: Record<string, React.ReactElement> = {
  combat: <Security />,
  medical: <LocalHospital />,
  farming: <Agriculture />,
  crafting: <Build />,
  engineering: <Build />,
  scavenging: <Science />
};

// Skill display names for better UX
const skillDisplayNames: Record<string, string> = {
  combat: 'Combat',
  medical: 'Medical',
  farming: 'Farming', 
  crafting: 'Crafting',
  engineering: 'Engineering',
  scavenging: 'Scavenging'
};

interface InterestDisplayProps {
  availableInterests: string[];
  selectedInterests: string[];
  onInterestToggle?: (interest: string) => void;
  maxSelection?: number;
  disabled?: boolean;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

const InterestDisplay: React.FC<InterestDisplayProps> = ({
  availableInterests,
  selectedInterests,
  onInterestToggle,
  maxSelection = 2,
  disabled = false,
  readonly = false,
  size = 'medium',
  showLabels = false
}) => {
  const iconSize = size === 'small' ? 20 : size === 'medium' ? 24 : 32;
  const isInteractive = !readonly && onInterestToggle;

  const handleToggle = (interest: string) => {
    if (!onInterestToggle || disabled || readonly) return;
    
    const isSelected = selectedInterests.includes(interest);
    
    // If trying to select and already at max, ignore
    if (!isSelected && selectedInterests.length >= maxSelection) return;
    
    onInterestToggle(interest);
  };

  const getInterestIcon = (interest: string) => {
    return skillIcons[interest] || <DynamicIcon name="GiQuestionMark" />;
  };

  const isSelected = (interest: string) => selectedInterests.includes(interest);

  const canSelect = (interest: string) => {
    return isSelected(interest) || selectedInterests.length < maxSelection;
  };

  return (
    <Box>
      {showLabels && (
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Interests {isInteractive ? `(${selectedInterests.length}/${maxSelection})` : ''}
        </Typography>
      )}
      <Box display="flex" flexWrap="wrap" gap={1}>
        {availableInterests.map((interest) => {
          const selected = isSelected(interest);
          const selectable = canSelect(interest);
          
          const InterestItem = (
            <Box
              key={interest}
              display="flex"
              flexDirection="column"
              alignItems="center"
              sx={{
                opacity: (!selectable && !selected) ? 0.3 : 1,
                cursor: isInteractive && (selectable || selected) ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                '&:hover': isInteractive && (selectable || selected) ? {
                  transform: 'scale(1.05)'
                } : {}
              }}
            >
              {isInteractive ? (
                <IconButton
                  onClick={() => handleToggle(interest)}
                  disabled={disabled || (!selectable && !selected)}
                  sx={{
                    color: selected ? 'gold' : 'grey.500',
                    p: 0.5,
                    '&:hover': {
                      color: selected ? 'gold' : 'grey.300',
                      backgroundColor: 'transparent'
                    },
                    '&.Mui-disabled': {
                      color: 'grey.700'
                    }
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {/* Heart overlay */}
                    {selected ? (
                      <Favorite 
                        sx={{ 
                          position: 'absolute', 
                          fontSize: iconSize + 4,
                          color: 'gold',
                          filter: 'drop-shadow(0 0 2px rgba(255,215,0,0.5))'
                        }} 
                      />
                    ) : (
                      <FavoriteBorder 
                        sx={{ 
                          position: 'absolute', 
                          fontSize: iconSize + 4,
                          color: 'grey.500'
                        }} 
                      />
                    )}
                    {/* Skill icon */}
                    <Box
                      sx={{
                        fontSize: iconSize - 6,
                        color: selected ? 'gold' : 'grey.400',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1
                      }}
                    >
                      {getInterestIcon(interest)}
                    </Box>
                  </Box>
                </IconButton>
              ) : (
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.5
                  }}
                >
                  {/* Heart overlay */}
                  <Favorite 
                    sx={{ 
                      position: 'absolute', 
                      fontSize: iconSize + 4,
                      color: 'gold',
                      filter: 'drop-shadow(0 0 2px rgba(255,215,0,0.5))'
                    }} 
                  />
                  {/* Skill icon */}
                  <Box
                    sx={{
                      fontSize: iconSize - 6,
                      color: 'gold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}
                  >
                    {getInterestIcon(interest)}
                  </Box>
                </Box>
              )}
              
              {showLabels && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    fontSize: size === 'small' ? '0.6rem' : '0.7rem',
                    color: selected ? 'gold' : 'text.secondary',
                    textAlign: 'center',
                    textTransform: 'capitalize'
                  }}
                >
                  {skillDisplayNames[interest] || interest}
                </Typography>
              )}
            </Box>
          );

          // Wrap with tooltip for interactive mode
          if (isInteractive) {
            return (
              <Tooltip
                key={interest}
                title={`${skillDisplayNames[interest] || interest}${!selectable && !selected ? ' (max reached)' : ''}`}
                placement="top"
              >
                {InterestItem}
              </Tooltip>
            );
          }

          return InterestItem;
        })}
      </Box>
    </Box>
  );
};

export default InterestDisplay;