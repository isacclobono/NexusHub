import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User } from '@/lib/types';

type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount' | 'joinRequests'> & {
  _id: ObjectId;
  pendingMemberIds?: ObjectId[];
  memberIds?: ObjectId[];
  creatorId: ObjectId;
  privacy?: string;
};

type DbUser = Omit<User, 'id' | 'bookmarkedPostIds' | 'communityIds'> & {
  _id: ObjectId;
  passwordHash?: string;
  bookmarkedPostIds?: ObjectId[];
  communityIds?: ObjectId[];
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<DbUser>('users');

    const communityObjectId = new ObjectId(communityId);
    const community = await communitiesCollection.findOne({ _id: communityObjectId });

    if (!community) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    if (!community.memberIds || community.memberIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const memberObjectIds = community.memberIds.map(id =>
      typeof id === 'string' ? new ObjectId(id) : id
    );

    const memberDocs = await usersCollection.find(
      { _id: { $in: memberObjectIds } },
      { projection: { passwordHash: 0 } }
    ).toArray();

    const membersForClient = memberDocs.map(doc => ({
      ...doc,
      id: doc._id.toHexString(),
      bookmarkedPostIds: doc.bookmarkedPostIds || [],
      communityIds: doc.communityIds || [],
    }));

    return NextResponse.json(membersForClient, { status: 200 });

  } catch (error) {
    console.error(`API Error fetching members for community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const { userId } = await _request.json();
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<DbUser>('users');

    const communityObjectId = new ObjectId(communityId);
    const userObjectId = new ObjectId(userId);

    const community = await communitiesCollection.findOne({ _id: communityObjectId });
    if (!community) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    const user = await usersCollection.findOne({ _id: userObjectId });
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (community.memberIds?.some(id => id.equals(userObjectId))) {
      return NextResponse.json({ message: 'User is already a member of this community.' }, { status: 200 });
    }

    if (community.privacy === 'private') {
      if (community.pendingMemberIds?.some(id => id.equals(userObjectId))) {
        return NextResponse.json({ message: 'Your request to join is already pending.' }, { status: 200 });
      }
      const updateCommunityResult = await communitiesCollection.updateOne(
        { _id: communityObjectId },
        { $addToSet: { pendingMemberIds: userObjectId } }
      );
      if (updateCommunityResult.modifiedCount === 0 && updateCommunityResult.matchedCount === 0) {
        return NextResponse.json({ message: 'Community not found or failed to add join request.' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Your request to join has been submitted.' }, { status: 200 });
    } else {
      const updateCommunityResult = await communitiesCollection.updateOne(
        { _id: communityObjectId },
        { $addToSet: { memberIds: userObjectId } }
      );

      const updateUserResult = await usersCollection.updateOne(
        { _id: userObjectId },
        { $addToSet: { communityIds: communityObjectId } }
      );

      if (updateCommunityResult.modifiedCount === 0 && updateCommunityResult.matchedCount === 0) {
        return NextResponse.json({ message: 'Community not found or failed to update members.' }, { status: 404 });
      }
      if (updateUserResult.modifiedCount === 0 && updateUserResult.matchedCount === 0) {
        console.warn(`User ${userId} joined public community ${communityId}, but user's communityIds list was not updated.`);
      }
      return NextResponse.json({ message: 'Successfully joined the community!' }, { status: 200 });
    }

  } catch (error) {
    console.error(`API Error joining/requesting community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { communityId: string } }
) {
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(_request.url);
    const userId = searchParams.get('userId');

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID (as query param userId) is required to leave.' }, { status: 400 });
    }

    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<DbUser>('users');

    const communityObjectId = new ObjectId(communityId);
    const userObjectId = new ObjectId(userId);

    const community = await communitiesCollection.findOne({ _id: communityObjectId });
    if (!community) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    if (community.creatorId.equals(userObjectId)) {
      return NextResponse.json({ message: 'Creator cannot leave the community. Consider deleting it or transferring ownership (not implemented).' }, { status: 403 });
    }

    const updateCommunityResult = await communitiesCollection.updateOne(
      { _id: communityObjectId },
      {
        $pull: {
          memberIds: userObjectId,
          adminIds: userObjectId,
          pendingMemberIds: userObjectId
        }
      }
    );

    const updateUserResult = await usersCollection.updateOne(
      { _id: userObjectId },
      { $pull: { communityIds: communityObjectId } }
    );

    if (updateCommunityResult.modifiedCount === 0 && updateCommunityResult.matchedCount === 0) {
      return NextResponse.json({ message: 'Community not found or user was not a member/pending.' }, { status: 404 });
    }
    if (updateCommunityResult.modifiedCount === 0 && updateCommunityResult.matchedCount > 0) {
      return NextResponse.json({ message: 'User was not a member/pending or already left/cancelled request.' }, { status: 200 });
    }
    if (updateUserResult.modifiedCount === 0 && updateUserResult.matchedCount === 0) {
      console.warn(`User ${userId} left community ${communityId}, but user's communityIds list might not have been updated (user not found or ID not in list).`);
    }

    return NextResponse.json({ message: 'Successfully left the community or cancelled request.' }, { status: 200 });

  } catch (error) {
    console.error(`API Error leaving community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
