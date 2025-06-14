
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types';
import { z } from 'zod';

interface UserWithPasswordHash extends Omit<User, 'id' | 'bookmarkedPostIds'> {
  _id: ObjectId;
  passwordHash?: string;
  bookmarkedPostIds?: ObjectId[];
  notificationPreferences?: {
    emailNewPosts?: boolean;
    eventReminders?: boolean;
    mentionNotifications?: boolean;
  };
  privacy?: 'public' | 'private';
  updatedAt?: string; 
}

interface UserParams {
  params: { userId: string };
}

const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters.").optional(),
  bio: z.string().max(300, "Bio cannot exceed 300 characters.").optional().nullable(),
  avatarUrl: z.string().url("Please enter a valid URL for your avatar.").optional().nullable().or(z.literal('')),
  notificationPreferences: z.object({
    emailNewPosts: z.boolean().optional(),
    eventReminders: z.boolean().optional(),
    mentionNotifications: z.boolean().optional(),
  }).optional(),
  privacy: z.enum(['public', 'private']).optional(),
});


export async function GET(request: NextRequest, { params }: UserParams) {
  const { userId } = params;

  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection<UserWithPasswordHash>('users');

    const userDoc = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { passwordHash: 0 } }
    );

    if (!userDoc) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const userForClient: User = {
      ...userDoc,
      id: userDoc._id.toHexString(),
      bookmarkedPostIds: Array.isArray(userDoc.bookmarkedPostIds) ? userDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
      notificationPreferences: userDoc.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false },
      privacy: userDoc.privacy || 'public',
    };

    return NextResponse.json(userForClient, { status: 200 });
  } catch (error) {
    console.error(`API Error fetching user ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function PUT(request: NextRequest, { params }: UserParams) {
  const { userId: pathUserId } = params;

  if (!pathUserId || !ObjectId.isValid(pathUserId)) {
    return NextResponse.json({ message: 'Valid User ID in path is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid profile data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const validatedData = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<UserWithPasswordHash>('users');
    const userObjectId = new ObjectId(pathUserId);

    const existingUser = await usersCollection.findOne({ _id: userObjectId }, { projection: { name: 1, avatarUrl: 1 } });
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updatePayload: { $set: Partial<UserWithPasswordHash> } = {
        $set: { updatedAt: new Date().toISOString() }
    };

    if (validatedData.name !== undefined) {
      updatePayload.$set.name = validatedData.name;
    }
    
    if (validatedData.bio !== undefined) {
      updatePayload.$set.bio = validatedData.bio === null ? '' : validatedData.bio;
    }

    if (validatedData.avatarUrl !== undefined) {
      if (validatedData.avatarUrl === null || validatedData.avatarUrl === '') {
        const finalNameForAvatar = validatedData.name !== undefined ? validatedData.name : existingUser.name;
        updatePayload.$set.avatarUrl = `https://placehold.co/100x100.png?text=${(finalNameForAvatar || 'U').charAt(0)}`;
      } else {
        updatePayload.$set.avatarUrl = validatedData.avatarUrl;
      }
    }

    if (validatedData.notificationPreferences !== undefined) {
      updatePayload.$set.notificationPreferences = {
        emailNewPosts: validatedData.notificationPreferences.emailNewPosts ?? true,
        eventReminders: validatedData.notificationPreferences.eventReminders ?? true,
        mentionNotifications: validatedData.notificationPreferences.mentionNotifications ?? false,
      };
    }

    if (validatedData.privacy !== undefined) {
      updatePayload.$set.privacy = validatedData.privacy;
    }
        
    const updateResult = await usersCollection.updateOne(
      { _id: userObjectId },
      updatePayload 
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found during update operation.' }, { status: 404 });
    }
    
    // After update, fetch the document to return to the client
    const updatedUserDoc = await usersCollection.findOne(
        { _id: userObjectId },
        { projection: { passwordHash: 0 } }
    );

    if (!updatedUserDoc) {
        console.error(`User ${pathUserId} updated, but could not be re-fetched.`);
        return NextResponse.json({ message: 'Profile update operation failed. The document might not have been modified or an unexpected error occurred.' }, { status: 500 });
    }

    const updatedUserForClient: User = {
        ...updatedUserDoc,
        id: updatedUserDoc._id.toHexString(),
        bookmarkedPostIds: Array.isArray(updatedUserDoc.bookmarkedPostIds) ? updatedUserDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        notificationPreferences: updatedUserDoc.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false },
        privacy: updatedUserDoc.privacy || 'public',
    };

    return NextResponse.json({ message: 'Profile updated successfully!', user: updatedUserForClient }, { status: 200 });

  } catch (error) {
    console.error(`API Error updating user ${pathUserId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    if (error instanceof Error && error.message.toLowerCase().includes("input must be a 24 character hex string")) {
        return NextResponse.json({ message: 'Invalid User ID format provided in path.' }, { status: 400 });
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
