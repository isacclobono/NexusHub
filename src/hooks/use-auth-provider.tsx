
'use client';

import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import type { User } from '@/lib/types';

// Helper to fetch users from the static JSON file
async function fetchAllUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/data/users.json');
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
  register: (name: string, email: string, pass: string) => Promise<boolean>;
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
      setUser(null); // Ensure user is null on error
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
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 750));
    try {
      const allUsers = await fetchAllUsers();
      const normalizedInput = emailOrUsername.toLowerCase();
      
      const foundUser = allUsers.find(u =>
        u.email?.toLowerCase() === normalizedInput ||
        u.name.toLowerCase() === normalizedInput
      );

      if (foundUser) {
        // Simulate password check - THIS IS NOT SECURE FOR PRODUCTION
        // Passwords in users.json are plain text for this demo.
        const passwordMatches = foundUser.password === pass;

        if (passwordMatches) {
            setUser(foundUser);
            sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
            setLoading(false);
            return true;
        }
      }
      setLoading(false);
      return false;
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      return false;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const allUsers = await fetchAllUsers();
    const emailExists = allUsers.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (emailExists) {
      console.warn("Registration attempt with existing email:", email);
      setLoading(false);
      return false; // Indicate failure if email exists
    }

    // Simulate successful registration.
    // IMPORTANT: This new user is NOT saved to users.json.
    // To test login with this account, you must manually add it to public/api/data/users.json,
    // including a 'password' field.
    console.warn(
      `Simulated registration for: {name: "${name}", email: "${email}"}. ` +
      "This new user is NOT saved to users.json. " +
      "To test login with this account, manually add it to public/api/data/users.json with a password."
    );
    
    if (name && email && pass && pass.length >=8) { 
      setLoading(false);
      return true; // Indicate success for valid input
    }

    setLoading(false);
    return false; // Indicate failure for other issues (e.g. invalid input)
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('currentUser');
    // Optional: redirect to login or home page can be handled in the component calling logout
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
