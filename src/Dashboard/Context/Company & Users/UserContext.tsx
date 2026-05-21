import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
type User = {
  _id?: string;
  fullName: string;
  password?: string;
  role: string;
  roleColor: string;
  lastLogin: string;
};

type UserContextType = {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addUser: (user: User) => void;
  updateUser: (index: number, user: User) => void;
  deleteUser: (index: number) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>([
   
  ]);

  const addUser = (user: User) => {
    setUsers((prev) => [...prev, user]);
  };

  const updateUser = (index: number, updatedUser: User) => {
    setUsers((prev) => {
      const copy = [...prev];
      copy[index] = updatedUser;
      return copy;
    });
  };

  const deleteUser = (index: number) => {
    setUsers((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <UserContext.Provider
      value={{ users, setUsers, addUser, updateUser, deleteUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useUserContext must be used within UserProvider");
  return context;
};
