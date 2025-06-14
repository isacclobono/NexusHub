
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Notification } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // For a real app, you'd get userId from an authenticated session/token
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); 

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required as a query parameter.' }, { status: 400 });
    }

    const db = await getDb();
    const notificationsCollection = db.collection<Notification>('notifications');
    
    const userNotifications = await notificationsCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const notificationsForClient = userNotifications.map(n => ({
        ...n,
        id: n._id!.toHexString(),
        userId: n.userId.toHexString(),
        relatedEntityId: n.relatedEntityId?.toHexString(),
        actor: n.actor ? { ...n.actor, id: n.actor.id.toHexString() } : undefined,
    }));
      

    return NextResponse.json(notificationsForClient, { status: 200 });
  } catch (error) {
    console.error('API Error fetching notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { // For marking all as read
  try {
    const { userId, action } = await request.json();

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
    }
    if (action !== 'markAllRead') {
        return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
    }

    const db = await getDb();
    const notificationsCollection = db.collection<Notification>('notifications');

    const result = await notificationsCollection.updateMany(
      { userId: new ObjectId(userId), isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ message: 'All notifications marked as read.', modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error) {
    console.error('API Error marking all notifications as read:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) { // For deleting all
  try {
    // For a real app, you'd get userId from an authenticated session/token
    const { searchParams } = new URL(request.url); // Assuming userId comes via query for DELETE all
    const userId = searchParams.get('userId'); 

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required as a query parameter to delete all.' }, { status: 400 });
    }

    const db = await getDb();
    const notificationsCollection = db.collection<Notification>('notifications');
    
    const result = await notificationsCollection.deleteMany({ userId: new ObjectId(userId) });

    return NextResponse.json({ message: 'All notifications deleted.', deletedCount: result.deletedCount }, { status: 200 });
  } catch (error) {
    console.error('API Error deleting all notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
