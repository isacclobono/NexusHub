
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User } from '@/lib/types';

interface CommunityMemberParams {
  params: { communityId: string };
}

export async function POST(request: NextRequest, { params }: CommunityMemberParams) { // Join a community
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json();
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required to join.' }, { status: 400 });
    }

    const db = await getDb();
    const communitiesCollection = db.collection('communities');
    const usersCollection = db.collection('users');

    const communityObjectId = new ObjectId(communityId);
    const userObjectId = new ObjectId(userId);

    const community = await communitiesCollection.findOne({ _id: communityObjectId }) as Community | null;
    if (!community) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    const user = await usersCollection.findOne({ _id: userObjectId });
    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    // Check if already a member
    if (community.memberIds?.some(id => id.equals(userObjectId))) {
      return NextResponse.json({ message: 'User is already a member of this community.' }, { status: 200 });
    }

    // For now, public communities allow direct join. Private would need approval flow.
    // if (community.privacy === 'private') {
    //   TODO: Implement join request logic for private communities
    //   return NextResponse.json({ message: 'This is a private community. Join request sent.' }, { status: 202 });
    // }

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
        // This should ideally not happen if user check passed. Log warning if community was updated but user wasn't.
        console.warn(`User ${userId} joined community ${communityId}, but user's communityIds list was not updated.`);
    }


    return NextResponse.json({ message: 'Successfully joined the community!' }, { status: 200 });

  } catch (error) {
    console.error(`API Error joining community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: CommunityMemberParams) { // Leave a community
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    // In a real app, userId should come from authenticated session
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); 

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID (as query param userId) is required to leave.' }, { status: 400 });
    }
    
    const db = await getDb();
    const communitiesCollection = db.collection('communities');
    const usersCollection = db.collection('users');

    const communityObjectId = new ObjectId(communityId);
    const userObjectId = new ObjectId(userId);

    const community = await communitiesCollection.findOne({ _id: communityObjectId }) as Community | null;
    if (!community) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }
    
    // User cannot leave if they are the creator (for now - more complex logic for transferring ownership later)
    if (community.creatorId.equals(userObjectId)) {
        return NextResponse.json({ message: 'Creator cannot leave the community. Consider deleting it or transferring ownership (not implemented).' }, { status: 403 });
    }

    const updateCommunityResult = await communitiesCollection.updateOne(
      { _id: communityObjectId },
      { $pull: { memberIds: userObjectId, adminIds: userObjectId } } // Remove from members and admins if they were one
    );

    const updateUserResult = await usersCollection.updateOne(
      { _id: userObjectId },
      { $pull: { communityIds: communityObjectId } }
    );

    if (updateCommunityResult.modifiedCount === 0 && updateCommunityResult.matchedCount === 0) {
      return NextResponse.json({ message: 'Community not found or user was not a member.' }, { status: 404 });
    }
     if (updateCommunityResult.modifiedCount === 0 && updateCommunityResult.matchedCount > 0) {
      return NextResponse.json({ message: 'User was not a member of this community or already left.' }, { status: 200 });
    }
     if (updateUserResult.modifiedCount === 0 && updateUserResult.matchedCount === 0) {
        console.warn(`User ${userId} left community ${communityId}, but user's communityIds list might not have been updated (user not found or ID not in list).`);
    }


    return NextResponse.json({ message: 'Successfully left the community.' }, { status: 200 });

  } catch (error) {
    console.error(`API Error leaving community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
