
import { NextRequest, NextResponse } from 'next/server';
import getDb from '../../../lib/mongodb'; // Changed path
import * as bcrypt from 'bcryptjs'; // Changed import style
import type { User } from '../../../lib/types'; // Changed path
import { ObjectId } from 'mongodb';

// DB model for user creation, ensuring all fields are potentially present for insertion
interface NewUserDbDocument {
  name: string;
  email: string;
  passwordHash: string;
  reputation: number;
  joinedDate: string;
  avatarUrl?: string;
  bio?: string;
  _id?: ObjectId;
  privacy: 'public' | 'private';
  updatedAt: string; // Added for consistency
  bookmarkedPostIds?: ObjectId[];
  communityIds?: ObjectId[];
  notificationPreferences?: User['notificationPreferences'];
  // Explicitly exclude reset token fields on registration
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

    const db = await getDb();
    const usersCollection = db.collection<NewUserDbDocument>('users');

    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ message: 'Email already in use. Please try a different email.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const currentDate = new Date().toISOString();

    const newUserDocument: NewUserDbDocument = {
      name,
      email: email.toLowerCase(),
      passwordHash,
      reputation: 0,
      joinedDate: currentDate,
      updatedAt: currentDate,
      avatarUrl: `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase()}`,
      bio: '',
      privacy: 'public',
      bookmarkedPostIds: [],
      communityIds: [],
      notificationPreferences: {
        emailNewPosts: true,
        eventReminders: true,
        mentionNotifications: true,
      },
    };

    const result = await usersCollection.insertOne(newUserDocument);

    if (!result.insertedId) {
        throw new Error('Failed to insert user into database.');
    }

    // Prepare user object for client, excluding sensitive fields
    const createdUserForClient: User = {
        _id: result.insertedId,
        id: result.insertedId.toHexString(),
        name: newUserDocument.name,
        email: newUserDocument.email,
        reputation: newUserDocument.reputation,
        joinedDate: newUserDocument.joinedDate,
        avatarUrl: newUserDocument.avatarUrl,
        bio: newUserDocument.bio,
        privacy: newUserDocument.privacy,
        bookmarkedPostIds: newUserDocument.bookmarkedPostIds,
        communityIds: newUserDocument.communityIds,
        notificationPreferences: newUserDocument.notificationPreferences,
        updatedAt: newUserDocument.updatedAt,
    };

    return NextResponse.json({ message: 'User registered successfully!', user: createdUserForClient }, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during registration.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
