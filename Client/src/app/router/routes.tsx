import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import MapPage from "../../features/map/MapPage";
import Login from "../../features/account/Login";
import Register from "../../features/account/Register";
import App from "../layout/App";
import SettlerSelection from "../../features/settlerSelection/SettlerSelectionPage";
import DashboardLayout from "../layout/DashboardLayout"; // Import the layout component
import AssignmentPage from "../../features/Assignments/AssignmentPage";
import UnderConstruction from "../layout/UnderConstruction";
import InventoryPage from "../../features/inventory/InventoryPage";

const router = createBrowserRouter([
    {
        element: <App />,
        children: [
            // Public routes
            { path: "/login", element: <Login /> },
            { path: "/register", element: <Register /> },
            
            // Protected routes
            {
                element: <ProtectedRoute />, // This is the gatekeeper
                children: [
                    // Protected routes with DashboardLayout
                    {
                        element: <DashboardLayout />, // This is the shared layout
                        children: [
                            { path: "/assignments", element: <AssignmentPage serverId={"server-1"} /> }, 
                            { path: "/inventory", element: <InventoryPage serverId={"server-1"} /> },
                            { path: "/map", element: <MapPage /> },
                            { path: "/", element: <AssignmentPage serverId={"server-1"} /> },
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