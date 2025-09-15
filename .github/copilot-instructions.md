# Copilot Instructions for WastelandRPG

## Repository Overview

**WastelandRPG** is a text-based colony management RPG set in a post-apocalyptic world. Players manage colonies, settlers, resources, and assignments while surviving in a harsh wasteland environment.

### High-Level Details
- **Project Type**: Full-stack web application (Text-based RPG game)
- **Repository Size**: ~50MB (excluding node_modules)
- **Languages**: TypeScript (100%), JavaScript (config files)
- **Runtime**: Node.js 22.x for backend, Modern browsers for frontend
- **Database**: MongoDB (production) / MongoDB Memory Server (testing)
- **Deployment**: Render.com via GitHub Actions CI/CD

### Tech Stack
- **Backend (API/)**: Node.js + Express.js + TypeScript + MongoDB + Mongoose
- **Frontend (Client/)**: React + TypeScript + Vite + Material-UI + Tanstack Query
- **Testing**: Jest + Supertest (API), No test framework configured (Client)
- **Linting**: ESLint for both projects
- **Build**: TypeScript compiler (API), Vite (Client)

## Build Instructions

### Prerequisites
- Node.js 22.x (LTS recommended)
- Docker (recommended) OR MongoDB installed locally
- npm or yarn package manager

### Environment Setup

**AUTOMATIC SETUP (Recommended):**

For quickest setup, use the provided setup script:
```bash
cd API
./setup.sh
```

This script will:
- Start MongoDB in Docker container
- Create `.env` file with correct configuration
- Install dependencies
- Verify the setup

**MANUAL SETUP:**

If you prefer manual setup or don't have Docker:

1. **Option A: Docker MongoDB (Recommended)**
```bash
# Start MongoDB container
docker run -d -p 27017:27017 --name wasteland-mongodb mongo:latest

# Create .env file in API/ directory
MONGO_URI=mongodb://localhost:27017/wasteland_rpg
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=development
```

2. **Option B: Local MongoDB Installation**
```bash
# Install MongoDB locally first, then:
MONGO_URI=mongodb://localhost:27017/wasteland_rpg
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=development
```

3. **Option C: MongoDB Atlas (Cloud)**
```bash
# Sign up at https://www.mongodb.com/atlas and get connection string
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/wasteland_rpg
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=development
```

4. **Option D: No Database (In-Memory Fallback)**
```bash
# Leave MONGO_URI unset for automatic in-memory database (requires internet access)
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=development
```

**Testing Configuration:**

Create `.env.test` in `API/` directory:
```bash
NODE_ENV=test
JWT_SECRET=test_secret_key
MONGO_URI=mongodb://localhost:27017/wasteland_rpg  # Uses same Docker/local MongoDB
```

**Available Environment Files:**
- `.env.example` - Template for development environment
- `.env.test.example` - Template for test environment

### Bootstrap Process

**ALWAYS install dependencies first:**
```bash
# Install API dependencies (required for all operations)
cd API && npm ci

# Install Client dependencies  
cd Client && npm ci
```

**Development Workflow:**
```bash
# API Development
cd API
npm run typecheck  # Check TypeScript compilation
npm run lint       # Lint code (fails on warnings)
npm run lint:fix   # Auto-fix linting issues
npm test           # Run test suite
npm run build      # Build for production
npm run dev        # Start development server

# Client Development  
cd Client
npm run lint       # Lint code
npm run build      # Build for production
npm run dev        # Start development server
```

### Build Process

**API Build:**
```bash
cd API
npm run build  # Compiles TypeScript to dist/ folder
```
- Build time: ~5-10 seconds
- Output: `dist/` directory with compiled JavaScript
- Uses TypeScript compiler with config from `tsconfig.json`

**Client Build:**
```bash
cd Client  
npm run build  # Runs TypeScript check + Vite build
```
- Build time: ~10-15 seconds
- Output: `dist/` directory with static assets
- Bundle size warning: Current bundle is ~7.5MB (consider code splitting for large changes)

### Testing

**API Tests:**
```bash
cd API
npm test  # Runs Jest test suite
```
- **Database**: Tests use mongodb-memory-server with intelligent fallback mocking when offline
- **Setup**: No external MongoDB required - tests automatically handle offline environments
- **Environment**: Reliable execution in all environments (CI, offline, online)
- **Run time**: ~5-10 seconds with comprehensive test coverage
- **Database cleanup**: Automatic cleanup handled by mongodb-memory-server or mock system

