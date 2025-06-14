
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User } from '@/lib/types';
import { z } from 'zod';

interface CommunityParams {
  params: { communityId: string };
}

// Database document type
type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount'> & {
  _id: ObjectId;
};

const communityUpdateSchema = z.object({
  userId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid User ID format." }), // ID of user attempting the update
  name: z.string().min(3, 'Community name must be at least 3 characters.').max(100).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(1000).optional(),
  privacy: z.enum(['public', 'private']).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
});


export async function GET(request: NextRequest, { params }: CommunityParams) {
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<User>('users');

    const communityDoc = await communitiesCollection.findOne({ _id: new ObjectId(communityId) });

    if (!communityDoc) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    const creatorDoc = await usersCollection.findOne({ _id: communityDoc.creatorId }, { projection: { passwordHash: 0 } });
    const creatorForClient: User | undefined = creatorDoc ? {
      ...creatorDoc,
      id: creatorDoc._id.toHexString(),
      bookmarkedPostIds: Array.isArray(creatorDoc.bookmarkedPostIds) ? creatorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
    } : undefined;

    const enrichedCommunity: Community = {
      ...communityDoc,
      id: communityDoc._id.toHexString(),
      creator: creatorForClient,
      memberCount: communityDoc.memberIds.length,
    };

    return NextResponse.json(enrichedCommunity, { status: 200 });
  } catch (error) {
    console.error(`API Error fetching community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function PUT(request: NextRequest, { params }: CommunityParams) {
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID in path is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = communityUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid community data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { userId, ...updateData } = validation.data;

    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const communityObjectId = new ObjectId(communityId);
    const userObjectId = new ObjectId(userId);

    const existingCommunity = await communitiesCollection.findOne({ _id: communityObjectId });
    if (!existingCommunity) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    if (!existingCommunity.creatorId.equals(userObjectId)) {
      return NextResponse.json({ message: 'Unauthorized: Only the community creator can update settings.' }, { status: 403 });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No update fields provided.', community: existingCommunity }, { status: 200 });
    }

    const updatePayload: Partial<DbCommunity> = { ...updateData, updatedAt: new Date().toISOString() };
    if (updateData.coverImageUrl === '') { // Handle empty string to use default placeholder
        updatePayload.coverImageUrl = `https://placehold.co/1200x300.png?text=${encodeURIComponent(updateData.name || existingCommunity.name)}`;
    }


    const result = await communitiesCollection.findOneAndUpdate(
      { _id: communityObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ message: 'Community update failed.' }, { status: 500 });
    }
    
    const usersCollection = db.collection<User>('users');
    const creatorDoc = await usersCollection.findOne({ _id: result.value.creatorId }, { projection: { passwordHash: 0 } });
    const creatorForClient: User | undefined = creatorDoc ? { 
      ...creatorDoc, 
      id: creatorDoc._id.toHexString(),
      bookmarkedPostIds: Array.isArray(creatorDoc.bookmarkedPostIds) ? creatorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
    } : undefined;

    const updatedCommunityForClient: Community = {
      ...result.value,
      id: result.value._id.toHexString(),
      creator: creatorForClient,
      memberCount: result.value.memberIds.length,
    };

    return NextResponse.json({ message: 'Community updated successfully!', community: updatedCommunityForClient }, { status: 200 });

  } catch (error) {
    console.error(`API Error updating community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// Future: DELETE for removal
