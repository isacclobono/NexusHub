
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
    // If only one is provided, or neither, this specific validation passes
    if (data.startTime && !data.endTime) { // Needs existing endTime or new one
        // This case is tricky without existingEvent here.
        // The API will compare with existingEvent if one is missing.
        return true;
    }
    if (!data.startTime && data.endTime) { // Needs existing startTime or new one
        return true;
    }
    return true;
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

    const updatePayloadSet: Partial<DbEvent> = {};
    const updatePayloadUnset: Partial<Record<string, string>> = {};
    let hasMeaningfulChange = false;

    // Title
    if (updateData.title !== undefined && updateData.title !== existingEvent.title) {
        updatePayloadSet.title = updateData.title;
        hasMeaningfulChange = true;
    }
    // Description
    if (updateData.description !== undefined && updateData.description !== existingEvent.description) {
        updatePayloadSet.description = updateData.description;
        hasMeaningfulChange = true;
    }
    // StartTime
    if (updateData.startTime !== undefined) {
        const newStartTimeISO = new Date(updateData.startTime).toISOString();
        if (newStartTimeISO !== existingEvent.startTime) {
            updatePayloadSet.startTime = newStartTimeISO;
            hasMeaningfulChange = true;
        }
    }
    // EndTime
    if (updateData.endTime !== undefined) {
        const newEndTimeISO = new Date(updateData.endTime).toISOString();
        if (newEndTimeISO !== existingEvent.endTime) {
            updatePayloadSet.endTime = newEndTimeISO;
            hasMeaningfulChange = true;
        }
    }
    // Location
    if (updateData.location !== undefined) {
        if (updateData.location === null && existingEvent.location) {
            updatePayloadUnset.location = ""; hasMeaningfulChange = true;
        } else if (updateData.location !== existingEvent.location) {
            updatePayloadSet.location = updateData.location; hasMeaningfulChange = true;
        }
    }
    // Category
    if (updateData.category !== undefined) {
        if (updateData.category === null && existingEvent.category) {
            updatePayloadUnset.category = ""; hasMeaningfulChange = true;
        } else if (updateData.category !== existingEvent.category) {
            updatePayloadSet.category = updateData.category; hasMeaningfulChange = true;
        }
    }
    // Tags
    if (updateData.tags !== undefined) {
        const newTagsArray = updateData.tags === null ? [] : updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        const existingTagsArray = existingEvent.tags || [];
        if (JSON.stringify(newTagsArray) !== JSON.stringify(existingTagsArray)) {
            if (newTagsArray.length === 0 && existingTagsArray.length > 0) {
                 updatePayloadUnset.tags = "";
            } else {
                updatePayloadSet.tags = newTagsArray;
            }
            hasMeaningfulChange = true;
        }
    }
    // MaxAttendees
    if (updateData.maxAttendees !== undefined) {
        if (updateData.maxAttendees === null && existingEvent.maxAttendees !== undefined) { // Check if existing had a value
            updatePayloadUnset.maxAttendees = ""; hasMeaningfulChange = true;
        } else if (updateData.maxAttendees !== existingEvent.maxAttendees) {
            updatePayloadSet.maxAttendees = updateData.maxAttendees; hasMeaningfulChange = true;
        }
    }
    // ImageUrl
    if (updateData.imageUrl !== undefined) {
        let newImageUrlToSet: string | undefined;
        if (updateData.imageUrl === '' || updateData.imageUrl === null) {
            newImageUrlToSet = `https://placehold.co/1200x400.png?text=${encodeURIComponent(updateData.title || existingEvent.title)}`;
        } else {
            newImageUrlToSet = updateData.imageUrl;
        }
        if (newImageUrlToSet !== existingEvent.imageUrl) {
            updatePayloadSet.imageUrl = newImageUrlToSet;
            hasMeaningfulChange = true;
        }
    }
    // CommunityId
    if (updateData.communityId !== undefined) {
        const newCommunityId = updateData.communityId === null || updateData.communityId === "__NONE__" ? undefined : new ObjectId(updateData.communityId);
        if (newCommunityId?.toString() !== existingEvent.communityId?.toString()) {
            if (newCommunityId) {
                updatePayloadSet.communityId = newCommunityId;
            } else { // Explicitly removing community association
                updatePayloadUnset.communityId = "";
            }
            hasMeaningfulChange = true;
        }
    }
    // Price
    if (updateData.price !== undefined) {
        const newPrice = updateData.price === null ? undefined : Number(updateData.price);
        if (newPrice !== existingEvent.price) {
            if (newPrice === undefined) updatePayloadUnset.price = "";
            else updatePayloadSet.price = newPrice;
            hasMeaningfulChange = true;
        }
        // Currency handling based on new price
        if (newPrice !== undefined && newPrice > 0) {
            const newCurrency = updateData.currency === null ? undefined : (updateData.currency || 'USD');
            if (newCurrency !== existingEvent.currency || (newPrice !== existingEvent.price && !existingEvent.currency)) { // Also update currency if price changed from 0/null and no currency was set
                if(newCurrency) updatePayloadSet.currency = newCurrency;
                else if(existingEvent.currency) updatePayloadUnset.currency = "";
                hasMeaningfulChange = true;
            }
        } else { // Price is 0 or undefined
            if (existingEvent.currency) {
                updatePayloadUnset.currency = "";
                hasMeaningfulChange = true;
            }
        }
    } else if (updateData.currency !== undefined && existingEvent.price && existingEvent.price > 0) {
        // Price not explicitly changed, but currency might have, and price is > 0
        const newCurrency = updateData.currency === null ? undefined : (updateData.currency || 'USD');
        if (newCurrency !== existingEvent.currency) {
             if(newCurrency) updatePayloadSet.currency = newCurrency;
             else if(existingEvent.currency) updatePayloadUnset.currency = "";
            hasMeaningfulChange = true;
        }
    }

    if (!hasMeaningfulChange) {
        console.log(`[API Event PUT ${eventId}] No meaningful changes detected. Returning current event.`);
        const getRequest = new NextRequest(request.url);
        return await GET(getRequest, { params });
    }

    updatePayloadSet.updatedAt = new Date().toISOString();

    const finalUpdateOperation: any = {};
    if (Object.keys(updatePayloadSet).length > 0) {
        finalUpdateOperation.$set = updatePayloadSet;
    }
    if (Object.keys(updatePayloadUnset).length > 0) {
        finalUpdateOperation.$unset = updatePayloadUnset;
    }

    const result = await eventsCollection.findOneAndUpdate(
      { _id: eventObjectId },
      finalUpdateOperation,
      { returnDocument: 'after' }
    );

    if (!result.value) {
      console.error(`[API Event PUT ${eventId}] Event update failed. MongoDB did not return an updated document. Operation:`, JSON.stringify(finalUpdateOperation), "Existing Event:", JSON.stringify(existingEvent));
      return NextResponse.json({ message: 'Event update failed. The document may not have been found or effectively modified.' }, { status: 500 });
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

