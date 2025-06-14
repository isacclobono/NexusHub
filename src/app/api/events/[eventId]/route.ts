
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

    // Populate organizer
    const organizerDoc = await usersCollection.findOne({ _id: eventDoc.organizerId }, { projection: { passwordHash: 0 } });
    const organizerForClient: User | undefined = organizerDoc ? { 
        ...organizerDoc, 
        id: organizerDoc._id!.toHexString(),
        _id: organizerDoc._id // Keep _id as ObjectId for internal consistency if needed, client uses id
    } : undefined;

    // Populate RSVPs
    const rsvpUserDocs = await usersCollection.find({ _id: { $in: eventDoc.rsvpIds } }, { projection: { passwordHash: 0 } }).toArray();
    const rsvpsForClient: User[] = rsvpUserDocs.map(uDoc => ({
        ...uDoc,
        id: uDoc._id!.toHexString(),
        _id: uDoc._id
    }));


    const enrichedEvent: Event = {
      ...eventDoc,
      id: eventDoc._id.toHexString(),
      organizerId: eventDoc.organizerId.toHexString(),
      organizer: organizerForClient || { id: 'unknown', _id: new ObjectId(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] },
      rsvpIds: eventDoc.rsvpIds.map(id => id.toHexString()),
      rsvps: rsvpsForClient,
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

  try {
    // Basic authorization: In a real app, get current user ID from session/token
    const body = await request.json();
    const currentUserId = body.userId; // This is a simplified way, not secure for production
    
    if (!currentUserId || !ObjectId.isValid(currentUserId)) {
      return NextResponse.json({ message: 'User ID is required for authorization.' }, { status: 401 });
    }

    const db = await getDb();
    const eventsCollection = db.collection<DbEvent>('events');
    
    const eventObjectId = new ObjectId(eventId);
    
    const eventToDelete = await eventsCollection.findOne({ _id: eventObjectId });
    if (!eventToDelete) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }

    // Authorization check: Only organizer can delete
    if (eventToDelete.organizerId.toHexString() !== currentUserId) {
      return NextResponse.json({ message: 'Unauthorized to delete this event. Only the organizer can delete.' }, { status: 403 });
    }

    const deleteResult = await eventsCollection.deleteOne({ _id: eventObjectId });

    if (deleteResult.deletedCount === 0) {
      // This case should ideally be caught by the findOne above, but as a fallback.
      return NextResponse.json({ message: 'Event not found or already deleted.' }, { status: 404 });
    }

    // Consider also deleting related data, e.g., RSVPs if stored in a separate collection, notifications, etc.
    // For this setup, RSVPs are just an array of IDs in the event document.

    return NextResponse.json({ message: 'Event deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// PUT/PATCH for editing an event would go here
// Example:
// export async function PUT(request: NextRequest, { params }: EventParams) {
//   // ... implementation for updating an event ...
// }
