import {
  createBrowserRouter,
  RouterProvider as ReactRouterProvider,
  Navigate,
} from "react-router";
import AuthRouter from "../Auth/router/AuthRouter";
import DashboardRouter from "../Dashboard/dashboardroute/DashboardRouter";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  ...AuthRouter,
  ...DashboardRouter,
]);

const RouterProvider = () => {
  return <ReactRouterProvider router={router}></ReactRouterProvider>;
};
export default RouterProvider;
