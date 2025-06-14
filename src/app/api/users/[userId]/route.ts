
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
  updatedAt?: string; // Ensure updatedAt is part of the type
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
    
    // Use validated data directly
    const { name, bio, avatarUrl, notificationPreferences, privacy } = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<UserWithPasswordHash>('users');
    const userObjectId = new ObjectId(pathUserId);

    const existingUser = await usersCollection.findOne({ _id: userObjectId }, { projection: { name: 1 } });
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updatePayload: Partial<Omit<UserWithPasswordHash, '_id' | 'passwordHash'>> & { updatedAt: string } = {
        updatedAt: new Date().toISOString(), // This will always be new
    };

    if (name !== undefined) {
      updatePayload.name = name;
    }
    
    // Handle bio: if present in validated data (even if null), set it.
    // If bio is explicitly set to null or empty string, it will be stored as empty string.
    if (bio !== undefined) {
      updatePayload.bio = bio === null ? '' : bio;
    }

    // Handle avatarUrl: if present in validated data, process it.
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        // Use current name from validated data if available, else existing name
        const finalNameForAvatar = name !== undefined ? name : existingUser.name;
        updatePayload.avatarUrl = `https://placehold.co/100x100.png?text=${(finalNameForAvatar || 'U').charAt(0)}`;
      } else {
        updatePayload.avatarUrl = avatarUrl;
      }
    }

    if (notificationPreferences !== undefined) {
      // Ensure all keys are present with defaults if some are missing from client
      updatePayload.notificationPreferences = {
        emailNewPosts: notificationPreferences.emailNewPosts ?? true,
        eventReminders: notificationPreferences.eventReminders ?? true,
        mentionNotifications: notificationPreferences.mentionNotifications ?? false,
      };
    }

    if (privacy !== undefined) {
      updatePayload.privacy = privacy;
    }
    
    const result = await usersCollection.findOneAndUpdate(
      { _id: userObjectId },
      { $set: updatePayload },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );

    if (!result.value) {
      // This is the problematic spot. If result.value is null, the update didn't return the document.
      // This can happen if the document was not found (but we check 'existingUser')
      // OR if the update operation resulted in no actual change to the document's fields
      // (other than potentially _id or fields not in projection) and MongoDB + driver optimize.
      // The `updatedAt` field *should* prevent this.
      console.error(`User ${pathUserId} found initially. Update payload: ${JSON.stringify(updatePayload)}. findOneAndUpdate returned no document.`);
      return NextResponse.json({ message: 'Profile update operation failed. The document might not have been modified or an unexpected error occurred.' }, { status: 500 });
    }

    const updatedUserForClient: User = {
        ...(result.value as Omit<UserWithPasswordHash, 'passwordHash'>), // Cast because passwordHash is projected out
        id: result.value._id.toHexString(),
        bookmarkedPostIds: Array.isArray(result.value.bookmarkedPostIds) ? result.value.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        // Ensure these have defaults if they somehow become undefined after update (shouldn't happen with proper $set)
        notificationPreferences: result.value.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false },
        privacy: result.value.privacy || 'public',
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
