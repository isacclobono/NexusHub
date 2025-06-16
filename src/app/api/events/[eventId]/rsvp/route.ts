
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Event, User } from '@/lib/types';

interface RsvpParams {
  params: { eventId: string };
}

// Define the structure of event documents in the database
type DbEvent = Omit<Event, 'id' | 'organizer' | 'rsvps' | 'organizerId' | 'rsvpIds'> & {
  _id: ObjectId;
  organizerId: ObjectId;
  rsvpIds: ObjectId[];
};


export async function POST(request: NextRequest, { params }: RsvpParams) {
  const { eventId } = params;
  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ message: 'Valid Event ID is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json();
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required to RSVP.' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection<User>('users'); 
    const eventsCollection = db.collection<DbEvent>('events');


    const currentUserDoc = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!currentUserDoc) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const eventObjectId = new ObjectId(eventId);
    const event = await eventsCollection.findOne({ _id: eventObjectId });

    if (!event) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }
    
    const userObjectId = new ObjectId(userId);

    // Check if already RSVP'd
    const isAlreadyRsvpd = event.rsvpIds.some(id => id.equals(userObjectId));

    if (isAlreadyRsvpd) {
       // Fetch full event details to return to client, even if already RSVP'd
        const organizerDoc = await usersCollection.findOne({ _id: event.organizerId }, { projection: { passwordHash: 0 }});
        const rsvpUserDocs = await usersCollection.find({ _id: { $in: event.rsvpIds } }, { projection: { passwordHash: 0 }}).toArray();
        
        const organizerForClient: User | undefined = organizerDoc ? { 
            ...organizerDoc, id: organizerDoc._id!.toHexString(), _id: organizerDoc._id
        } : undefined;
        const rsvpsForClient = rsvpUserDocs.map(uDoc => ({ 
            ...uDoc, id: uDoc._id!.toHexString(), _id: uDoc._id
        }));

        const enrichedEvent = {
            ...event,
            id: event._id.toHexString(),
            organizerId: event.organizerId.toHexString(),
            organizer: organizerForClient || { id: 'unknown', _id: new ObjectId(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] },
            rsvpIds: event.rsvpIds.map(id => id.toHexString()),
            rsvps: rsvpsForClient,
        };
      return NextResponse.json({ message: 'User already RSVP\'d to this event.', event: enrichedEvent }, { status: 200 });
    }

    if (event.maxAttendees && event.rsvpIds.length >= event.maxAttendees) {
      return NextResponse.json({ message: 'Event is full. Cannot RSVP.' }, { status: 409 });
    }

    // Add user to RSVP list
    const updateResult = await eventsCollection.updateOne(
      { _id: eventObjectId },
      { $addToSet: { rsvpIds: userObjectId } } 
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        return NextResponse.json({ message: 'Event not found or RSVP failed.' }, { status: 404 });
    }
    
    const updatedEventDoc = await eventsCollection.findOne({ _id: eventObjectId });
    if (!updatedEventDoc) {
        return NextResponse.json({ message: 'Failed to fetch updated event details.' }, { status: 500 });
    }
    
    const organizerDoc = await usersCollection.findOne({ _id: updatedEventDoc.organizerId }, { projection: { passwordHash: 0 }});
    const rsvpUserDocs = await usersCollection.find({ _id: { $in: updatedEventDoc.rsvpIds } }, { projection: { passwordHash: 0 }}).toArray();
    
    const organizerForClient: User | undefined = organizerDoc ? {
        ...organizerDoc, id: organizerDoc._id!.toHexString(), _id: organizerDoc._id
    } : undefined;

    const rsvpsForClient = rsvpUserDocs.map(uDoc => ({
        ...uDoc, id: uDoc._id!.toHexString(), _id: uDoc._id
    }));

    const enrichedEventForClient: Event = {
        ...updatedEventDoc,
        id: updatedEventDoc._id.toHexString(),
        organizerId: updatedEventDoc.organizerId.toHexString(),
        organizer: organizerForClient || { id: 'unknown', _id: new ObjectId(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] },
        rsvpIds: updatedEventDoc.rsvpIds.map(id => id.toHexString()),
        rsvps: rsvpsForClient,
    };

    return NextResponse.json({ message: 'Successfully RSVP\'d to event!', event: enrichedEventForClient }, { status: 200 });

  } catch (error) {
    console.error(`API Error RSVPing to event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

