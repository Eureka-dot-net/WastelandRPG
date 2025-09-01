# Multi-Server System Implementation

This document describes the implementation of the multi-server functionality that allows users to join multiple servers and switch between them.

## Components

### ServerContext
**Location**: `src/lib/contexts/ServerContext.tsx`

Provides global state management for the current server selection across the application.

**Features**:
- Manages current selected server ID
- Auto-selects first available server if none is chosen
- Handles stale localStorage data (when user no longer has access to previously selected server)
- Provides user colonies data and server switching functionality

**API**:
```typescript
interface ServerContextType {
  currentServerId: string | null;
  currentColony: ColonyWithServer | null;
  userColonies: ColonyWithServer[];
  isLoading: boolean;
  error: Error | null;
  setCurrentServer: (serverId: string) => void;
  hasMultipleServers: boolean;
}
```

### ServerSelector
**Location**: `src/components/ServerSelector/ServerSelector.tsx`

A dropdown component that displays the current colony/server and allows switching between servers or joining new ones.

**Features**:
- Shows current colony name and server name prominently
- Mobile-responsive design
- Dropdown menu with all user colonies
- Join new server dialog with custom colony naming
- Server type icons and visual indicators
- Error handling for API failures

### InitialServerSelection
**Location**: `src/components/InitialServerSelection/InitialServerSelection.tsx`

A welcome screen for new users who haven't joined any servers yet.

**Features**:
- Server selection with descriptions
- Custom colony naming
- Server type indicators
- Loading and error states
- Mobile-responsive card layout

## Architecture Changes

### Context Integration
The ServerContext is integrated at the root level in `main.tsx`, making server state available throughout the application.

### Dynamic Routing
Page wrapper components (`AssignmentPageWrapper`, `InventoryPageWrapper`) dynamically inject the current server ID into page components, replacing hardcoded  references.

### Layout Updates
`DashboardLayout` conditionally shows either the normal dashboard with top bar or the initial server selection for new users.

`DashboardTopBar` integrates the ServerSelector and uses context-provided colony data instead of hardcoded server data.

## User Experience

### New Users
1. After registration and login, users see the InitialServerSelection screen
2. They choose from available servers (Harbor, Frontier, Wasteland)
3. They can optionally provide a custom colony name
4. Upon joining, they're taken to the main dashboard

### Existing Users
1. The system automatically selects their first available server
2. The ServerSelector in the top bar shows current colony/server names
3. Users can click the ServerSelector to:
   - Switch between existing colonies on different servers
   - Join additional servers with custom colony names

### Mobile Support
- ServerSelector is integrated into the hamburger menu on mobile
- All dialogs and selectors are touch-friendly
- Responsive layout maintains functionality across screen sizes

## API Integration

The implementation uses existing API endpoints:
- `GET /api/servers` - Get available servers
- `GET /api/servers/colonies` - Get user's colonies across all servers
- `POST /api/servers/:serverId/join` - Join a new server
- `GET /api/servers/:serverId/colony` - Get colony data for specific server

## Error Handling

- Network failures are handled gracefully with error messages
- Stale localStorage data is cleaned up automatically  
- Loading states are shown during API calls
- Toast notifications provide user feedback for actions

## Future Enhancements

Potential improvements:
- Server population indicators
- Server-specific features/rules display
- Colony renaming functionality
- Server leaving capability
- Recent servers list for quick switching