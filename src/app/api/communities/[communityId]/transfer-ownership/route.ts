
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Community, User, Notification } from '@/lib/types';
import { z } from 'zod';

// Database document type for Community
type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount' | 'joinRequests'> & {
  _id: ObjectId;
  pendingMemberIds?: ObjectId[];
};

type DbUser = Omit<User, 'id'> & {
  _id: ObjectId;
  passwordHash?: string;
};

const transferOwnershipSchema = z.object({
  currentUserId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Current User ID format." }),
  newOwnerId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid New Owner ID format." }),
});

export async function POST(request: NextRequest, { params }: { params: { communityId: string } }) {
  const { communityId } = params;
  if (!communityId || !ObjectId.isValid(communityId)) {
    return NextResponse.json({ message: 'Valid Community ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = transferOwnershipSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid request data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { currentUserId, newOwnerId } = validation.data;

    const db = await getDb();
    const communitiesCollection = db.collection<DbCommunity>('communities');
    const usersCollection = db.collection<DbUser>('users');
    const notificationsCollection = db.collection<Omit<Notification, 'id' | '_id'>>('notifications');


    const communityObjectId = new ObjectId(communityId);
    const currentUserIdObj = new ObjectId(currentUserId);
    const newOwnerIdObj = new ObjectId(newOwnerId);

    if (currentUserIdObj.equals(newOwnerIdObj)) {
        return NextResponse.json({ message: 'New owner cannot be the same as the current owner.' }, { status: 400 });
    }

    const community = await communitiesCollection.findOne({ _id: communityObjectId });
    if (!community) {
      return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
    }

    if (!community.creatorId.equals(currentUserIdObj)) {
      return NextResponse.json({ message: 'Unauthorized: Only the current community creator can transfer ownership.' }, { status: 403 });
    }

    const newOwner = await usersCollection.findOne({ _id: newOwnerIdObj });
    if (!newOwner) {
      return NextResponse.json({ message: 'New owner user not found.' }, { status: 404 });
    }

    const isMember = community.memberIds.some(id => id.equals(newOwnerIdObj));
    if (!isMember) {
      return NextResponse.json({ message: 'The selected user is not a member of this community.' }, { status: 400 });
    }

    // Perform the ownership transfer
    const updateResult = await communitiesCollection.updateOne(
      { _id: communityObjectId },
      {
        $set: { creatorId: newOwnerIdObj, updatedAt: new Date().toISOString() },
        $addToSet: { adminIds: newOwnerIdObj } // Ensure the new owner is also an admin
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ message: 'Failed to transfer ownership. Community may not have been found or no change was needed.' }, { status: 500 });
    }

    // Notifications
    const oldOwner = await usersCollection.findOne({ _id: currentUserIdObj }); // For actor details

    // Notify the new owner
    const newOwnerNotification: Omit<Notification, 'id' | '_id'> = {
      userId: newOwnerIdObj,
      type: 'community_ownership_transfer',
      title: `You are now the owner of ${community.name}`,
      message: `${oldOwner?.name || 'The previous owner'} has transferred ownership of the community "${community.name}" to you.`,
      link: `/communities/${community._id.toHexString()}`,
      relatedEntityId: community._id,
      actor: { _id: oldOwner?._id || currentUserIdObj, id: oldOwner?._id.toHexString() || currentUserId, name: oldOwner?.name || "Previous Owner", avatarUrl: oldOwner?.avatarUrl },
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    await notificationsCollection.insertOne(newOwnerNotification);

    // Notify the old owner
    const oldOwnerNotification: Omit<Notification, 'id' | '_id'> = {
        userId: currentUserIdObj,
        type: 'community_ownership_transfer',
        title: `Ownership of ${community.name} transferred`,
        message: `You have successfully transferred ownership of "${community.name}" to ${newOwner.name}.`,
        link: `/communities/${community._id.toHexString()}`,
        relatedEntityId: community._id,
        actor: { _id: newOwner._id, id: newOwner._id.toHexString() || newOwnerId, name: newOwner.name, avatarUrl: newOwner.avatarUrl }, // Actor is the new owner
        isRead: false,
        createdAt: new Date().toISOString(),
    };
    await notificationsCollection.insertOne(oldOwnerNotification);


    return NextResponse.json({ message: `Ownership of "${community.name}" transferred successfully to ${newOwner.name}.` }, { status: 200 });

  } catch (error) {
    console.error(`API Error transferring ownership for community ${communityId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
