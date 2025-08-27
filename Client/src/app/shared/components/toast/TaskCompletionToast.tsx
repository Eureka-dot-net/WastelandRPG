import React from 'react';
import { Box, Typography, Chip, Avatar } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

// Types
export interface Task {
  name: string;
  purpose: string;
}

export interface Settler {
  name: string;
}

export  interface Rewards {
  [key: string]: number;
}

export interface TaskCompletionToastProps {
  task: Task;
  settler: Settler;
  rewards: Rewards;
}

// Reusable Task Completion Toast Component
const TaskCompletionToast: React.FC<TaskCompletionToastProps> = ({ task, settler, rewards }) => {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        p: 1,
        minWidth: 320,
        maxWidth: 400,
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5}>
        <CheckCircle 
          sx={{ 
            color: '#4caf50', 
            fontSize: '1.5rem',
            filter: 'drop-shadow(0 0 4px rgba(76, 175, 80, 0.5))'
          }} 
        />
        <Box flexGrow={1}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              fontSize: '1rem',
              color: '#4caf50',
              lineHeight: 1.2,
              textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
            }}
          >
            Task Completed!
          </Typography>
        </Box>
      </Box>

      {/* Task Details */}
      <Box>
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 600, 
            color: '#ffffff',
            mb: 0.5,
            fontSize: '0.95rem'
          }}
        >
          {task.name}
        </Typography>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Avatar 
            sx={{ 
              width: 24, 
              height: 24, 
              bgcolor: '#d32f2f',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {settler.name?.charAt(0) || 'S'}
          </Avatar>
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#b0b0b0',
              fontSize: '0.85rem'
            }}
          >
            {settler.name} • {task.purpose}
          </Typography>
        </Box>
      </Box>

      {/* Rewards */}
      <Box>
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#ffc107',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            mb: 1,
            display: 'block'
          }}
        >
          Resources Gained:
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={0.75}>
          {Object.entries(rewards).map(([type, amount]) => (
            <Chip
              key={type}
              size="small"
              label={
                <Box display="flex" alignItems="center" gap={0.5}>
                  <span style={{ fontWeight: 600 }}>
                    +{amount}
                  </span>
                  <span style={{ textTransform: 'capitalize' }}>
                    {type}
                  </span>
                </Box>
              }
              sx={{
                border: `1px solid 40`,
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 28,
                '& .MuiChip-label': {
                  px: 1,
                }
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};



// Usage example:
// showTaskCompletionToast(
//   { name: "Clear Debris", purpose: "Making space for new structures" },
//   { name: "Maya Rodriguez" },
//   { scrap: 25, wood: 10 }
// );

export default TaskCompletionToast;