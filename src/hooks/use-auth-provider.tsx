
'use client';

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { ObjectId } from 'mongodb';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, pass: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean, message?: string, user?: User }>;
  refreshUser: () => Promise<void>; // Added to refresh user data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromSession = useCallback(async (bypassCache = false) => {
    setLoading(true);
    try {
      const storedUserString = sessionStorage.getItem('currentUser');
      if (storedUserString) {
        const parsedUser: User = JSON.parse(storedUserString);
        if (parsedUser._id && !parsedUser.id) {
             parsedUser.id = typeof parsedUser._id === 'string' ? parsedUser._id : (parsedUser._id as any).toString();
        }

        if (bypassCache && parsedUser.id) { // If bypassCache, refetch from DB
            const response = await fetch(`/api/users/${parsedUser.id}`);
            if (response.ok) {
                const freshUser = await response.json();
                setUser(freshUser);
                sessionStorage.setItem('currentUser', JSON.stringify(freshUser));
            } else { // Fallback to cached user if refresh fails, or log out
                console.warn("Failed to refresh user data, using cached version.");
                setUser(parsedUser);
            }
        } else {
            setUser(parsedUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to load user from session:", error);
      sessionStorage.removeItem('currentUser'); 
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (user && user.id) {
      await loadUserFromSession(true); // true to bypass cache and refetch
    }
  }, [user, loadUserFromSession]);

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
         if (loggedInUser._id && !loggedInUser.id) { 
            loggedInUser.id = typeof loggedInUser._id === 'string' ? loggedInUser._id : (loggedInUser._id as any).toString();
        }
        // Ensure bookmarkedPostIds is an array, even if undefined from API
        loggedInUser.bookmarkedPostIds = loggedInUser.bookmarkedPostIds || [];
        setUser(loggedInUser);
        sessionStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setLoading(false);
        return true; 
      } else {
        setLoading(false);
        throw new Error(result.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error in AuthProvider:", error);
      setLoading(false);
      throw error; 
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
        return { success: false, message: result.message || `Registration failed: ${response.statusText}` };
      }
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
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user && !loading, login, logout, register, refreshUser }}>
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
