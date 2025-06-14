
'use client';

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import type { User } from '@/lib/types';
import getDb from '@/lib/mongodb'; // We can't use getDb directly in client components. Login will call an API.
import bcrypt from 'bcryptjs'; // bcrypt also cannot be used directly on client for comparison with DB hash.

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
        const parsedUser = JSON.parse(storedUser);
        // Ensure _id is correctly handled if it exists from MongoDB responses
        if (parsedUser._id && !parsedUser.id) {
          parsedUser.id = typeof parsedUser._id === 'string' ? parsedUser._id : parsedUser._id.toString();
        }
        setUser(parsedUser);
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
    try {
      // Client-side login will now call an API route for authentication
      const response = await fetch('/api/login', { // Assuming /api/login route will be created
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUsername.toLowerCase(), password: pass }),
      });

      const result = await response.json();

      if (response.ok && result.user) {
        const loggedInUser = result.user;
        // Ensure _id is mapped to id if not already present
        if (loggedInUser._id && !loggedInUser.id) {
            loggedInUser.id = typeof loggedInUser._id === 'string' ? loggedInUser._id : loggedInUser._id.toString();
        }
        setUser(loggedInUser);
        sessionStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setLoading(false);
        return true;
      } else {
        setLoading(false);
        // Use message from API if available, otherwise a generic one
        throw new Error(result.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      // Rethrow or handle as appropriate for UI
      throw error; // Let the login page handle displaying this error
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
        body: JSON.stringify({ name, email, password: pass }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, message: result.message || `Registration failed with status: ${response.status}` };
      }
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
    // Optionally call a /api/logout endpoint if server-side session needs cleanup
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
