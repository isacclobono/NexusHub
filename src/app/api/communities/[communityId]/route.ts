
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User } from '@/lib/types';

interface CommunityParams {
  params: { communityId: string };
}

// Database document type
type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount'> & {
  _id: ObjectId;
};

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
    
    // Basic member population (just IDs for now, full population for member list on community page later)
    // const memberDocs = await usersCollection.find({ _id: { $in: communityDoc.memberIds } }, { projection: { passwordHash: 0, email:0 } }).toArray();
    // const membersForClient = memberDocs.map(u => ({ ...u, id: u._id.toHexString() }));


    const enrichedCommunity: Community = {
      ...communityDoc,
      id: communityDoc._id.toHexString(),
      creator: creatorForClient,
      memberCount: communityDoc.memberIds.length,
      // members: membersForClient, // Add if detailed member list is needed here immediately
    };

    return NextResponse.json(enrichedCommunity, { status: 200 });
  } catch (error) {
    console.error(`API Error fetching community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// Future: PUT for update, DELETE for removal
