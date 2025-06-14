
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Event, User } from '@/lib/types';


interface EventParams {
  params: { eventId: string };
}

// Define the structure of event documents in the database
type DbEvent = Omit<Event, 'id' | 'organizer' | 'rsvps' | 'organizerId' | 'rsvpIds'> & {
  _id: ObjectId;
  organizerId: ObjectId;
  rsvpIds: ObjectId[];
};


export async function GET(request: NextRequest, { params }: EventParams) {
  const { eventId } = params;
  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ message: 'Valid Event ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const eventsCollection = db.collection<DbEvent>('events');
    const usersCollection = db.collection<User>('users');

    const eventDoc = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

    if (!eventDoc) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }

    const organizerDoc = await usersCollection.findOne({ _id: eventDoc.organizerId }, { projection: { passwordHash: 0 } });
    const rsvpUserDocs = await usersCollection.find({ _id: { $in: eventDoc.rsvpIds } }, { projection: { passwordHash: 0 } }).toArray();

    const enrichedEvent: Event = {
      ...eventDoc,
      id: eventDoc._id.toHexString(),
      organizerId: eventDoc.organizerId.toHexString(),
      organizer: organizerDoc ? { ...organizerDoc, id: organizerDoc._id.toHexString() } as User : undefined,
      rsvpIds: eventDoc.rsvpIds.map(id => id.toHexString()),
      rsvps: rsvpUserDocs.map(u => ({ ...u, id: u._id!.toHexString() }) as User),
    };

    return NextResponse.json(enrichedEvent, { status: 200 });
  } catch (error) {
    console.error(`API Error fetching event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest, { params }: EventParams) {
  const { eventId } = params;
  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ message: 'Valid Event ID is required.' }, { status: 400 });
  }

  // TODO: Add authentication to ensure only the organizer or an admin can delete
  // For now, assuming the client has verified this.
  // const { userId: currentUserId } = await request.json(); // Or get from session

  try {
    const db = await getDb();
    const eventsCollection = db.collection<DbEvent>('events');
    
    const eventObjectId = new ObjectId(eventId);
    
    // Optional: Check if current user is the organizer before deleting
    // const eventToDelete = await eventsCollection.findOne({ _id: eventObjectId });
    // if (!eventToDelete) {
    //   return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    // }
    // if (eventToDelete.organizerId.toHexString() !== currentUserId) {
    //   return NextResponse.json({ message: 'Unauthorized to delete this event.' }, { status: 403 });
    // }

    const deleteResult = await eventsCollection.deleteOne({ _id: eventObjectId });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ message: 'Event not found or already deleted.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