**Test Infrastructure:**
- **Primary**: mongodb-memory-server for full MongoDB functionality when internet available
- **Fallback**: Comprehensive mocking system when offline (simulates sessions, CRUD, query chaining)
- **Coverage**: All MongoDB-dependent tests run without skipping
- **Models Supported**: User, Colony, Settler, Assignment, SpiralCounter, UserMapTile
- **Operations**: Full CRUD with session support, transactions, and advanced queries

**Testing Commands:**
```bash
cd API
npm test                    # Run all tests (no skips)
npm test -- --coverage     # Run with coverage report
npm test -- tests/database.test.ts  # Run specific test file
```

**Client Tests:**
```bash
cd Client
npm test  # Currently shows "No tests configured"
```
- No test framework currently set up
- Consider adding Vitest if implementing tests

### Linting

**API Linting:**
```bash
cd API
npm run lint      # ESLint with TypeScript support (fails on ANY warnings)
npm run lint:fix  # Auto-fix linting issues where possible
```
- Config: `eslint.config.js` 
- **ZERO WARNINGS POLICY**: Linting now fails on any warnings (--max-warnings 0)
- All unused imports and variables have been cleaned up

**Client Linting:**
```bash
cd Client
npm run lint  # ESLint with React/TypeScript rules
```
- Config: `eslint.config.js`
- Currently passes with no issues

### Development Servers

**API Development Server:**
```bash
cd API
npm run dev  # Starts nodemon with TypeScript execution
```
- Uses `nodemon` with `ts-node` for hot reloading
- Watches `src/` directory for changes
- Default port: 3000 (or PORT env variable)
- **Database**: Automatically connects to configured MongoDB or starts in-memory database
- **Startup**: Server provides clear guidance if database connection fails

**Client Development Server:**
```bash
cd Client  
npm run dev  # Starts Vite dev server
```
- Hot module reloading enabled
- Default port: 5173 (Vite default)

### Common Issues & Workarounds

1. **MongoDB Connection Errors**: 
   - **Quick Fix**: Run `cd API && ./setup.sh` for automatic setup
   - **Manual Fix**: Ensure MongoDB is running with `docker ps` or `mongod --version`
   - **Environment**: Check MONGO_URI in `.env` file is correct
   - **Fallback**: Server will attempt in-memory database if external connection fails

2. **Testing Issues (Resolved)**:
   - **Previous**: Tests used to skip when MongoDB unavailable
   - **Current**: Tests now run reliably using mongodb-memory-server with fallback mocking
   - **Benefit**: 100% test execution rate regardless of environment constraints

3. **MongoDB Memory Server**:
   - **Online**: Downloads MongoDB binaries automatically for full functionality
   - **Offline**: Falls back to comprehensive mocking system 
   - **Error**: "ENOTFOUND fastdl.mongodb.org" triggers automatic fallback (expected behavior)

4. **Test Database Management**: 
   - Automatic database lifecycle management
   - No manual setup required for testing
   - Clean state guaranteed between test runs

5. **Port Conflicts**:
   - MongoDB default port 27017 might be in use
   - Change Docker port: `docker run -d -p 27018:27017 --name mongodb mongo:latest`
   - Update MONGO_URI: `mongodb://localhost:27018/wasteland_rpg`

5. **Docker Issues**:
   - Container name conflicts: `docker rm wasteland-mongodb`
   - Container not starting: `docker logs wasteland-mongodb`
   - Port already in use: Use different port mapping

6. **Large Bundle Size**: 
   - Client build warns about 7.5MB bundle size
   - Consider dynamic imports for code splitting
   - Material-UI and react-icons contribute significantly to size

## Project Layout & Architecture

