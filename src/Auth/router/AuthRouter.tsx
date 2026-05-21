import type { RouteObject } from "react-router";
import AuthLayout from "../Layout/AuthLayout";
import Login from "../Pages/Login";
import GuestRoute from "../guards/GuestRoute";

const routes: RouteObject[] = [
  {
    element: <GuestRoute />,
    children: [
      {
        path: "/auth",
        element: <AuthLayout />,
        children: [
          {
            index: true,
            element: <Login />,
          },
        ],
      },
    ],
  },
];
export default routes;
