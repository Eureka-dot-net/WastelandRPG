import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import MapPage from "../../features/map/MapPage";
import Login from "../../features/account/Login";
import Register from "../../features/account/Register";
import App from "../layout/App";
import SettlerSelection from "../../features/settlerSelection/SettlerSelectionPage";
import DashboardLayout from "../layout/DashboardLayout"; // Import the layout component
import UnderConstruction from "../layout/UnderConstruction";
import QuestPage from "../../features/Quests/QuestPage";
import InventoryPage from "../../features/inventory/InventoryPage";
import SettlerPage from "../../features/settlers/SettlerPage";
import EventPage from "../../features/events/EventPage";
import LodgingPage from "../../features/lodging/LodgingPage";
import { ServerProvider } from "../../lib/contexts/ServerProvider";

const router = createBrowserRouter([
    {
        element: <App />,
        children: [
            // Public routes
            { path: "/login", element: <Login /> },
            { path: "/register", element: <Register /> },
            
            // Protected routes
            {
                element: <ServerProvider><ProtectedRoute /></ServerProvider>, // This is the gatekeeper
                children: [
                    // Protected routes with DashboardLayout
                    {
                        element: <DashboardLayout />, // This is the shared layout
                        children: [
                            { path: "/quests", element: <QuestPage /> }, 
                            { path: "/inventory", element: <InventoryPage /> },
                            { path: "/settlers", element: <SettlerPage /> },
                            { path: "/events", element: <EventPage /> },
                            { path: "/lodging", element: <LodgingPage /> },
                            { path: "/map", element: <MapPage /> },
                            { path: "/", element: <QuestPage /> },
                             { path: "*", element: <UnderConstruction /> },
                            // Add all other protected routes that need the DashboardLayout here
                        ]
                    },
                    // Protected routes WITHOUT DashboardLayout
                    { path: "/settler-selection", element: <SettlerSelection /> },
                ]
            }
        ],
    },
]);

export const AppRouter = () => {
    return <RouterProvider router={router} />;
};