
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
    const usersCollection = db.collection<User>('users'); // For fetching user details
    const eventsCollection = db.collection<DbEvent>('events');


    const currentUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!currentUser) {
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
        const organizerDoc = await usersCollection.findOne({ _id: event.organizerId });
        const rsvpUserDocs = await usersCollection.find({ _id: { $in: event.rsvpIds } }).toArray();
        const enrichedEvent = {
            ...event,
            id: event._id.toHexString(),
            organizerId: event.organizerId.toHexString(),
            organizer: organizerDoc ? { ...organizerDoc, id: organizerDoc._id.toHexString() } : undefined,
            rsvpIds: event.rsvpIds.map(id => id.toHexString()),
            rsvps: rsvpUserDocs.map(u => ({ ...u, id: u._id!.toHexString() })),
        };
      return NextResponse.json({ message: 'User already RSVP\'d to this event.', event: enrichedEvent }, { status: 200 });
    }

    if (event.maxAttendees && event.rsvpIds.length >= event.maxAttendees) {
      return NextResponse.json({ message: 'Event is full. Cannot RSVP.' }, { status: 409 });
    }

    // Add user to RSVP list
    const updateResult = await eventsCollection.updateOne(
      { _id: eventObjectId },
      { $addToSet: { rsvpIds: userObjectId } } // Use $addToSet to prevent duplicate ObjectIds
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        return NextResponse.json({ message: 'Event not found or RSVP failed.' }, { status: 404 });
    } else if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
        // This case can happen if $addToSet finds the element already there,
        // but our earlier check should have caught it.
        // Or, if the event exists but the user was somehow already in rsvpIds (concurrent request edge case).
        // For simplicity, we assume the earlier check is sufficient.
    }
    
    // Fetch the updated event to return complete data including the new RSVP
    const updatedEventDoc = await eventsCollection.findOne({ _id: eventObjectId });
    if (!updatedEventDoc) {
        return NextResponse.json({ message: 'Failed to fetch updated event details.' }, { status: 500 });
    }
    
    // Enrich event with organizer and rsvp user objects for the response
    const organizerDoc = await usersCollection.findOne({ _id: updatedEventDoc.organizerId });
    const rsvpUserDocs = await usersCollection.find({ _id: { $in: updatedEventDoc.rsvpIds } }).toArray();
    
    const organizerForClient: User | undefined = organizerDoc ? {
        id: organizerDoc._id!.toHexString(), _id: organizerDoc._id, name: organizerDoc.name, email: organizerDoc.email,
        avatarUrl: organizerDoc.avatarUrl, bio: organizerDoc.bio, reputation: organizerDoc.reputation, joinedDate: organizerDoc.joinedDate,
    } : undefined;

    const rsvpsForClient = rsvpUserDocs.map(doc => ({
        id: doc._id!.toHexString(), _id: doc._id, name: doc.name, email: doc.email,
        avatarUrl: doc.avatarUrl, bio: doc.bio, reputation: doc.reputation, joinedDate: doc.joinedDate,
    }));

    const enrichedEventForClient: Event = {
        ...updatedEventDoc,
        id: updatedEventDoc._id.toHexString(),
        organizerId: updatedEventDoc.organizerId.toHexString(),
        organizer: organizerForClient || { id: 'unknown', name: 'Unknown User', reputation: 0, joinedDate: new Date().toISOString(), email: "" } as User,
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
