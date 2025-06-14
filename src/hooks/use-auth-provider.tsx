
'use client';

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import type { User } from '@/lib/types';

// Helper to fetch users from the static JSON file (for login check)
async function fetchAllUsers(): Promise<User[]> {
  try {
    // Add cache-busting parameter to ensure fresh data after registration
    const response = await fetch(`/api/data/users.json?v=${Date.now()}`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error("Could not fetch users:", error);
    return [];
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, pass: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean, message?: string, user?: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromSession = useCallback(() => {
    setLoading(true);
    try {
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to load user from session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromSession();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'currentUser') {
        loadUserFromSession();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadUserFromSession]);

  const login = async (emailOrUsername: string, pass: string): Promise<boolean> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 750)); // Simulate API delay
    try {
      const allUsers = await fetchAllUsers();
      const normalizedInput = emailOrUsername.toLowerCase();
      
      const foundUser = allUsers.find(u =>
        u.email?.toLowerCase() === normalizedInput || // Ensure email is checked
        u.name.toLowerCase() === normalizedInput
      );

      if (foundUser && foundUser.password === pass) { // Check password
        setUser(foundUser);
        sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      return false;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<{ success: boolean, message?: string, user?: User }> => {
    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password: pass }), // pass 'password' field
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, message: result.message || `Registration failed with status: ${response.status}` };
      }
      // Do not automatically log in the user after registration for this flow.
      // User will be redirected to login page.
      return { success: true, message: result.message, user: result.user };
    } catch (error) {
      console.error("Registration API call error:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred during registration.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user && !loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
