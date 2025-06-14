
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Post, User, Comment } from '@/lib/types';

interface LikeParams {
  params: { postId: string };
}

// Define the structure of post documents in the database for this route
type DbPost = Omit<Post, 'id' | 'author' | 'comments' | 'isLikedByCurrentUser' | 'isBookmarkedByCurrentUser' | 'authorId' | 'likedBy' | 'commentIds'> & {
  _id: ObjectId;
  authorId: ObjectId;
  likedBy: ObjectId[];
  commentIds: ObjectId[];
};
type DbComment = Omit<Comment, 'id' | 'author' | 'authorId' | 'postId'> & {
    _id: ObjectId;
    authorId: ObjectId;
    postId: ObjectId;
};


async function getPopulatedPost(db: any, postId: ObjectId, currentUserId?: ObjectId): Promise<Post | null> {
    const postsCollection = db.collection<DbPost>('posts');
    const usersCollection = db.collection<User>('users');
    const commentsCollection = db.collection<DbComment>('comments');

    const postDoc = await postsCollection.findOne({ _id: postId });
    if (!postDoc) return null;

    const authorDoc = await usersCollection.findOne({ _id: postDoc.authorId }, { projection: { passwordHash: 0 } });
    const authorForClient: User | undefined = authorDoc ? { ...authorDoc, id: authorDoc._id.toHexString(), bookmarkedPostIds: authorDoc.bookmarkedPostIds || [] } : undefined;
    
    const recentCommentsDocs = await commentsCollection.find({ postId: postDoc._id }).sort({ createdAt: -1 }).limit(2).toArray();
    const recentCommentsPopulated: Comment[] = await Promise.all(
        recentCommentsDocs.map(async (commentDoc) => {
            const commentAuthorDoc = await usersCollection.findOne({ _id: commentDoc.authorId }, { projection: { passwordHash: 0 } });
            return {
                ...commentDoc,
                id: commentDoc._id.toHexString(),
                postId: commentDoc.postId, // Keep as ObjectId
                authorId: commentDoc.authorId, // Keep as ObjectId
                author: commentAuthorDoc ? { ...commentAuthorDoc, id: commentAuthorDoc._id.toHexString() } : undefined,
            } as Comment;
        })
    );

    let currentUser: User | null = null;
    if (currentUserId && ObjectId.isValid(currentUserId)) {
        currentUser = await usersCollection.findOne({ _id: currentUserId });
    }
    
    const isLikedByCurrentUser = currentUser ? postDoc.likedBy.some(id => id.equals(currentUser!._id!)) : false;
    const isBookmarkedByCurrentUser = currentUser ? currentUser.bookmarkedPostIds?.some(id => id.equals(postDoc._id)) : false;

    return {
        ...postDoc,
        id: postDoc._id.toHexString(),
        author: authorForClient || { id: 'unknown', name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString() } as User,
        likedBy: postDoc.likedBy, 
        likeCount: postDoc.likeCount,
        isLikedByCurrentUser,
        commentIds: postDoc.commentIds,
        comments: recentCommentsPopulated.reverse(),
        commentCount: postDoc.commentCount,
        isBookmarkedByCurrentUser,
        authorId: postDoc.authorId, // ensure this is passed
    } as Post;
}


export async function POST(request: NextRequest, { params }: LikeParams) { // LIKE A POST
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
    const postsCollection = db.collection<DbPost>('posts');
    const postObjectId = new ObjectId(postId);
    const userObjectId = new ObjectId(userId);

    const post = await postsCollection.findOne({ _id: postObjectId });
    if (!post) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    if (post.likedBy.some(id => id.equals(userObjectId))) {
      // Already liked, consider this a successful state or return a specific message
      const populatedPost = await getPopulatedPost(db, postObjectId, userObjectId);
      return NextResponse.json({ message: 'Post already liked.', post: populatedPost }, { status: 200 });
    }

    const updateResult = await postsCollection.updateOne(
      { _id: postObjectId },
      { 
        $addToSet: { likedBy: userObjectId },
        $inc: { likeCount: 1 }
      }
    );

    if (updateResult.modifiedCount === 0) {
      // This might happen if $addToSet didn't add (already there, caught above) or other issue
      return NextResponse.json({ message: 'Failed to like post or post already liked.' }, { status: 409 });
    }
    
    const updatedPopulatedPost = await getPopulatedPost(db, postObjectId, userObjectId);
    return NextResponse.json({ message: 'Post liked successfully!', post: updatedPopulatedPost }, { status: 200 });

  } catch (error) {
    console.error(`API Error liking post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: LikeParams) { // UNLIKE A POST
  const { postId } = params;
   if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  try {
    // For DELETE, userId usually comes from query params or auth token, not body.
    // Let's assume it's a query parameter for this example or taken from auth session in a real app.
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'Valid User ID is required as query parameter.' }, { status: 400 });
    }

    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const postObjectId = new ObjectId(postId);
    const userObjectId = new ObjectId(userId);

    const post = await postsCollection.findOne({ _id: postObjectId });
    if (!post) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    if (!post.likedBy.some(id => id.equals(userObjectId))) {
      const populatedPost = await getPopulatedPost(db, postObjectId, userObjectId);
      return NextResponse.json({ message: 'Post not liked by this user.', post: populatedPost }, { status: 200 });
    }

    const updateResult = await postsCollection.updateOne(
      { _id: postObjectId },
      { 
        $pull: { likedBy: userObjectId },
        $inc: { likeCount: -1 }
      }
    );

    if (updateResult.modifiedCount === 0) {
       return NextResponse.json({ message: 'Failed to unlike post or post was not liked.' }, { status: 409 });
    }

    const updatedPopulatedPost = await getPopulatedPost(db, postObjectId, userObjectId);
    return NextResponse.json({ message: 'Post unliked successfully!', post: updatedPopulatedPost }, { status: 200 });

  } catch (error) {
    console.error(`API Error unliking post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
