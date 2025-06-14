
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Event, User, Community } from '@/lib/types';
import { z } from 'zod';


interface EventParams {
  params: { eventId: string };
}

// Define the structure of event documents in the database
type DbEvent = Omit<Event, 'id' | 'organizer' | 'rsvps' | 'organizerId' | 'rsvpIds' | 'communityId'> & {
  _id: ObjectId;
  organizerId: ObjectId;
  rsvpIds: ObjectId[];
  communityId?: ObjectId;
};

type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount'> & {
  _id: ObjectId;
};

const eventUpdateSchema = z.object({
  userId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid User ID format."}), // ID of user attempting update
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(2000).optional(),
  startTime: z.string().datetime({ message: "Invalid start date format. Expected ISO string."}).optional(),
  endTime: z.string().datetime({ message: "Invalid end date format. Expected ISO string."}).optional(),
  location: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  maxAttendees: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().optional().nullable()
  ),
  imageUrl: z.string().url({message: "Please enter a valid image URL e.g. https://placehold.co/image.png"}).optional().nullable().or(z.literal('')),
  communityId: z.string().optional().nullable().refine(val => !val || ObjectId.isValid(val) || val === "__NONE__", { message: "Invalid Community ID format." }),
  price: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().nonnegative("Price must be a positive number or zero.").optional().nullable()
  ),
  currency: z.string().max(5, "Currency code too long.").optional().nullable(),
}).refine(data => {
    if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
    }
    return true; // Pass if one or both are undefined (not being updated or validated against each other)
}, {
  message: "End date and time must be after start date and time if both are provided.",
  path: ["endTime"],
});


