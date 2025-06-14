
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { User } from '@/lib/types';

// IMPORTANT:
// This API route directly manipulates a JSON file for data storage.
// This is suitable for demos or very small projects running locally.
// - It is NOT secure for production (e.g., plain text passwords).
// - It does NOT scale well.
// - File system access can be problematic in many serverless deployment environments (read-only or ephemeral file systems).
// - Concurrent writes can lead to data corruption without proper locking mechanisms.
// For production, use a proper database.

const usersFilePath = path.join(process.cwd(), 'public', 'api', 'data', 'users.json');

async function readUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(usersFilePath, 'utf-8');
    return JSON.parse(data) as User[];
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array or handle error
    console.error('Error reading users.json:', error);
    return [];
  }
}

async function writeUsers(users: User[]): Promise<void> {
  try {
    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing users.json:', error);
    throw new Error('Could not save user data.'); // Propagate error to be caught by handler
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields: name, email, and password.' }, { status: 400 });
    }
    if (password.length < 8) {
        return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }


    const users = await readUsers();

    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return NextResponse.json({ message: 'Email already in use. Please try a different email.' }, { status: 409 }); // 409 Conflict
    }

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // More unique ID
      name,
      email,
      password, // Storing plain text password - NOT FOR PRODUCTION
      reputation: 0,
      joinedDate: new Date().toISOString(),
      avatarUrl: `https://placehold.co/100x100.png?text=${name.charAt(0)}`, // Basic placeholder
      bio: '',
    };

    users.push(newUser);
    await writeUsers(users);

    // Do not return the password in the response
    const { password: _removedPassword, ...userWithoutPassword } = newUser;
    return NextResponse.json({ message: 'User registered successfully!', user: userWithoutPassword }, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during registration.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
