
import type { User } from './types';

// This file is now significantly reduced.
// Data is primarily fetched from /public/api/data/*.json files.

// getCurrentUser can fetch a specific user from users.json or be simplified
// For now, let's assume it fetches the first user as the current user.
// In a real app, this would involve actual authentication.
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
  const users = await fetchUsers();
  return users.length > 0 ? users[0] : null;
}

// The mock arrays (mockUsers, mockPosts, etc.) are removed as data is in JSON files.
// Functions that directly manipulated these arrays, like adding a new post to mockPosts,
// will need to be rethought if persistence is required (e.g., using a proper backend API).
