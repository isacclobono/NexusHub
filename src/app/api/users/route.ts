
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import type { User } from '@/lib/types';
import { ObjectId } from 'mongodb';

// Server-side user document type including passwordHash
interface UserWithPasswordHash extends Omit<User, 'id' | 'bookmarkedPostIds'> {
  _id: ObjectId;
  passwordHash: string;
  bookmarkedPostIds?: ObjectId[];
  privacy?: 'public' | 'private';
}


export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const usersCollection = db.collection<UserWithPasswordHash>('users');
    
    // Only fetch users that are public or have no privacy setting (default to public)
    const usersFromDb = await usersCollection.find(
      { 
        $or: [
          { privacy: 'public' },
          { privacy: { $exists: false } } 
        ]
      }, 
      { projection: { passwordHash: 0 } }
    ).toArray();

    const usersForClient: User[] = usersFromDb.map(userDoc => ({
      ...userDoc,
      id: userDoc._id.toHexString(),
      bookmarkedPostIds: userDoc.bookmarkedPostIds || [], 
      privacy: userDoc.privacy || 'public',
    }));

    return NextResponse.json(usersForClient, { status: 200 });
  } catch (error) {
    console.error('API Error fetching users:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
