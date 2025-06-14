
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Event, User, Community } from '@/lib/types';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const eventFormSchema = z.object({
  organizerId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid Organizer ID format."}),
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(2000),
  startTime: z.string().datetime({ message: "Invalid start date format. Expected ISO string."}),
  endTime: z.string().datetime({ message: "Invalid end date format. Expected ISO string."}),
  location: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(), 
  maxAttendees: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
  imageUrl: z.string().url({message: "Please enter a valid image URL e.g. https://placehold.co/image.png"}).optional(),
  communityId: z.string().optional().refine(val => !val || ObjectId.isValid(val), { message: "Invalid Community ID format." }),
  price: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().nonnegative("Price must be a positive number or zero.").optional()
  ),
  currency: z.string().max(5, "Currency code too long.").optional(),
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: "End date and time must be after start date and time.",
  path: ["endTime"], 
});

type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount'> & {
  _id: ObjectId;
};


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = eventFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid event data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<User>('users');
    const organizer = await usersCollection.findOne({ _id: new ObjectId(data.organizerId) });

    if (!organizer) {
        return NextResponse.json({ message: 'Organizer not found.' }, { status: 404 });
    }

    let community: DbCommunity | null = null;
    if (data.communityId) {
        const communitiesCollection = db.collection<DbCommunity>('communities');
        community = await communitiesCollection.findOne({ _id: new ObjectId(data.communityId) });
        if (!community) {
            return NextResponse.json({ message: 'Community not found.' }, { status: 404 });
        }
    }

    const newEventDocument = {
      organizerId: new ObjectId(data.organizerId),
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      location: data.location,
      category: data.category,
      tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      maxAttendees: data.maxAttendees,
      imageUrl: data.imageUrl || `https://placehold.co/1200x400.png?text=${encodeURIComponent(data.title)}`,
      rsvpIds: [] as ObjectId[], 
      ...(data.communityId && { communityId: new ObjectId(data.communityId) }),
      price: data.price,
      currency: data.price && data.price > 0 ? (data.currency || 'USD') : undefined,
    };

    const eventsCollection = db.collection('events'); 
    const result = await eventsCollection.insertOne(newEventDocument);

    if(!result.insertedId) {
        throw new Error('Failed to insert event into database.');
    }

    const createdEventForClient: Event = {
        ...newEventDocument,
        _id: result.insertedId,
        id: result.insertedId.toHexString(),
        organizerId: newEventDocument.organizerId.toHexString() as any, // Ensure string for client
        organizer: { 
             _id: organizer._id,
             id: organizer._id!.toHexString(),
             name: organizer.name,
             email: organizer.email,
             avatarUrl: organizer.avatarUrl,
             bio: organizer.bio,
             reputation: organizer.reputation,
             joinedDate: organizer.joinedDate,
        },
        rsvpIds: [], 
        rsvps: [],   
        communityId: newEventDocument.communityId ? newEventDocument.communityId.toHexString() as any : undefined, // Ensure string for client
        communityName: community?.name,
        price: newEventDocument.price,
        currency: newEventDocument.currency,
    };

    return NextResponse.json({ message: 'Event created successfully!', event: createdEventForClient }, { status: 201 });

  } catch (error) {
    console.error('API Error creating event:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const eventsCollection = db.collection('events'); 
    const usersCollection = db.collection<User>('users');
    const communitiesCollection = db.collection<DbCommunity>('communities');


    const { searchParams } = new URL(request.url);
    const organizerIdParam = searchParams.get('organizerId');
    const rsvpdByParam = searchParams.get('rsvpdBy');
    const communityIdParam = searchParams.get('communityId');


    let query: any = {};
    if (organizerIdParam && ObjectId.isValid(organizerIdParam)) {
      query.organizerId = new ObjectId(organizerIdParam);
    }
    if (rsvpdByParam && ObjectId.isValid(rsvpdByParam)) {
      query.rsvpIds = new ObjectId(rsvpdByParam); 
    }
    if (communityIdParam && ObjectId.isValid(communityIdParam)) {
        query.communityId = new ObjectId(communityIdParam);
    }
    
    const eventsFromDb = await eventsCollection.find(query).sort({ startTime: 1 }).toArray();

    const enrichedEvents: Event[] = await Promise.all(
      eventsFromDb.map(async (eventDoc: any) => { 
        const organizerDoc = await usersCollection.findOne({ _id: new ObjectId(eventDoc.organizerId) });
        
        const organizerForClient: User | undefined = organizerDoc ? {
          id: organizerDoc._id!.toHexString(),
          _id: organizerDoc._id,
          name: organizerDoc.name,
          email: organizerDoc.email,
          avatarUrl: organizerDoc.avatarUrl,
          bio: organizerDoc.bio,
          reputation: organizerDoc.reputation,
          joinedDate: organizerDoc.joinedDate,
          bookmarkedPostIds: [], 
          communityIds: [], 
        } : undefined;
        
        let rsvpsForClient: User[] = [];
        if (eventDoc.rsvpIds && eventDoc.rsvpIds.length > 0) {
          const rsvpObjectIds = eventDoc.rsvpIds.map((id: string | ObjectId) => typeof id === 'string' ? new ObjectId(id) : id);
          const rsvpUserDocs = await usersCollection.find({ _id: { $in: rsvpObjectIds } }).toArray();
          rsvpsForClient = rsvpUserDocs.map(doc => ({
            id: doc._id!.toHexString(),
            _id: doc._id,
            name: doc.name,
            email: doc.email,
            avatarUrl: doc.avatarUrl,
            bio: doc.bio,
            reputation: doc.reputation,
            joinedDate: doc.joinedDate,
            bookmarkedPostIds: [], 
            communityIds: [], 
          }));
        }

        let communityName: string | undefined = undefined;
        if (eventDoc.communityId) {
            const community = await communitiesCollection.findOne({ _id: eventDoc.communityId });
            communityName = community?.name;
        }
        
        return {
          ...eventDoc,
          id: eventDoc._id.toHexString(),
          organizerId: eventDoc.organizerId.toHexString(), 
          organizer: organizerForClient || { id: 'unknown', name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [], communityIds: [] } as User,
          rsvpIds: (eventDoc.rsvpIds?.map((id: ObjectId | string) => (typeof id === 'string' ? id : id.toHexString())) || []) as any, // Ensure string IDs
          rsvps: rsvpsForClient,
          _id: eventDoc._id, 
          communityId: eventDoc.communityId ? eventDoc.communityId.toHexString() : undefined,
          communityName: communityName,
          price: eventDoc.price,
          currency: eventDoc.currency,
        } as Event;
      })
    );

    return NextResponse.json(enrichedEvents, { status: 200 });
  } catch (error) {
    console.error('API Error fetching events:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
