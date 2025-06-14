
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Comment, Post, User } from '@/lib/types';

// Define the structure of comment documents in the database
type DbComment = Omit<Comment, 'id' | 'author' | 'postTitle'> & {
  _id: ObjectId;
  authorId: ObjectId;
  postId: ObjectId;
};

type DbPost = Omit<Post, 'id' | 'author' | 'comments' | 'isLikedByCurrentUser' | 'isBookmarkedByCurrentUser' | 'authorId' | 'likedBy' | 'commentIds'> & {
  _id: ObjectId;
  authorId: ObjectId;
  likedBy: ObjectId[];
  commentIds: ObjectId[];
};


interface UserCommentParams {
  params: { userId: string };
}

export async function GET(request: NextRequest, { params }: UserCommentParams) {
  const { userId } = params;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ message: 'Valid User ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const commentsCollection = db.collection<DbComment>('comments');
    const usersCollection = db.collection<User>('users');
    const postsCollection = db.collection<DbPost>('posts');

    const authorObjectId = new ObjectId(userId);

    const commentDocs = await commentsCollection
      .find({ authorId: authorObjectId })
      .sort({ createdAt: -1 })
      .limit(20) // Limit to recent comments for activity feed
      .toArray();

    const populatedComments: Comment[] = await Promise.all(
      commentDocs.map(async (commentDoc) => {
        const authorDoc = await usersCollection.findOne({ _id: commentDoc.authorId }, { projection: { passwordHash: 0 }});
        const postDoc = await postsCollection.findOne({ _id: commentDoc.postId }, { projection: { title: 1 } });
        
        const authorForClient: User | undefined = authorDoc ? { 
            ...authorDoc, 
            id: authorDoc._id!.toHexString(),
            // Ensure bookmarkedPostIds is an array of ObjectIds if it exists, or empty array
            bookmarkedPostIds: Array.isArray(authorDoc.bookmarkedPostIds) ? authorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        } : undefined;

        return {
          ...commentDoc,
          id: commentDoc._id.toHexString(),
          authorId: commentDoc.authorId,
          postId: commentDoc.postId,
          author: authorForClient || { _id: commentDoc.authorId, id: commentDoc.authorId.toHexString(), name: 'Unknown User', email:'', reputation:0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] } as User,
          postTitle: postDoc?.title || 'Post not found',
        } as Comment;
      })
    );

    return NextResponse.json(populatedComments, { status: 200 });

  } catch (error) {
    console.error(`API Error fetching comments for user ${userId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
