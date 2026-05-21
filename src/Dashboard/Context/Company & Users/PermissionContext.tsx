import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import {
  IconUserShield,
  IconBuilding,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";

export type Permission = {
  name: string;
  description: string;
};

export type Role = {
  name: string;
  icon: React.ReactNode;
  description: string;
  users: number;
  permissions: Permission[];
};

const rolesData: Role[] = [
  {
    name: "Super Admin",
    icon: <IconUserShield size={20} color="red" />,
    description: "Full system access with all permissions",
    users: 2,
    permissions: [
      { name: "Dashboard", description: "View dashboard and analytics" },
      { name: "Company Management", description: "Manage company profiles" },
      { name: "User Management", description: "Manage user accounts" },
      { name: "Chart of Accounts", description: "Manage account structure" },
      { name: "Invoicing", description: "Create and manage invoices" },
      {
        name: "Product Management",
        description: "Manage inventory and products",
      },
      { name: "Reports & Analytics", description: "View and export reports" },
      { name: "Cash Management", description: "Handle cash transactions" },
      { name: "Journal Entries", description: "Create journal vouchers" },
      { name: "Tax Management", description: "Manage GST and tax invoices" },
    ],
  },
  {
    name: "Company Admin",
    icon: <IconBuilding size={20} color="blue" />,
    description: "Company-level administration and management",
    users: 5,
    permissions: [
      { name: "Dashboard", description: "View dashboard and analytics" },
      { name: "Company Management", description: "Manage company profiles" },
      { name: "User Management", description: "Manage user accounts" },
      { name: "Reports & Analytics", description: "View and export reports" },
    ],
  },
  {
    name: "Accounts User",
    icon: <IconUser size={20} color="green" />,
    description: "Accounting and financial operations",
    users: 8,
    permissions: [
      { name: "Invoicing", description: "Create and manage invoices" },
      { name: "Cash Management", description: "Handle cash transactions" },
      { name: "Journal Entries", description: "Create journal vouchers" },
      { name: "Tax Management", description: "Manage GST and tax invoices" },
    ],
  },
  {
    name: "Staff",
    icon: <IconUsers size={20} color="gray" />,
    description: "Basic operations and data entry",
    users: 12,
    permissions: [
      { name: "Dashboard", description: "View dashboard and analytics" },
      {
        name: "Product Management",
        description: "Manage inventory and products",
      },
    ],
  },
];

type PermissionContextType = {
  roles: Role[];
  selectedRole: Role;
  enabledPermissions: string[];
  setSelectedRole: (role: Role) => void;
  togglePermission: (perm: string) => void;
};

const PermissionContext = createContext<PermissionContextType | undefined>(
  undefined
);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const firstRole = rolesData?.[0];
  const [selectedRole, setSelectedRole] = useState<Role | null>(firstRole ?? null);

  const [enabledPermissions, setEnabledPermissions] = useState<string[]>(
    firstRole?.permissions
      ?.filter((p) => p?.name)
      ?.map((p) => p.name) ?? []
  );

  const togglePermission = (perm: string) => {
    setEnabledPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  if (!selectedRole) {
    return <div>Loading permissions...</div>;
  }

  return (
    <PermissionContext.Provider
      value={{
        roles: rolesData,
        selectedRole,
        setSelectedRole,
        enabledPermissions,
        togglePermission,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}


export const usePermissionContext = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx)
    throw new Error(
      "usePermissionContext must be used within PermissionProvider"
    );
  return ctx;
};
