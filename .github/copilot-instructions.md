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
cd API && npm install

# Install Client dependencies  
cd Client && npm install
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
- **Database**: Tests automatically use external MongoDB if available, fallback to in-memory
- **Setup**: Ensure MongoDB is running (Docker container or local installation)
- **Internet**: In-memory fallback requires internet access to download MongoDB binaries
- **Test timeout**: 30 seconds for setup, 15 seconds for cleanup
- **Run time**: ~30-60 seconds (depending on MongoDB setup)
- **Database cleanup**: Test databases are automatically cleaned up

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
npm run lint  # ESLint with TypeScript support
```
- Config: `eslint.config.js` 
- Currently produces warnings for unused imports (not errors)

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

2. **In-Memory Database Issues**:
   - **Internet Required**: In-memory database requires internet to download MongoDB binaries
   - **Error**: "ENOTFOUND fastdl.mongodb.org" means no internet access for binary download
   - **Solution**: Use Docker MongoDB or local MongoDB installation instead

3. **Test Failures**: 
   - Tests now preferentially use external MongoDB (Docker/local) over in-memory
   - Ensure MongoDB container is running: `docker start wasteland-mongodb`
   - Test database is automatically cleaned up between test runs

4. **Port Conflicts**:
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
1. Run linting for both API and Client: `npm run lint`
2. Build both projects successfully: `npm run build`  
3. Run API tests: `npm test` (if MongoDB available)
4. Test multi-server functionality if touching server-related code
5. Verify mobile responsiveness for UI changes

**Additional Considerations**:
- Database transactions must be properly handled with sessions
- Authentication required for all player-specific endpoints
- Colony ownership validation for player operations
- Assignment completion timing handled by middleware
- Inventory limits not yet enforced (TODO items in codebase)

## MongoDB Session Management Guidelines

**IMPORTANT: All write operations that modify multiple collections or depend on each other must use MongoDB sessions for data consistency.**

### Session Utilities (`/src/utils/sessionUtils.ts`)

The codebase provides standardized utilities for session management:

- **`withSession(operation, existingSession?)`**: For write operations requiring transactions
  - Automatically creates/commits/aborts transactions when supported
  - Reuses existing sessions to avoid nested transactions
  - Gracefully handles both standalone MongoDB (tests) and replica sets (production)

- **`withSessionReadOnly(operation, existingSession?)`**: For read operations needing session consistency

- **`withOptionalSession(operation, options?)`**: For backward-compatible functions that may or may not receive a session

### Usage Patterns

**New Functions**: Always accept an optional `session?: ClientSession` parameter:
```typescript
export async function myFunction(param1: string, param2: number, session?: ClientSession) {
  return await withSession(async (session) => {
    // Your database operations here
    await SomeModel.save({ session });
  }, session);
}
```

**Multi-collection Operations**: Always use sessions:
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

**Route Handlers**: Use session utilities for complex operations:
```typescript
export const myRoute = async (req: Request, res: Response) => {
  try {
    const result = await withSession(async (session) => {
      // All database operations here
      return someResult;
    });
    res.json(result);
  } catch (error) {
    // Error handling
    res.status(500).json({ error: 'Operation failed' });
  }
};
```

### Key Requirements

1. **Session Reuse**: If a session is passed as parameter, reuse it - never create nested transactions
2. **Atomic Operations**: Related database changes must be in single transaction
3. **Proper Error Handling**: Use the utilities' built-in error handling
4. **Backward Compatibility**: Existing single-operation code should continue to work
5. **Environment Adaptability**: Code must work in both test (standalone) and production (replica set) environments

### Examples in Codebase

- `ColonyManager.addLogEntry()` - accepts and uses session parameter
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

## Trust These Instructions

These instructions have been validated by exploring the codebase and testing all build processes. Only search for additional information if these instructions are incomplete or found to be incorrect. The build commands, file locations, and architectural descriptions are accurate as of the last update.