### Directory Structure
```
/
├── .github/
│   └── workflows/render-deployment.yaml  # CI/CD pipeline
├── API/                                  # Node.js backend
│   ├── src/
│   │   ├── app.ts                       # Express app configuration
│   │   ├── index.ts                     # Server entry point
│   │   ├── config/db.ts                 # MongoDB connection
│   │   ├── models/                      # Mongoose schemas
│   │   │   ├── User.ts                  # User authentication
│   │   │   └── Player/                  # Game entities
│   │   │       ├── Colony.ts            # Player colonies
│   │   │       ├── Settler.ts           # Colony settlers
│   │   │       ├── Assignment.ts        # Tasks/jobs
│   │   │       └── Inventory.ts         # Resource storage
│   │   ├── routes/                      # API endpoints
│   │   ├── controllers/                 # Request handlers
│   │   ├── services/                    # Business logic
│   │   ├── middleware/                  # Auth, validation, etc.
│   │   └── data/                        # Static game data
│   ├── tests/                           # Jest test suites
│   ├── package.json                     # Dependencies & scripts
│   ├── tsconfig.json                    # TypeScript config
│   ├── eslint.config.js                 # Linting rules
│   └── jest.config.js                   # Test configuration
├── Client/                              # React frontend
│   ├── src/
│   │   ├── main.tsx                     # React app entry
│   │   ├── app/                         # Application code
│   │   │   ├── layout/                  # UI layout components
│   │   │   ├── router/                  # Route configuration
│   │   │   ├── shared/                  # Reusable components
│   │   │   └── themes/                  # Material-UI themes
│   │   ├── features/                    # Feature-specific code
│   │   └── lib/                         # Utilities & services
│   ├── docs/                            # Feature documentation
│   ├── public/                          # Static assets
│   ├── package.json                     # Dependencies & scripts
│   ├── vite.config.ts                   # Vite configuration
│   ├── tsconfig.*.json                  # TypeScript configs
│   └── eslint.config.js                 # Linting rules
└── World & Lore.md                      # Game design document
```

### Key Architectural Patterns

**Server-Authoritative Design**: 
- API is the single source of truth for all game state
- Client only displays data and sends user actions
- All business logic resides on the server

**SettlerManager Pattern**:
- Encapsulates settler-specific logic and computed properties
- Provides weight-based inventory management for settlers
- Methods: `canCarryItems()`, `addItems()`, `giveRewards()`, `transferItemsToColony()`, `adjustedTimeMultiplier()`, `adjustedLootMultiplier()`
- Computed properties: `carryingCapacity`, `currentCarriedWeight`, `effectiveSpeed`, `foodSatiationRate`
- Dynamic trait effects: Uses traitsCatalogue.json for data-driven trait processing instead of hardcoded values
- Activity-specific adjustments: Time and loot multipliers can be calculated per activity type (exploration, cleanup, etc.)
- Used for settler inventory operations and game balance calculations instead of utility functions

**Mobile-First Considerations**:
- All UI components must work on mobile devices  
- Server selector integrated into hamburger menu for mobile
- Touch-friendly interface elements

**Multi-Server System**:
- Players can join multiple game servers (Harbor, Frontier, Wasteland)
- Server context manages active server state
- Colony data is server-specific

**Transaction-Based Operations**:
- Database operations use MongoDB sessions for consistency
- Critical game operations (assignments, settlers) are atomic
- Rollback support for failed operations

### CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/render-deployment.yaml`):
1. **Triggers**: Push to `master`, `copilot/**` branches, or PR to master
2. **API Job**: 
   - Install dependencies with `npm ci`
   - Run security audit (`npm audit`, `npx audit-ci`)
   - Test server startup (basic Node.js test)
   - Deploy to Render via webhook
3. **Client Job**:
   - Install dependencies with `npm ci` 
   - Run linting (`npm run lint`)
   - Build application (`npm run build`)
   - Check bundle size (fails if >10MB)
   - Deploy to Render via webhook

**Deployment Requirements**:
- Both API and Client deploy to Render.com
- Requires `RENDER_API_HOOK` and `RENDER_REACT_HOOK` secrets
- Uses Node.js 22.x runtime
- Production builds only for master/copilot branches

### Validation Steps for Code Changes

**Before submitting changes, ALWAYS:**
1. Run linting for both API and Client: `npm run lint` (now fails on ANY warnings). FIX ALL ISSUES even if they are not related to the check in
2. Run typecheck for API: `npm run typecheck` (TypeScript compilation without emit)
3. Build both projects successfully: `npm run build`
4. Run API tests: `npm test` (now works reliably with graceful MongoDB detection). . FIX ALL ISSUES even if they are not related to the check in
5. Test multi-server functionality if touching server-related code
6. Verify mobile responsiveness for UI changes

**Additional Considerations**:
- Database transactions must be properly handled with sessions using `withSession`, `withSessionReadOnly`, or `withOptionalSession`
- Authentication required for all player-specific endpoints
- Colony ownership validation for player operations
- Assignment completion timing handled by middleware
- Inventory limits not yet enforced (TODO items in codebase)
- **NO UNUSED IMPORTS**: All unused imports and variables must be removed - linting now fails on warnings. . FIX ALL ISSUES even if they are not related to the check in
- **SettlerManager Usage**: Use `SettlerManager` instance methods for settler operations instead of utility functions. Create manager with `new SettlerManager(settler)` and use methods like:
  - Inventory: `giveRewards()`, `transferItemsToColony()`, `addItems()`, `canCarryItems()`
  - Game Balance: `adjustedTimeMultiplier(activityType)`, `adjustedLootMultiplier(activityType)` 
  - Computed Properties: `carryingCapacity`, `currentCarriedWeight`, `effectiveSpeed`, `foodSatiationRate`

