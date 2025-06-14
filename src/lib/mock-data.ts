
import type { User } from './types';

export async function fetchUsers(): Promise<User[]> {
  try {
    const response = await fetch('/api/data/users.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Could not fetch users:", error);
    return [];
  }
}

export async function getCurrentUser(): Promise<User | null> {
  // Attempt to get user from session storage (simulating logged-in state)
  if (typeof window !== 'undefined') {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error("Error parsing user from session storage", e);
        // Fall through to fetching default if session storage is corrupt
      }
    }
  }
  
  // Fallback for server-side or if no user in session: get the first user from the list
  // This is a placeholder; in a real app, server-side auth would be different.
  console.warn("getCurrentUser falling back to fetching first user from users.json. This is for demo/SSR placeholder.");
  const users = await fetchUsers();
  return users.length > 0 ? users[0] : null;
}
