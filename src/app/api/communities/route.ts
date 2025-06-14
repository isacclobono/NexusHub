
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User } from '@/lib/types';

const communityCreateSchema = z.object({
  creatorId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Creator ID format." }),
  name: z.string().min(3, 'Community name must be at least 3 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(1000),
  privacy: z.enum(['public', 'private']),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
});

// Database document type for Community
type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount'> & {
  _id: ObjectId;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = communityCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid community data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<User>('users');
    const creator = await usersCollection.findOne({ _id: new ObjectId(data.creatorId) });

    if (!creator) {
      return NextResponse.json({ message: 'Creator not found.' }, { status: 404 });
    }

    const creatorObjectId = new ObjectId(data.creatorId);

    const newCommunityDocument: Omit<DbCommunity, '_id'> = {
      name: data.name,
      description: data.description,
      creatorId: creatorObjectId,
      memberIds: [creatorObjectId], // Creator is automatically a member
      adminIds: [creatorObjectId], // Creator is automatically an admin
      privacy: data.privacy,
      coverImageUrl: data.coverImageUrl || `https://placehold.co/1200x300.png?text=${encodeURIComponent(data.name)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const communitiesCollection = db.collection<Omit<DbCommunity, '_id'>>('communities');
    const result = await communitiesCollection.insertOne(newCommunityDocument);

    if (!result.insertedId) {
      throw new Error('Failed to insert community into database.');
    }
    
    // Update user's communityIds
    await usersCollection.updateOne(
      { _id: creatorObjectId },
      { $addToSet: { communityIds: result.insertedId } }
    );

    const createdCommunityForClient: Community = {
      ...newCommunityDocument,
      _id: result.insertedId,
      id: result.insertedId.toHexString(),
      creator: { // Embed basic creator info
        _id: creator._id,
        id: creator._id.toHexString(),
        name: creator.name,
        avatarUrl: creator.avatarUrl,
        email: creator.email, // Added for completeness, if needed
        reputation: creator.reputation,
        joinedDate: creator.joinedDate,
      },
      memberCount: 1,
    };

    return NextResponse.json({ message: 'Community created successfully!', community: createdCommunityForClient }, { status: 201 });

  } catch (error) {
    console.error('API Error creating community:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<User>('users');

    // For now, fetching all public communities. Add filters for private/user membership later.
    const communitiesFromDb = await communitiesCollection.find({ privacy: 'public' }).sort({ createdAt: -1 }).toArray();

    const enrichedCommunities: Community[] = await Promise.all(
      communitiesFromDb.map(async (communityDoc) => {
        const creatorDoc = await usersCollection.findOne({ _id: communityDoc.creatorId }, { projection: { passwordHash: 0 } });
        const creatorForClient: User | undefined = creatorDoc ? {
          ...creatorDoc,
          id: creatorDoc._id.toHexString(),
          // ensure bookmarkedPostIds is an array if it exists, or empty array
          bookmarkedPostIds: Array.isArray(creatorDoc.bookmarkedPostIds) ? creatorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        } : undefined;

        return {
          ...communityDoc,
          id: communityDoc._id.toHexString(),
          creator: creatorForClient,
          memberCount: communityDoc.memberIds.length,
        };
      })
    );

    return NextResponse.json(enrichedCommunities, { status: 200 });
  } catch (error) {
    console.error('API Error fetching communities:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
