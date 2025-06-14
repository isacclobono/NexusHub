
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
}

interface UserParams {
  params: { userId: string };
}

const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters.").optional(),
  bio: z.string().max(300, "Bio cannot exceed 300 characters.").optional().nullable(),
  avatarUrl: z.string().url("Please enter a valid URL for your avatar.").optional().nullable().or(z.literal('')),
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

  // Basic Authorization: In a real app, get current user ID from session/token and verify ownership
  // For example: const { currentUserIdFromSession } = await getSessionFromRequest(request);
  // if (pathUserId !== currentUserIdFromSession) {
  //   return NextResponse.json({ message: 'Unauthorized to update this profile.' }, { status: 403 });
  // }

  try {
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid profile data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, bio, avatarUrl } = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<UserWithPasswordHash>('users');
    const userObjectId = new ObjectId(pathUserId);

    // First, check if the user exists
    const existingUser = await usersCollection.findOne({ _id: userObjectId }, { projection: { name: 1 } }); // Fetch only name for avatar logic
    if (!existingUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updateData: Partial<Omit<UserWithPasswordHash, '_id'>> = {};

    if (name !== undefined) {
      updateData.name = name;
    }
    if (bio !== undefined) { // bio can be null to clear it, or a string
      updateData.bio = bio === null ? '' : bio; // Store null as empty string or keep provided bio
    }
    if (avatarUrl !== undefined) { // avatarUrl can be null/empty to reset, or a new URL
      if (avatarUrl === null || avatarUrl === '') {
        // User wants to reset to default placeholder
        const finalNameForAvatar = name !== undefined ? name : existingUser.name; // Use new name if provided in this update, else existing name
        updateData.avatarUrl = `https://placehold.co/100x100.png?text=${(finalNameForAvatar || 'U').charAt(0)}`;
      } else {
        // User provided a specific URL
        updateData.avatarUrl = avatarUrl;
      }
    }

    if (Object.keys(updateData).length === 0) {
      // If no actual data to update, we can return the existing user or a "no changes" message.
      // For simplicity, let's fetch and return the current user data.
      const currentUserDoc = await usersCollection.findOne({ _id: userObjectId }, { projection: { passwordHash: 0 } });
      if (!currentUserDoc) return NextResponse.json({ message: 'User not found after attempting no-op update.' }, { status: 404 });
       const userForClient: User = {
        ...currentUserDoc,
        id: currentUserDoc._id.toHexString(),
        bookmarkedPostIds: Array.isArray(currentUserDoc.bookmarkedPostIds) ? currentUserDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
      };
      return NextResponse.json({ message: 'No update fields provided. Current profile data returned.', user: userForClient }, { status: 200 });
    }
    
    const result = await usersCollection.findOneAndUpdate(
      { _id: userObjectId },
      { $set: updateData },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );

    if (!result.value) { 
      // This case should be rare if existingUser was found, but indicates an issue with the update itself
      console.error(`User ${pathUserId} found initially but findOneAndUpdate failed. Update data:`, updateData);
      return NextResponse.json({ message: 'Profile update operation failed unexpectedly.' }, { status: 500 });
    }
    
    const updatedUserForClient: User = {
        ...result.value,
        id: result.value._id.toHexString(),
        bookmarkedPostIds: Array.isArray(result.value.bookmarkedPostIds) ? result.value.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
    };

    return NextResponse.json({ message: 'Profile updated successfully!', user: updatedUserForClient }, { status: 200 });

  } catch (error) {
    console.error(`API Error updating user ${pathUserId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    // Check for ObjectId format error specifically
    if (error instanceof Error && error.message.toLowerCase().includes("input must be a 24 character hex string")) {
        return NextResponse.json({ message: 'Invalid User ID format provided in path.' }, { status: 400 });
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


    