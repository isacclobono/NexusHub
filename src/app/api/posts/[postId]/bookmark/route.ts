
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface BookmarkParams {
  params: { postId: string };
}

export async function POST(request: NextRequest, { params }: BookmarkParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  try {
    const { userId } = await request.json(); // Assuming userId is sent in the request body
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('posts');

    const postObjectId = new ObjectId(postId);
    const userObjectId = new ObjectId(userId);

    // Check if post exists
    const postExists = await postsCollection.countDocuments({ _id: postObjectId });
    if (postExists === 0) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    // Add postId to user's bookmarkedPostIds array
    const updateResult = await usersCollection.updateOne(
      { _id: userObjectId },
      { $addToSet: { bookmarkedPostIds: postObjectId } } // $addToSet prevents duplicates
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found or bookmark failed.' }, { status: 404 });
    }
     if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
      return NextResponse.json({ message: 'Post already bookmarked.' }, { status: 200 });
    }


    return NextResponse.json({ message: 'Post bookmarked successfully!' }, { status: 200 });

  } catch (error) {
    console.error(`API Error bookmarking post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
