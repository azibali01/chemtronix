import { useAuth } from "../Auth/Context/AuthContext";

/**
 * Returns true if the logged-in user has at least one of the required roles.
 * If no user is authenticated, returns false.
 *
 * Role values (must match backend exactly, including spaces):
 *   'Super Admin' | 'Company Admin' | 'Accounts User' | 'Staff'
 */
export function useAuthorization(requiredRoles: string | string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(user.role);
}
