
import type { User } from './types';

export async function fetchUsers(): Promise<User[]> {
  try {
    // Add cache-busting parameter to ensure fresh data after registration
    const response = await fetch(`/api/data/users.json?v=${Date.now()}`);
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
        sessionStorage.removeItem('currentUser'); // Clear corrupted data
        return null;
      }
    }
  }
  // If not in session storage (e.g., first load, or SSR context where window is undefined), return null.
  // AuthProvider will handle the actual loading from session storage on the client side.
  return null;
}
