
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Post, User, Comment } from '@/lib/types'; // Assuming these types are correctly defined
import { z } from 'zod';

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


interface PostParams {
  params: { postId: string };
}

const postUpdateSchema = z.object({
  userId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid User ID format." }),
  status: z.enum(['published']).optional(), // For now, only allow publishing drafts
  // Future: Add other fields like title, content, etc. for full editing
});


export async function GET(request: NextRequest, { params }: PostParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  // For deriving isLikedByCurrentUser and isBookmarkedByCurrentUser
  const { searchParams } = new URL(request.url);
  const forUserId = searchParams.get('forUserId');


  try {
    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const usersCollection = db.collection<User>('users');
    const commentsCollection = db.collection<DbComment>('comments');

    const postObjectId = new ObjectId(postId);
    const postDoc = await postsCollection.findOne({ _id: postObjectId });

    if (!postDoc) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    const authorDoc = await usersCollection.findOne({ _id: new ObjectId(postDoc.authorId) }, { projection: { passwordHash: 0 } });
    const authorForClient: User | undefined = authorDoc ? { 
        ...authorDoc, 
        id: authorDoc._id.toHexString(),
        bookmarkedPostIds: Array.isArray(authorDoc.bookmarkedPostIds) ? authorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
     } : undefined;

    // Fetch ALL comments for this single post view
    const commentDocs = await commentsCollection.find({ postId: postDoc._id }).sort({ createdAt: 1 }).toArray();
    const populatedComments: Comment[] = await Promise.all(
        commentDocs.map(async (commentDoc) => {
            const commentAuthorDoc = await usersCollection.findOne({_id: new ObjectId(commentDoc.authorId)}, {projection: {passwordHash: 0}});
            const commentAuthorForClient: User | undefined = commentAuthorDoc ? {
                 ...commentAuthorDoc, 
                 id: commentAuthorDoc._id.toHexString(),
                 bookmarkedPostIds: Array.isArray(commentAuthorDoc.bookmarkedPostIds) ? commentAuthorDoc.bookmarkedPostIds.map(id => new ObjectId(id.toString())) : [],
            } : undefined;
            return {
                ...commentDoc,
                _id: commentDoc._id,
                id: commentDoc._id.toHexString(),
                postId: commentDoc.postId,
                authorId: commentDoc.authorId,
                author: commentAuthorForClient || { _id: commentDoc.authorId, id: commentDoc.authorId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] } as User,
            } as Comment;
        })
    );

    let currentUser: User | null = null;
    if (forUserId && ObjectId.isValid(forUserId)) {
        currentUser = await usersCollection.findOne({ _id: new ObjectId(forUserId) }, { projection: { passwordHash: 0 }});
    }

    const postLikedBy = Array.isArray(postDoc.likedBy) ? postDoc.likedBy : [];
    const userBookmarkedPostIds = currentUser && Array.isArray(currentUser.bookmarkedPostIds) ? currentUser.bookmarkedPostIds : [];


    const isLikedByCurrentUser = currentUser ? postLikedBy.some(id => id.equals(currentUser!._id!)) : false;
    const isBookmarkedByCurrentUser = currentUser ? userBookmarkedPostIds.some(id => id.equals(postDoc._id)) : false;


    const enrichedPost: Post = {
      ...postDoc,
      id: postDoc._id.toHexString(),
      author: authorForClient || { _id: postDoc.authorId, id: postDoc.authorId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] } as User,
      likedBy: postLikedBy, 
      likeCount: postDoc.likeCount || 0,
      isLikedByCurrentUser,
      commentIds: Array.isArray(postDoc.commentIds) ? postDoc.commentIds : [],
      comments: populatedComments, // All comments for single post view
      commentCount: postDoc.commentCount || 0,
      isBookmarkedByCurrentUser,
      authorId: postDoc.authorId,
    };

    return NextResponse.json(enrichedPost, { status: 200 });
  } catch (error) {
    console.error(`API Error fetching post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: PostParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID in path is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = postUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid post update data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { userId, status } = validation.data;

    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const postObjectId = new ObjectId(postId);
    const userObjectId = new ObjectId(userId);

    const existingPost = await postsCollection.findOne({ _id: postObjectId });
    if (!existingPost) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }

    if (!existingPost.authorId.equals(userObjectId)) {
      return NextResponse.json({ message: 'Unauthorized: Only the post author can update this post.' }, { status: 403 });
    }

    const updatePayload: Partial<DbPost> & { updatedAt: string } = { updatedAt: new Date().toISOString() };

    if (status === 'published') {
      if (existingPost.status !== 'draft') {
        return NextResponse.json({ message: 'Only draft posts can be published this way.' }, { status: 400 });
      }
      updatePayload.status = 'published';
      updatePayload.scheduledAt = undefined; // Clear scheduledAt if publishing a draft
    } else if (status) {
        // For future, if other status updates are allowed
        return NextResponse.json({ message: 'Invalid status update action.' }, { status: 400 });
    }
    // Add other updatable fields here in the future (title, content, etc.)

    if (Object.keys(updatePayload).length === 1 && 'updatedAt' in updatePayload) { // Only updatedAt means no actual changes
        const populatedCurrentPost = await GET(request, { params }); // Re-fetch for current state
        return populatedCurrentPost;
    }

    const result = await postsCollection.findOneAndUpdate(
      { _id: postObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ message: 'Post update failed.' }, { status: 500 });
    }
    
    // To return the fully populated post, we re-use the GET logic
    // This ensures consistency in the returned post structure.
    // We need to construct a "dummy" request object for GET or adapt GET to be callable internally.
    // For simplicity, let's just return the updated document from DB and client can re-fetch if full population needed.
    // Or, better, we re-use the GET method itself.
    
    const newSearchParams = new URLSearchParams();
    newSearchParams.set('forUserId', userId); // Pass current user to GET for like/bookmark status
    const getRequestUrl = new URL(request.url);
    getRequestUrl.search = newSearchParams.toString();
    const getRequest = new NextRequest(getRequestUrl);

    return await GET(getRequest, { params });


  } catch (error) {
    console.error(`API Error updating post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest, { params }: PostParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

   const { searchParams } = new URL(request.url);
   const currentUserId = searchParams.get('userId'); 

  if (!currentUserId || !ObjectId.isValid(currentUserId)) {
    return NextResponse.json({ message: 'User ID is required for authorization.' }, { status: 401 });
  }


  try {
    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const commentsCollection = db.collection<DbComment>('comments');
    const usersCollection = db.collection<User>('users');
    
    const postObjectId = new ObjectId(postId);

    const postToDelete = await postsCollection.findOne({ _id: postObjectId });
    if (!postToDelete) {
      return NextResponse.json({ message: 'Post not found.' }, { status: 404 });
    }
    if (postToDelete.authorId.toHexString() !== currentUserId) { 
      return NextResponse.json({ message: 'Unauthorized to delete this post.' }, { status: 403 });
    }

    await commentsCollection.deleteMany({ postId: postObjectId });
    const deleteResult = await postsCollection.deleteOne({ _id: postObjectId });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ message: 'Post not found or already deleted.' }, { status: 404 });
    }
    
    await usersCollection.updateMany(
        { bookmarkedPostIds: postObjectId },
        { $pull: { bookmarkedPostIds: postObjectId } }
    );

    return NextResponse.json({ message: 'Post and associated comments deleted successfully.' }, { status: 200 });

  } catch (error) {
    console.error(`API Error deleting post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