## MongoDB Session Management Guidelines

**IMPORTANT: All write operations that modify multiple collections or depend on each other must use MongoDB sessions for data consistency.**

### Session Utilities (`/src/utils/sessionUtils.ts`)

The codebase provides standardized utilities for session management:

- **`withSession(operation, existingSession?)`**: For write operations requiring transactions
  - Automatically creates/commits/aborts transactions when supported
  - Reuses existing sessions to avoid nested transactions
  - Gracefully handles both standalone MongoDB (tests) and replica sets (production)

- **`withSessionReadOnly(operation, existingSession?)`**: For read operations needing session consistency

### Session Requirements (MANDATORY)

**All write functions MUST require mandatory `session: ClientSession` parameter:**
```typescript
// ✅ Correct - write operation with mandatory session
export async function myWriteFunction(param1: string, param2: number, session: ClientSession) {
  // Database write operations here
  await SomeModel.save({ session });
  return result;
}

// ❌ Incorrect - optional session for writes is NOT allowed
export async function myWriteFunction(param1: string, param2: number, session?: ClientSession) {
  // This pattern is forbidden for write operations
}
```

**Read-only functions should NOT have session parameters:**
```typescript
// ✅ Correct - read operation without session
export async function myReadFunction(param1: string): Promise<SomeType> {
  return await SomeModel.findOne({ param1 });
}
```

### Usage Patterns

**Write Operations**: Always use `withSession()` in routes/controllers:
```typescript
export const myRoute = async (req: Request, res: Response) => {
  try {
    const result = await withSession(async (session) => {
      // Call write functions with mandatory session
      await myWriteFunction(param1, param2, session);
      await anotherWriteFunction(param3, session);
      return someResult;
    });
    res.json(result);
  } catch (error) {
    // Error handling
    res.status(500).json({ error: 'Operation failed' });
  }
};
```

