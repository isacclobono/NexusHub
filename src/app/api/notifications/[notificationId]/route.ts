
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Notification } from '@/lib/types';

interface NotificationParams {
  params: { notificationId: string };
}

export async function PATCH(request: NextRequest, { params }: NotificationParams) { // Mark as read/unread
  const { notificationId } = params;
  if (!notificationId || !ObjectId.isValid(notificationId)) {
    return NextResponse.json({ message: 'Valid Notification ID is required.' }, { status: 400 });
  }

  try {
    const { userId, isRead } = await request.json(); // isRead should be true or false
    if (!userId || !ObjectId.isValid(userId) || typeof isRead !== 'boolean') {
      return NextResponse.json({ message: 'Valid User ID and isRead status are required.' }, { status: 400 });
    }

    const db = await getDb();
    const notificationsCollection = db.collection<Notification>('notifications');
    
    const result = await notificationsCollection.updateOne(
      { _id: new ObjectId(notificationId), userId: new ObjectId(userId) }, // Ensure user owns the notification
      { $set: { isRead: isRead } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Notification not found or user unauthorized.' }, { status: 404 });
    }
    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: 'Notification status already up to date.' }, { status: 200 });
    }

    return NextResponse.json({ message: `Notification marked as ${isRead ? 'read' : 'unread'}.` }, { status: 200 });
  } catch (error) {
    console.error(`API Error updating notification ${notificationId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest, { params }: NotificationParams) {
  const { notificationId } = params;
  if (!notificationId || !ObjectId.isValid(notificationId)) {
    return NextResponse.json({ message: 'Valid Notification ID is required.' }, { status: 400 });
  }
  
  try {
    // In a real app, you might also pass userId from auth session to ensure user owns the notification
    const { searchParams } = new URL(request.url); 
    const userId = searchParams.get('userId'); // Or get from body/session
     if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required as a query parameter for deletion.' }, { status: 400 });
    }


    const db = await getDb();
    const notificationsCollection = db.collection<Notification>('notifications');
    
    const result = await notificationsCollection.deleteOne({ 
      _id: new ObjectId(notificationId),
      userId: new ObjectId(userId) // Ensure user owns the notification
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Notification not found or user unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error(`API Error deleting notification ${notificationId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
