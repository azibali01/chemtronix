import { Navigate, Outlet } from "react-router";
import { useAuth } from "../Context/AuthContext";

const GuestRoute = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export default GuestRoute;
