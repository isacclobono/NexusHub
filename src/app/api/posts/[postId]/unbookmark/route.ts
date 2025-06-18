
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types'; // Import User type

interface UnbookmarkParams {
  params: { postId: string };
}

export async function POST(request: NextRequest, { params }: UnbookmarkParams) { // Using POST for consistency, though DELETE might be more semantic
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json(); 
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection<User>('users'); // Provide User type
    
    const postObjectId = new ObjectId(postId);
    const userObjectId = new ObjectId(userId);

    // Remove postId from user's bookmarkedPostIds array
    const updateResult = await usersCollection.updateOne(
      { _id: userObjectId },
      { $pull: { bookmarkedPostIds: postObjectId } }
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found or unbookmark failed.' }, { status: 404 });
    }
    if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
      return NextResponse.json({ message: 'Post was not bookmarked or already unbookmarked.' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Post unbookmarked successfully!' }, { status: 200 });

  } catch (error) {
    console.error(`API Error unbookmarking post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
