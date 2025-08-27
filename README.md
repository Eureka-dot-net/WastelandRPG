# Wasteland RPG

Welcome to *Wasteland RPG*, a text-based colony management simulation set in a harsh post-apocalyptic world. Build and lead your colony through survival challenges, managing settlers, resources, and threats in a gritty wasteland environment. This project is under active development, blending strategic decision-making with immersive lore inspired by games like RimWorld.

## Overview

- **Genre**: Text-based colony management simulation
- **Status**: Early alpha (as of August 27, 2025)
- **Goal**: Create a scalable, engaging sim with a planned Notoriety system to track your colony’s reputation and influence gameplay dynamics.
- **Tech Stack**:
  - **Backend**: Node.js (version of truth for data and logic)
  - **Frontend**: React (focuses on displaying state and facilitating player decisions)
  - **Future**: Mobile frontend (architecture to be confirmed, targeting MAUI or similar)

## Features

### Done
- **Login**: Basic authentication implemented, though token expiry issues need resolution.
- **Registration**: Allows new players to create accounts.
- **Initial Colonist Selection**: Players can choose their first settler from a generated pool, with lore-driven mechanics shaping the experience.

### In Progress
- **Homestead Cleanup**: Early implementation of the first survival task, where players manage their settler to clear debris and establish a foothold.

### To Do
- **Map**: Develop a wasteland map for navigation and exploration.
- **Settler Management**: Expand settler stats, skills, and traits with deeper management options.
- **Inventory**: Implement resource tracking and storage.
- **Crafting**: Add crafting mechanics for tools and items.
- **Farming**: Introduce food production to sustain the colony.
- **Defence**: Create systems to protect against raiders and threats.
- **Attack**: Enable offensive actions to expand or retaliate.
- **(Many More Things!)**: Future plans include events, morale systems, and more lore-driven content.

## Getting Started

### Prerequisites
- Node.js (latest LTS version recommended)
- npm or yarn
- MongoDB (for backend data storage)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/eureka.net/wasteland-rpg.git
   cd wasteland-rpg
   ```
2. Install dependencies:
   - Backend:
     ```bash
     cd backend
     npm install
     ```
   - Frontend:
     ```bash
     cd ../frontend
     npm install
     ```
3. Set up environment variables:
   - Create a `.env` file in the `backend` directory with your MongoDB URI and any API keys (e.g., `MONGO_URI=mongodb://localhost:27017/wasteland_rpg`).
4. Start the application:
   - Backend:
     ```bash
     cd backend
     npm run dev
     ```
   - Frontend:
     ```bash
     cd ../frontend
     npm run dev
     ```
5. Access the app at `http://localhost:3000` (or your configured port).

### Known Issues
- **Login Token Expiry**: Current implementation has token expiry bugs; work in progress to stabilize authentication.

## Development
- **Backend**: Built with Node.js, handling API routes for settler generation, selection, and future features. The database (MongoDB) serves as the version of truth.
- **Frontend**: React-based, designed to display game state and collect player inputs. Uses Material-UI for UI components and dynamic icon rendering via `react-icons`.
- **Mobile Plans**: Future mobile frontend TBD, likely using .NET MAUI for cross-platform support.

## Contributing
Contributions are welcome! Please fork the repository and submit pull requests with clear descriptions of changes. Focus areas include bug fixes (e.g., token expiry), feature development (e.g., homestead cleanup), and lore expansion.

## License
[MIT License] (or specify your preferred license) - Feel free to adjust based on your needs.

## Roadmap
- **Short-Term**: Resolve login issues, complete homestead cleanup, and add basic settler management.
- **Mid-Term**: Implement map and inventory systems, introduce Notoriety mechanics.
- **Long-Term**: Expand with crafting, farming, defence, attack, and a mobile release.

## Contact
For questions or feedback, reach out via the GitHub Issues page or [your email/contact info].