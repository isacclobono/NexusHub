
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/types'; // Assuming User type doesn't include passwordHash

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection<Omit<User, 'id' | '_id'> & { _id: import('mongodb').ObjectId, passwordHash: string }>('users');

    const foundUserDoc = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!foundUserDoc) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 }); // User not found
    }

    const passwordIsValid = await bcrypt.compare(password, foundUserDoc.passwordHash);

    if (!passwordIsValid) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 }); // Incorrect password
    }

    // Prepare user object for client, excluding passwordHash
    const userToReturn: User = {
      _id: foundUserDoc._id,
      id: foundUserDoc._id.toHexString(),
      name: foundUserDoc.name,
      email: foundUserDoc.email,
      avatarUrl: foundUserDoc.avatarUrl,
      bio: foundUserDoc.bio,
      reputation: foundUserDoc.reputation,
      joinedDate: foundUserDoc.joinedDate,
    };

    return NextResponse.json({ message: 'Login successful!', user: userToReturn }, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during login.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
