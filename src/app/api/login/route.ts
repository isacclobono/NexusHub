
import { NextRequest, NextResponse } from 'next/server';
import getDb from '../../../lib/mongodb'; // Changed path
import * as bcrypt from 'bcryptjs';
import type { User } from '../../../lib/types'; // Changed path
import type { ObjectId } from 'mongodb';

// Server-side user document type including passwordHash and reset fields
interface UserWithSensitiveFields extends Omit<User, 'id'> {
  _id: ObjectId;
  passwordHash: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection<UserWithSensitiveFields>('users');

    const foundUserDoc = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!foundUserDoc) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // Ensure passwordHash exists before comparing
    if (!foundUserDoc.passwordHash) {
        console.warn(`User ${email} found but has no passwordHash set. Login denied.`);
        return NextResponse.json({ message: 'Account issue. Please contact support or try password reset.' }, { status: 401 });
    }

    const passwordIsValid = await bcrypt.compare(password, foundUserDoc.passwordHash);

    if (!passwordIsValid) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // Prepare user object for client, excluding sensitive fields
    const userToReturn: User = {
      _id: foundUserDoc._id,
      id: foundUserDoc._id.toHexString(),
      name: foundUserDoc.name,
      email: foundUserDoc.email,
      avatarUrl: foundUserDoc.avatarUrl,
      bio: foundUserDoc.bio,
      reputation: foundUserDoc.reputation,
      joinedDate: foundUserDoc.joinedDate,
      // Ensure these are arrays on the client-side user object
      bookmarkedPostIds: Array.isArray(foundUserDoc.bookmarkedPostIds) ? foundUserDoc.bookmarkedPostIds : [],
      communityIds: Array.isArray(foundUserDoc.communityIds) ? foundUserDoc.communityIds : [],
      notificationPreferences: foundUserDoc.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false },
      privacy: foundUserDoc.privacy || 'public',
    };

    return NextResponse.json({ message: 'Login successful!', user: userToReturn }, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during login.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
