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
- MongoDB running locally (for development)
- npm or yarn package manager

### Environment Setup

**ALWAYS set up environment variables before running the API:**

API requires `.env` file in `API/` directory:
```bash
MONGO_URI=mongodb://localhost:27017/wasteland_rpg
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=development
```

For testing, create `.env.test`:
```bash
MONGO_URI=mongodb://localhost:27017/wasteland_rpg_test  
NODE_ENV=test
```

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
- **Important**: Tests require internet access to download MongoDB Memory Server binary
- **Fallback**: If memory server fails, tests attempt local MongoDB connection
- Test timeout: 10 seconds (increase if needed with `jest.setTimeout()`)
- Run time: ~30-60 seconds (depending on MongoDB setup)

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

**Client Development Server:**
```bash
cd Client  
npm run dev  # Starts Vite dev server
```
- Hot module reloading enabled
- Default port: 5173 (Vite default)

### Common Issues & Workarounds

1. **MongoDB Connection Errors**: 
   - Ensure MongoDB is running: `mongod --dbpath /data/db`
   - Check MONGO_URI environment variable is set
   - For tests, ensure internet access for Memory Server download

2. **Test Timeouts**: 
   - Tests may timeout due to MongoDB setup delays
   - Increase timeout in `jest.config.js` if needed
   - Consider using local MongoDB instead of Memory Server

3. **Large Bundle Size**: 
   - Client build warns about 7.5MB bundle size
   - Consider dynamic imports for code splitting
   - Material-UI and react-icons contribute significantly to size

4. **Environment Variables**: 
   - API will fail to start without proper `.env` setup
   - Tests require `.env.test` or fallback to local MongoDB

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

## Rules for All Coding Tasks

1. **Keep Files Updated**: Any file you create or modify must be kept current with the codebase
2. **Update README**: Keep README.md files updated when making structural changes
3. **CI/CD Must Pass**: Ensure build, lint, and test processes pass for successful deployment
4. **Mobile-First Design**: All design decisions must consider mobile user experience
5. **API Authority**: The API is the version of truth - client is only for display and user interaction

## Trust These Instructions

These instructions have been validated by exploring the codebase and testing all build processes. Only search for additional information if these instructions are incomplete or found to be incorrect. The build commands, file locations, and architectural descriptions are accurate as of the last update.