export async function GET(request: NextRequest, { params }: EventParams) {
  const { eventId } = params;
  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ message: 'Valid Event ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const eventsCollection = db.collection<DbEvent>('events');
    const usersCollection = db.collection<User>('users');
    const communitiesCollection = db.collection<DbCommunity>('communities');


    const eventDoc = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

    if (!eventDoc) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }

    const organizerDoc = await usersCollection.findOne({ _id: eventDoc.organizerId }, { projection: { passwordHash: 0 } });
    const organizerForClient: User | undefined = organizerDoc ? {
        ...organizerDoc,
        id: organizerDoc._id!.toHexString(),
        _id: organizerDoc._id
    } : undefined;

    const rsvpUserDocs = await usersCollection.find({ _id: { $in: eventDoc.rsvpIds } }, { projection: { passwordHash: 0 } }).toArray();
    const rsvpsForClient: User[] = rsvpUserDocs.map(uDoc => ({
        ...uDoc,
        id: uDoc._id!.toHexString(),
        _id: uDoc._id
    }));

    let communityName: string | undefined = undefined;
    if (eventDoc.communityId) {
        const community = await communitiesCollection.findOne({ _id: eventDoc.communityId });
        communityName = community?.name;
    }

    const enrichedEvent: Event = {
      ...eventDoc,
      id: eventDoc._id.toHexString(),
      organizerId: eventDoc.organizerId.toHexString() as any,
      organizer: organizerForClient || { id: 'unknown', _id: new ObjectId(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] },
      rsvpIds: eventDoc.rsvpIds.map(id => id.toHexString()) as any,
      rsvps: rsvpsForClient,
      communityId: eventDoc.communityId ? eventDoc.communityId.toHexString() as any : undefined,
      communityName: communityName,
      price: eventDoc.price,
      currency: eventDoc.currency,
      updatedAt: eventDoc.updatedAt,
    };

    return NextResponse.json(enrichedEvent, { status: 200 });
  } catch (error) {
    console.error(`API Error fetching event ${eventId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function PUT(request: NextRequest, { params }: EventParams) {
  const { eventId } = params;
  if (!eventId || !ObjectId.isValid(eventId)) {
    return NextResponse.json({ message: 'Valid Event ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = eventUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid event data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { userId, ...updateData } = validation.data;

    const db = await getDb();
    const eventsCollection = db.collection<DbEvent>('events');
    const eventObjectId = new ObjectId(eventId);
    const userObjectId = new ObjectId(userId);

    const existingEvent = await eventsCollection.findOne({ _id: eventObjectId });
    if (!existingEvent) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }

    if (!existingEvent.organizerId.equals(userObjectId)) {
      return NextResponse.json({ message: 'Unauthorized: Only the event organizer can update this event.' }, { status: 403 });
    }

    const updatePayload: Partial<DbEvent> & { updatedAt: string } = {
        updatedAt: new Date().toISOString()
    };


    if (updateData.title !== undefined) updatePayload.title = updateData.title;
    if (updateData.description !== undefined) updatePayload.description = updateData.description;
    if (updateData.startTime !== undefined) updatePayload.startTime = new Date(updateData.startTime).toISOString();
    if (updateData.endTime !== undefined) updatePayload.endTime = new Date(updateData.endTime).toISOString();

    updatePayload.location = updateData.location === null ? undefined : updateData.location;
    updatePayload.category = updateData.category === null ? undefined : updateData.category;

    if (updateData.tags !== undefined) {
      updatePayload.tags = updateData.tags === null ? [] : updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    updatePayload.maxAttendees = updateData.maxAttendees === null ? undefined : updateData.maxAttendees;

    if (updateData.imageUrl !== undefined) {
      if (updateData.imageUrl === '' || updateData.imageUrl === null) {
        updatePayload.imageUrl = `https://placehold.co/1200x400.png?text=${encodeURIComponent(updateData.title || existingEvent.title)}`;
      } else {
        updatePayload.imageUrl = updateData.imageUrl;
      }
    }

    if (updateData.communityId !== undefined) {
        updatePayload.communityId = updateData.communityId === null || updateData.communityId === "__NONE__" ? undefined : new ObjectId(updateData.communityId);
    }

    if (updateData.price !== undefined) {
        updatePayload.price = updateData.price === null ? undefined : updateData.price;
    }
    if (updateData.currency !== undefined) {
        // Only set currency if there's a price greater than 0
        updatePayload.currency = (updatePayload.price !== undefined && updatePayload.price > 0) ? (updateData.currency === null ? undefined : (updateData.currency || 'USD')) : undefined;
    } else if (updatePayload.price !== undefined && updatePayload.price <= 0) {
        // If price is being set to 0 or less, ensure currency is cleared
        updatePayload.currency = undefined;
    }


    const updateKeys = Object.keys(updatePayload);
    if (updateKeys.length === 1 && updateKeys[0] === 'updatedAt' &&
        updateData.title === undefined &&
        updateData.description === undefined &&
        updateData.startTime === undefined &&
        updateData.endTime === undefined &&
        updateData.location === undefined &&
        updateData.category === undefined &&
        updateData.tags === undefined &&
        updateData.maxAttendees === undefined &&
        updateData.imageUrl === undefined &&
        updateData.communityId === undefined &&
        updateData.price === undefined &&
        updateData.currency === undefined
    ) {
        // No actual fields to update, so we can just re-fetch the event and return it.
        const currentEventResponse = await GET(request, { params });
        return currentEventResponse;
    }


    const result = await eventsCollection.findOneAndUpdate(
      { _id: eventObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ message: 'Event update failed.' }, { status: 500 });
    }

    // To return the fully populated event, re-use the GET logic
    const getRequest = new NextRequest(request.url);
    return await GET(getRequest, { params });

  } catch (error) {
    console.error(`API Error updating event ${eventId}:`, error);
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
    const body = await request.json();
    const currentUserId = body.userId;

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

    if (eventToDelete.organizerId.toHexString() !== currentUserId) {
      return NextResponse.json({ message: 'Unauthorized to delete this event. Only the organizer can delete.' }, { status: 403 });
    }

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
