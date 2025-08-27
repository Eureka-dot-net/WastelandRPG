import { toast } from 'react-toastify';
import TaskCompletionToast from './TaskCompletionToast';
import type { Task, Settler, Rewards } from './TaskCompletionToast';
import { Box } from '@mui/material';

export const showTaskCompletionToast = (task: Task, settler: Settler, rewards: Rewards) => {
  toast.success(
    <TaskCompletionToast task={task} settler={settler} rewards={rewards} />,
    {
      autoClose: 6000,
      position: "bottom-right",
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        backgroundColor: '#1a1a1a',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4),0 0 20px rgba(76,175,80,0.1)',
        minWidth: 350,
        maxWidth: 420,
      },
      closeButton: ({ closeToast }) => (
        <Box
          onClick={closeToast}
          sx={{
            position: 'absolute', top: 8, right: 8, width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#b0b0b0', fontSize: '1.2rem',
            '&:hover': { color: '#fff', transform: 'scale(1.1)' },
            transition: 'all 0.2s ease',
          }}
        >
          ×
        </Box>
      ),
       icon: false,
    }
  );
};
