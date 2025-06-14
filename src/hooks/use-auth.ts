import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { getCurrentUser as fetchCurrentUser } from '@/lib/mock-data'; // Using mock data

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would be an API call
    const currentUser = fetchCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  return { user, loading, isAuthenticated: !!user };
}
