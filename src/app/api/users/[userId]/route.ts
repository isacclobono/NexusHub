
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types';
import { z } from 'zod';

// Server-side user document type including passwordHash
interface UserWithPasswordHash extends Omit<User, 'id' | 'bookmarkedPostIds'> {
  _id: ObjectId;
  passwordHash?: string; // passwordHash can be optional if we are not fetching it always
  bookmarkedPostIds?: ObjectId[];
  notificationPreferences?: {
    emailNewPosts?: boolean;
    eventReminders?: boolean;
    mentionNotifications?: boolean;
  };
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
      notificationPreferences: userDoc.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false } // Provide defaults if not set
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
    const { name, bio, avatarUrl, notificationPreferences } = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<UserWithPasswordHash>('users');
    const userObjectId = new ObjectId(pathUserId);

    const existingUser = await usersCollection.findOne({ _id: userObjectId }, { projection: { name: 1 } });
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updateData: Partial<Omit<UserWithPasswordHash, '_id' | 'passwordHash'>> & { updatedAt: string } = {
        updatedAt: new Date().toISOString(),
    };


    if (name !== undefined) {
      updateData.name = name;
    }
    if (bio !== undefined) {
      updateData.bio = bio === null ? '' : bio;
    }
    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        const finalNameForAvatar = name !== undefined ? name : existingUser.name;
        updateData.avatarUrl = `https://placehold.co/100x100.png?text=${(finalNameForAvatar || 'U').charAt(0)}`;
      } else {
        updateData.avatarUrl = avatarUrl;
      }
    }
    if (notificationPreferences !== undefined) {
        updateData.notificationPreferences = notificationPreferences;
    }


    // Check if only updatedAt is present, meaning no actual user-editable field was changed
    // This check is now more for informational purposes, as updatedAt will always be there.
    const updateKeys = Object.keys(updateData);
    if (updateKeys.length === 1 && updateKeys[0] === 'updatedAt' &&
        name === undefined && bio === undefined && avatarUrl === undefined && notificationPreferences === undefined) {
        // No actual change other than potentially updatedAt (which we always set)
        // It's better to proceed with the update to ensure `updatedAt` is refreshed
        // and to reflect the "save" action.
        // So, we don't return early here anymore.
    }

    const result = await usersCollection.findOneAndUpdate(
      { _id: userObjectId },
      { $set: updateData },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );

    if (!result.value) {
      console.error(`User ${pathUserId} found initially but findOneAndUpdate failed. Update data:`, updateData);
      return NextResponse.json({ message: 'Profile update operation failed unexpectedly. The document might not have been modified.' }, { status: 500 });
    }

    const updatedUserForClient: User = {
        ...result.value,
        id: result.value._id.toHexString(),
        bookmarkedPostIds: Array.isArray(result.value.bookmarkedPostIds) ? result.value.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        notificationPreferences: result.value.notificationPreferences || { emailNewPosts: true, eventReminders: true, mentionNotifications: false },
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