**Multi-collection Operations**: Always atomic with sessions:
```typescript
// ✅ Good - atomic operation
await withSession(async (session) => {
  await Model1.save({ session });
  await Model2.findByIdAndUpdate(id, update, { session });
  await colonyManager.addLogEntry(session, 'type', 'message');
});

// ❌ Bad - no consistency guarantee
await Model1.save();
await Model2.findByIdAndUpdate(id, update);
```
    res.status(500).json({ error: 'Operation failed' });
  }
};
```

### Key Requirements

1. **Mandatory Sessions for Writes**: All functions that perform write operations (create, update, delete) MUST require `session: ClientSession` parameter
2. **No Optional Sessions for Writes**: Optional session parameters (`session?: ClientSession`) are forbidden for write operations
3. **Session-Free Reads**: Read-only functions should not have session parameters unless consistency within a transaction is required
4. **Atomic Operations**: Related database changes must be in single transaction using `withSession()`
5. **Proper Error Handling**: Use the utilities' built-in error handling
6. **Environment Adaptability**: Code must work in both test (standalone) and production (replica set) environments
7. **No Nested Transactions**: Always reuse existing sessions when passed as parameter

### Examples in Codebase

- `ColonyManager.addLogEntry()` - accepts and uses session parameter
- `SettlerManager` - encapsulates settler-specific logic with inventory management methods
- `routes/dev.ts` - uses `withSession()` for multi-collection deletes
- `controllers/assignmentController.ts` - refactored to use session utilities
- `middleware/updateCompletedTasks.ts` - uses `withSession()` for completion processing

### Testing

Session behavior is validated through:
- Unit tests in `tests/sessionUtils.test.ts`
- Integration tests in `tests/sessionIntegration.test.ts`
- Automatic rollback testing for transaction scenarios

## Rules for All Coding Tasks

1. **Keep Files Updated**: Any file you create or modify must be kept current with the codebase
2. **Update README**: Keep README.md files updated when making structural changes
3. **CI/CD Must Pass**: Ensure build, lint, and test processes pass for successful deployment
4. **Mobile-First Design**: All design decisions must consider mobile user experience
5. **API Authority**: The API is the version of truth - client is only for display and user interaction
6. **Session Consistency**: Always use MongoDB sessions for multi-collection write operations
7. **Standard Dialog Pattern**: **ALWAYS** use the standard `SettlerSelectorDialog` from `Client/src/app/shared/components/settlers/SettlerSelectorDialog.tsx` for any settler selection functionality. **DO NOT** create custom dialogs, dropdowns, or selection UI. The standard dialog provides:
   - Side-by-side settler display (single or multiple)
   - Preview system integration with assignment effects
   - Consistent mobile-responsive design
   - Proper accessibility features
   - Support for skills/stats display configuration
   - Loading states and error handling
   - **Example Usage**: Quest page (`QuestPage.tsx`) and Map page (`MapPage.tsx`) show the correct implementation pattern. Follow these examples exactly.
8. **Standard Assignment Page Pattern**: **ALWAYS** use the `useAssignmentPage` hook from `Client/src/lib/hooks/useAssignmentPage.ts` for any page that handles assignments. **DO NOT** manually implement preview calculations, state management for dialogs, or settler selection logic. The hook provides:
   - Unified state management for dialogs and previews
   - Standardized settler selection workflow
   - Automatic preview calculation with settler adjustments
   - Proper integration with SettlerSelectorDialog
   - **Configuration Functions**: Use or create configuration functions like `createQuestPageConfig`, `createMapExplorationConfig`, or `createLodgingPageConfig`
   - **Example Usage**: Quest page (`QuestPage.tsx`), Map page (`MapPage.tsx`), and Lodging page (`LodgingPage.tsx`) show the correct implementation patterns. Follow these examples exactly.
9. **NO BACKWARD COMPATIBILITY - ZERO TOLERANCE**: This project is in active development/alpha phase. **NEVER** maintain backward compatibility with deprecated functions, data structures, or legacy patterns. **ALWAYS** completely remove old/deprecated code and update ALL references to use the current implementation. **DO NOT** create wrapper functions, compatibility layers, transition code, or keep deprecated functions "just in case". **IMMEDIATELY** delete old implementations when creating new ones. Clean, maintainable code is the only priority - backward compatibility is strictly forbidden during this prototyping phase.

## Trust These Instructions

These instructions have been validated by exploring the codebase and testing all build processes. Only search for additional information if these instructions are incomplete or found to be incorrect. The build commands, file locations, and architectural descriptions are accurate as of the last update.

## TODO: How to Create New Frontend Pages with Assignments

When creating new frontend pages that involve assignments (tasks that settlers can be assigned to), follow this pattern:

1. **Use useAssignmentPage Hook**: Always use the `useAssignmentPage` hook instead of manually implementing assignment functionality.

2. **Create Configuration Function**: Add a new configuration function to `useAssignmentPage.ts` following the pattern:
   ```typescript
   export const createYourPageConfig = (
     startYourMutation: StartAssignmentMutation
   ): AssignmentPageConfig<YourTargetType> => ({
     previewType: 'assignment', // or 'map-exploration' for location-based
     getTargetId: target => target._id, // or generate unique ID
     getTargetKey: target => target._id, // for tracking state
     getAvailableTargets: allTargets => allTargets.filter(/* your logic */),
     startAssignment: startYourMutation,
     getBaseDuration: target => /* calculate base duration in ms */,
     getBasePlannedRewards: target => /* return reward object */
   });
   ```

3. **Target Type Requirements**: Your target type must extend `GenericTarget` interface (require `_id`, `id`, `x`, or `y` properties).

4. **Page Implementation Pattern**:
   ```typescript
   // Import the hook and your config
   import { useAssignmentPage, createYourPageConfig } from '../../lib/hooks/useAssignmentPage';
   
   // In your component:
   const startMutationWrapper = useMemo(() => ({
     mutate: (params: Record<string, unknown>, options?: { onSettled?: () => void }) => {
       // Extract params and call your actual mutation
       yourMutation.mutate(/* params */, options);
     },
     isPending: yourMutation.isPending,
   }), [yourMutation]);
   
   const config = useMemo(() => createYourPageConfig(startMutationWrapper), [startMutationWrapper]);
   
   const {
     availableSettlers,
     handleTargetSelect,
     handleSettlerSelect,
     handleDialogClose,
     settlerDialogOpen,
     selectedTarget,
     settlerPreviews,
     previewsLoading,
     previewsError,
   } = useAssignmentPage(serverId || '', yourTargets, config);
   ```

5. **Use Standard Dialog**: Always use `SettlerSelectorDialog` with the props from the hook.

6. **Examples to Follow**: 
   - Quest page (`QuestPage.tsx`) - for assignment-based tasks
   - Map page (`MapPage.tsx`) - for location-based exploration
   - Lodging page (`LodgingPage.tsx`) - for resource/facility-based assignments

This pattern ensures consistency across all assignment pages and avoids code duplication.
