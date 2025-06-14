
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { Post, Comment, User } from '@/lib/types';

interface CommentRouteParams {
  params: { postId: string };
}

// Define the structure of post documents in the database
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

const commentSchema = z.object({
  userId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid User ID format." }),
  content: z.string().min(1, "Comment content cannot be empty.").max(2000, "Comment cannot exceed 2000 characters."),
  parentId: z.string().optional().refine(val => !val || ObjectId.isValid(val), { message: "Invalid Parent Comment ID format."}),
});

export async function POST(request: NextRequest, { params }: CommentRouteParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = commentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid comment data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { userId, content, parentId } = validation.data;

    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const commentsCollection = db.collection<Omit<DbComment, '_id'>>('comments'); // Type for insertion
    const usersCollection = db.collection<User>('users');

    const postObjectId = new ObjectId(postId);
    const authorObjectId = new ObjectId(userId);

    const postExists = await postsCollection.countDocuments({ _id: postObjectId });
    if (postExists === 0) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }
    
    const author = await usersCollection.findOne({ _id: authorObjectId }, { projection: { passwordHash: 0 }});
    if (!author) {
      return NextResponse.json({ message: 'Author not found.' }, { status: 404 });
    }

    const newCommentDoc: Omit<DbComment, '_id'> = {
      postId: postObjectId,
      authorId: authorObjectId,
      content,
      createdAt: new Date().toISOString(),
      ...(parentId && ObjectId.isValid(parentId) && { parentId: new ObjectId(parentId) }),
      // reactions: [], // Future
      // replyIds: [], // Future
    };

    const insertResult = await commentsCollection.insertOne(newCommentDoc);
    if (!insertResult.insertedId) {
      throw new Error('Failed to create comment.');
    }

    // Update post's commentIds and commentCount
    const updatePostResult = await postsCollection.updateOne(
      { _id: postObjectId },
      { 
        $push: { commentIds: insertResult.insertedId }, // Use $push to add to array
        $inc: { commentCount: 1 }
      }
    );

    if(updatePostResult.modifiedCount === 0 && updatePostResult.matchedCount === 0) {
        // This should not happen if postExists check passed, but good to have
        console.warn(`Comment created (id: ${insertResult.insertedId}), but failed to update post (id: ${postObjectId}) comment list/count.`);
    }
    
    const authorForClient: User = {
        ...author,
        id: author._id!.toHexString(),
        bookmarkedPostIds: Array.isArray(author.bookmarkedPostIds) ? author.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
    };
    
    const createdCommentForClient: Comment = {
        ...newCommentDoc,
        _id: insertResult.insertedId,
        id: insertResult.insertedId.toHexString(),
        author: authorForClient,
    };

    return NextResponse.json({ message: 'Comment added successfully!', comment: createdCommentForClient }, { status: 201 });

  } catch (error) {
    console.error(`API Error adding comment to post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: CommentRouteParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const commentsCollection = db.collection<DbComment>('comments');
    const usersCollection = db.collection<User>('users');
    
    const postObjectId = new ObjectId(postId);

    // Fetch top-level comments first (those without a parentId or where parentId is null/undefined)
    // For simplicity now, fetching all and sorting. Hierarchical display can be client-side or more complex query.
    const commentDocs = await commentsCollection.find({ postId: postObjectId }).sort({ createdAt: 1 }).toArray();

    const populatedComments: Comment[] = await Promise.all(
      commentDocs.map(async (commentDoc) => {
        const authorDoc = await usersCollection.findOne({ _id: commentDoc.authorId }, { projection: { passwordHash: 0 } });
        const authorForClient: User | undefined = authorDoc ? { 
            ...authorDoc, 
            id: authorDoc._id!.toHexString(),
            bookmarkedPostIds: Array.isArray(authorDoc.bookmarkedPostIds) ? authorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
        } : undefined;
        
        if (!authorForClient) {
            console.warn(`Author not found for comment ${commentDoc._id}, authorId: ${commentDoc.authorId}`);
        }

        return {
          ...commentDoc,
          id: commentDoc._id.toHexString(),
          authorId: commentDoc.authorId,
          postId: commentDoc.postId,
          author: authorForClient || { id: commentDoc.authorId.toHexString(), name: 'Unknown User', email:'', reputation:0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] } as User, // Fallback author
        } as Comment;
      })
    );

    return NextResponse.json(populatedComments, { status: 200 });

  } catch (error) {
    console.error(`API Error fetching comments for post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

