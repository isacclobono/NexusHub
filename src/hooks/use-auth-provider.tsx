
'use client';

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import type { User } from '@/lib/types';
// No direct DB or bcrypt on client

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, pass: string) => Promise<boolean>; // Returns true on success, throws error on failure
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
        const parsedUser: User = JSON.parse(storedUser);
        // Ensure 'id' field is present, typically from _id.toHexString() on server
        if (parsedUser._id && !parsedUser.id) {
             parsedUser.id = typeof parsedUser._id === 'string' ? parsedUser._id : (parsedUser._id as any).toString();
        }
        setUser(parsedUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to load user from session:", error);
      sessionStorage.removeItem('currentUser'); // Clear potentially corrupted data
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

  const login = async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password: pass }),
      });

      const result = await response.json();

      if (response.ok && result.user) {
        const loggedInUser: User = result.user;
         if (loggedInUser._id && !loggedInUser.id) { // Ensure id is present from _id
            loggedInUser.id = typeof loggedInUser._id === 'string' ? loggedInUser._id : (loggedInUser._id as any).toString();
        }
        setUser(loggedInUser);
        sessionStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setLoading(false);
        return true; // Indicate success
      } else {
        setLoading(false);
        throw new Error(result.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error in AuthProvider:", error);
      setLoading(false);
      throw error; // Re-throw for the login page to handle
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<{ success: boolean, message?: string, user?: User }> => {
    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.toLowerCase(), password: pass }),
      });

      const result = await response.json();

      if (!response.ok) {
        // API returned an error (e.g., email exists, validation failure)
        return { success: false, message: result.message || `Registration failed: ${response.statusText}` };
      }
      // Registration successful, result.user should contain the new user object (client-safe version)
      return { success: true, message: result.message, user: result.user };
    } catch (error) {
      console.error("Registration API call error:", error);
      const message = error instanceof Error ? error.message : "An unexpected network error occurred during registration.";
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
    // Optionally, could call an /api/logout endpoint if server-side session/token invalidation is needed
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
