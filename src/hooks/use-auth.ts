
import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { getCurrentUser as fetchCurrentUserFromServer } from '@/lib/mock-data';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const currentUser = await fetchCurrentUserFromServer();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to fetch current user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
