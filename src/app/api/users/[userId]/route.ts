
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
      // Ensure bookmarkedPostIds is an array of ObjectIds if it exists, or empty array
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

  // In a real app, you'd get the authenticated user's ID from a session/token
  // For now, we'll assume the client is honest or this is handled by a higher-level auth middleware
  // const authenticatedUserId = "get_this_from_session_or_token"; 
  // if (pathUserId !== authenticatedUserId) {
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

    const updateData: Partial<UserWithPasswordHash> = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio ?? ''; // Handle null to empty string
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl ?? `https://placehold.co/100x100.png?text=${name ? name.charAt(0) : 'U'}`;


    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No update fields provided.' }, { status: 400 });
    }
    
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(pathUserId) },
      { $set: updateData },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    );

    if (!result.value) {
      return NextResponse.json({ message: 'User not found or update failed.' }, { status: 404 });
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
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
