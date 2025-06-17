import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User } from '@/lib/types';

type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount' | 'joinRequests'> & {
  _id: ObjectId;
  pendingMemberIds?: ObjectId[];
  memberIds?: ObjectId[];
  adminIds?: ObjectId[];
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
  context: { params: { communityId: string } }
) {
  const { communityId } = context.params;

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
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { communityId: string } }
) {
  const { communityId } = context.params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json();
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<DbUser>('users');

    const communityObjectId = new ObjectId(communityId);
    const userObjectId = new ObjectId(userId);

    const community = await communitiesCollection.findOne({ _id: communityObjectId });
    const user = await usersCollection.findOne({ _id: userObjectId });

    if (!community || !user) {
      return NextResponse.json({ message: 'Community or user not found.' }, { status: 404 });
    }

    if (community.memberIds?.some(id => id.equals(userObjectId))) {
      return NextResponse.json({ message: 'Already a member.' }, { status: 200 });
    }

    if (community.privacy === 'private') {
      if (community.pendingMemberIds?.some(id => id.equals(userObjectId))) {
        return NextResponse.json({ message: 'Already requested.' }, { status: 200 });
      }

      await communitiesCollection.updateOne(
        { _id: communityObjectId },
        { $addToSet: { pendingMemberIds: userObjectId } }
      );

      return NextResponse.json({ message: 'Join request sent.' }, { status: 200 });
    } else {
      await communitiesCollection.updateOne(
        { _id: communityObjectId },
        { $addToSet: { memberIds: userObjectId } }
      );

      await usersCollection.updateOne(
        { _id: userObjectId },
        { $addToSet: { communityIds: communityObjectId } }
      );

      return NextResponse.json({ message: 'Joined successfully.' }, { status: 200 });
    }

  } catch (error) {
    console.error(`API Error on POST:`, error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { communityId: string } }
) {
  const { communityId } = context.params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID required.' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid userId required in query param.' }, { status: 400 });
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
      return NextResponse.json({ message: 'Creator cannot leave their own community.' }, { status: 403 });
    }

    await communitiesCollection.updateOne(
      { _id: communityObjectId },
      {
        $pull: {
          memberIds: userObjectId,
          adminIds: userObjectId,
          pendingMemberIds: userObjectId
        }
      }
    );

    await usersCollection.updateOne(
      { _id: userObjectId },
      { $pull: { communityIds: communityObjectId } }
    );

    return NextResponse.json({ message: 'Left or cancelled request successfully.' }, { status: 200 });

  } catch (error) {
    console.error(`API Error on DELETE:`, error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
