
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User, Notification } from '@/lib/types';

interface CommunityRequestsParams {
  params: { communityId: string };
}

// Database document type for Community
type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount' | 'joinRequests'> & {
  _id: ObjectId;
  pendingMemberIds?: ObjectId[];
};

type DbUser = Omit<User, 'id'> & {
  _id: ObjectId;
  passwordHash?: string;
};


// GET: Fetch pending join requests for a community (admin/creator only)
export async function GET(request: NextRequest, { params }: CommunityRequestsParams) {
  const { communityId } = params;
  const { searchParams } = new URL(request.url);
  const currentUserId = searchParams.get('currentUserId'); // Assume current user ID is passed for auth

  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }
  if (!currentUserId || !ObjectId.isValid(currentUserId)) {
    return NextResponse.json({ message: 'Current User ID is required for authorization.' }, { status: 401 });
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

    // Authorization: Only creator or admin can view requests
    const isCreator = community.creatorId.equals(new ObjectId(currentUserId));
    // const isAdmin = community.adminIds?.some(id => id.equals(new ObjectId(currentUserId))); // If admin roles exist
    if (!isCreator /* && !isAdmin */) {
      return NextResponse.json({ message: 'Unauthorized to view join requests.' }, { status: 403 });
    }

    if (!community.pendingMemberIds || community.pendingMemberIds.length === 0) {
      return NextResponse.json([], { status: 200 }); // No pending requests
    }

    const pendingUserDocs = await usersCollection.find(
      { _id: { $in: community.pendingMemberIds } },
      { projection: { passwordHash: 0, email: 0 } } // Exclude sensitive info
    ).toArray();

    const pendingUsersForClient: User[] = pendingUserDocs.map(doc => ({
      ...doc,
      id: doc._id.toHexString(),
    }));

    return NextResponse.json(pendingUsersForClient, { status: 200 });

  } catch (error) {
    console.error(`API Error fetching join requests for community ${communityId}:`, error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST: Approve or Deny a join request (admin/creator only)
export async function POST(request: NextRequest, { params }: CommunityRequestsParams) {
  const { communityId } = params;

  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const { userIdToManage, action, currentUserId } = await request.json(); // action: 'approve' or 'deny'

    if (!userIdToManage || !ObjectId.isValid(userIdToManage)) {
      return NextResponse.json({ message: 'Valid User ID to manage is required.' }, { status: 400 });
    }
    if (!currentUserId || !ObjectId.isValid(currentUserId)) {
      return NextResponse.json({ message: 'Current User ID is required for authorization.' }, { status: 401 });
    }
    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action specified.' }, { status: 400 });
    }

    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<DbUser>('users');
    const notificationsCollection = db.collection<Omit<Notification, 'id' | '_id'>>('notifications');


    const communityObjectId = new ObjectId(communityId);
    const userToManageObjectId = new ObjectId(userIdToManage);

    const community = await communitiesCollection.findOne({ _id: communityObjectId });
    if (!community) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    const userToManage = await usersCollection.findOne({_id: userToManageObjectId});
    if (!userToManage) {
        return NextResponse.json({ message: 'User to manage not found.' }, { status: 404 });
    }
    const currentUser = await usersCollection.findOne({_id: new ObjectId(currentUserId)});
     if (!currentUser) {
        return NextResponse.json({ message: 'Current user performing action not found.' }, { status: 404 });
    }


    // Authorization: Only creator or admin can manage requests
    const isCreator = community.creatorId.equals(new ObjectId(currentUserId));
    // const isAdmin = community.adminIds?.some(id => id.equals(new ObjectId(currentUserId)));
    if (!isCreator /* && !isAdmin */) {
      return NextResponse.json({ message: 'Unauthorized to manage join requests.' }, { status: 403 });
    }

    // Check if user is in pending list
    if (!community.pendingMemberIds?.some(id => id.equals(userToManageObjectId))) {
      return NextResponse.json({ message: 'User is not in the pending request list.' }, { status: 400 });
    }

    if (action === 'approve') {
      // Add to memberIds, remove from pendingMemberIds
      await communitiesCollection.updateOne(
        { _id: communityObjectId },
        {
          $addToSet: { memberIds: userToManageObjectId },
          $pull: { pendingMemberIds: userToManageObjectId }
        }
      );
      // Add communityId to user's communityIds
      await usersCollection.updateOne(
        { _id: userToManageObjectId },
        { $addToSet: { communityIds: communityObjectId } }
      );

      // Create notification for the approved user
      const notification: Omit<Notification, 'id' | '_id'> = {
        userId: userToManageObjectId,
        type: 'community_join_approved',
        title: `Welcome to ${community.name}!`,
        message: `Your request to join the community "${community.name}" has been approved.`,
        link: `/communities/${community._id.toHexString()}`,
        relatedEntityId: community._id,
        actor: { _id: currentUser._id, id: currentUser._id.toHexString(), name: currentUser.name, avatarUrl: currentUser.avatarUrl},
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await notificationsCollection.insertOne(notification);

      return NextResponse.json({ message: `User approved and added to ${community.name}.` }, { status: 200 });

    } else if (action === 'deny') {
      // Remove from pendingMemberIds
      await communitiesCollection.updateOne(
        { _id: communityObjectId },
        { $pull: { pendingMemberIds: userToManageObjectId } }
      );
       // Optional: Notify user of denial (can be sensitive)
        const notification: Omit<Notification, 'id' | '_id'> = {
            userId: userToManageObjectId,
            type: 'community_join_denied',
            title: `Request to join ${community.name}`,
            message: `Your request to join the community "${community.name}" was not approved at this time.`,
            link: `/communities/${community._id.toHexString()}`,
            relatedEntityId: community._id,
            actor: { _id: currentUser._id, id: currentUser._id.toHexString(), name: currentUser.name, avatarUrl: currentUser.avatarUrl},
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        await notificationsCollection.insertOne(notification);

      return NextResponse.json({ message: `User request denied for ${community.name}.` }, { status: 200 });
    }

  } catch (error) {
    console.error(`API Error managing join request for community ${communityId}:`, error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
