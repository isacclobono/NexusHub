
import { NextRequest, NextResponse } from 'next/server';
import getDb from '../../../lib/mongodb'; // Changed path
import { ObjectId } from 'mongodb';
import type { Post, Event as EventType, User } from '../../../lib/types'; // Changed path

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // 'all', 'posts', 'events'
    const sortBy = searchParams.get('sortBy') || 'relevance'; // 'relevance', 'newest', 'oldest'

    if (!query || query.trim() === "") {
      return NextResponse.json({ posts: [], events: [] }, { status: 200 });
    }

    const db = await getDb();
    const postsCollection = db.collection<Post>('posts');
    const eventsCollection = db.collection<EventType>('events');
    const usersCollection = db.collection<User>('users'); // For enriching author/organizer

    const searchRegex = { $regex: query, $options: 'i' }; // Case-insensitive regex search

    let postsQuery: any = { status: 'published' };
    let eventsQuery: any = {}; // Assuming all events are public/searchable

    // Build search conditions
    const postSearchConditions = [
      { title: searchRegex },
      { content: searchRegex },
      { tags: searchRegex },
      { category: searchRegex },
    ];
    const eventSearchConditions = [
      { title: searchRegex },
      { description: searchRegex },
      { location: searchRegex },
      { tags: searchRegex },
      { category: searchRegex },
    ];

    if (type === 'all' || type === 'posts') {
      postsQuery = { ...postsQuery, $or: postSearchConditions };
    }
    if (type === 'all' || type === 'events') {
      eventsQuery = { ...eventsQuery, $or: eventSearchConditions };
    }
    
    // Sorting
    let sortOption: any = {};
    if (sortBy === 'newest') {
      sortOption = { createdAt: -1 }; // For posts
      // For events, you might sort by startTime
    } else if (sortBy === 'oldest') {
      sortOption = { createdAt: 1 }; // For posts
    }
    // 'relevance' is tricky without text indexes and $text search, regex is a basic substitute

    let foundPosts: Post[] = [];
    let foundEvents: EventType[] = [];

    if (type === 'all' || type === 'posts') {
      const postsFromDb = await postsCollection.find(postsQuery).sort(sortOption).limit(20).toArray();
      foundPosts = await Promise.all(postsFromDb.map(async (p) => {
        const authorDoc = await usersCollection.findOne({ _id: new ObjectId(p.authorId) }, { projection: { passwordHash: 0 }});
        const authorObjectId = new ObjectId(p.authorId);
        return { 
          ...p, 
          id: p._id!.toHexString(), 
          author: authorDoc ? { ...authorDoc, _id: authorDoc._id, id: authorDoc._id.toHexString() } :
                              { _id: authorObjectId, id: authorObjectId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString() },
          authorId: authorObjectId.toHexString() as any, // Ensure string ID for client
        };
      }));
    }

    if (type === 'all' || type === 'events') {
      const eventsFromDb = await eventsCollection.find(eventsQuery).sort(sortBy === 'newest' ? { startTime: -1 } : sortBy === 'oldest' ? { startTime: 1 } : {}).limit(20).toArray();
      foundEvents = await Promise.all(eventsFromDb.map(async (e) => {
        const organizerDoc = await usersCollection.findOne({ _id: new ObjectId(e.organizerId) }, { projection: { passwordHash: 0 }});
        const organizerObjectId = new ObjectId(e.organizerId);
        return { 
          ...e, 
          id: e._id!.toHexString(), 
          organizer: organizerDoc ? { ...organizerDoc, _id: organizerDoc._id, id: organizerDoc._id.toHexString() } :
                                  { _id: organizerObjectId, id: organizerObjectId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString() },
          organizerId: organizerObjectId.toHexString() as any, // Ensure string ID for client
          rsvpIds: e.rsvpIds.map(id => id.toHexString() as any),
        };
      }));
    }

    return NextResponse.json({ posts: foundPosts, events: foundEvents }, { status: 200 });

  } catch (error) {
    console.error('API Search Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during search.';
    return NextResponse.json({ message: errorMessage, posts: [], events: [] }, { status: 500 });
  }
}
