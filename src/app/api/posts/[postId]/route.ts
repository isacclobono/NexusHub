
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Post, User, Comment, Community } from '@/lib/types';
import { z } from 'zod';
import { intelligentContentModeration, IntelligentContentModerationInput } from '@/ai/flows/intelligent-content-moderation';
import { categorizeContent, CategorizeContentInput } from '@/ai/flows/smart-content-categorization';

// Define the structure of post documents in the database for this route
type DbPost = Omit<Post, 'id' | 'author' | 'comments' | 'isLikedByCurrentUser' | 'isBookmarkedByCurrentUser' | 'authorId' | 'likedBy' | 'commentIds' | 'communityId' | 'communityName'> & {
  _id: ObjectId;
  authorId: ObjectId;
  likedBy: ObjectId[];
  commentIds: ObjectId[];
  communityId?: ObjectId;
};
type DbComment = Omit<Comment, 'id' | 'author' | 'authorId' | 'postId'> & {
    _id: ObjectId;
    authorId: ObjectId;
    postId: ObjectId;
};
type DbCommunity = Omit<Community, 'id' | 'creator' | 'memberCount'> & {
  _id: ObjectId;
};

interface PostParams {
  params: { postId: string };
}

const NO_COMMUNITY_VALUE = "__NONE__";

const postUpdateSchema = z.object({
  userId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid User ID format." }), // For authorization
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(), // Optional: if not provided, don't change. Empty string will clear.
  content: z.string().min(1, 'Content is required if provided for update.').max(5000, "Content can't exceed 5000 characters.").optional(),
  category: z.string().optional().nullable(), // Allow unsetting by passing null
  tags: z.string().optional().nullable(), // Allow unsetting, string of comma-separated tags
  communityId: z.string().optional().nullable().refine(val => !val || val === NO_COMMUNITY_VALUE || ObjectId.isValid(val), { message: "Invalid Community ID format." }), // NO_COMMUNITY_VALUE means unlink
  // Status changes (like publishing a draft) are handled separately for now or could be added here later.
});


export async function GET(request: NextRequest, { params }: PostParams) {
  const { postId } = params;
  if (!postId || !ObjectId.isValid(postId)) {
    return NextResponse.json({ message: 'Valid Post ID is required.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const forUserId = searchParams.get('forUserId');


  try {
    const db = await getDb();
    const postsCollection = db.collection<DbPost>('posts');
    const usersCollection = db.collection<User>('users');
    const commentsCollection = db.collection<DbComment>('comments');
    const communitiesCollection = db.collection<DbCommunity>('communities');

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
    
    let communityName: string | undefined = undefined;
    if (postDoc.communityId) {
        const community = await communitiesCollection.findOne({ _id: postDoc.communityId });
        communityName = community?.name;
    }

    const enrichedPost: Post = {
      ...postDoc,
      id: postDoc._id.toHexString(),
      author: authorForClient || { _id: postDoc.authorId, id: postDoc.authorId.toHexString(), name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString(), bookmarkedPostIds: [] } as User,
      likedBy: postLikedBy, 
      likeCount: postDoc.likeCount || 0,
      isLikedByCurrentUser,
      commentIds: Array.isArray(postDoc.commentIds) ? postDoc.commentIds : [],
      comments: populatedComments,
      commentCount: postDoc.commentCount || 0,
      isBookmarkedByCurrentUser,
      authorId: postDoc.authorId,
      communityId: postDoc.communityId,
      communityName: communityName,
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
    const { userId, ...updateData } = validation.data;

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

    const updatePayload: { $set: Partial<DbPost>, $unset?: Partial<Record<keyof DbPost, string>> } = { $set: { updatedAt: new Date().toISOString() } };
    let needsModeration = false;
    let newContentForAI = existingPost.content;

    if (updateData.title !== undefined) {
      updatePayload.$set.title = updateData.title;
    }
    if (updateData.content !== undefined) {
      if (updateData.content !== existingPost.content) {
        needsModeration = true;
        newContentForAI = updateData.content;
      }
      updatePayload.$set.content = updateData.content;
    }

    if (needsModeration) {
        const moderationInput: IntelligentContentModerationInput = { content: newContentForAI, sensitivityLevel: 'medium' };
        const moderationResult = await intelligentContentModeration(moderationInput);
        if (moderationResult.isFlagged) {
          return NextResponse.json({
            message: `Post update flagged by content moderation: ${moderationResult.reason}. Please revise.`,
            isFlagged: true,
            reason: moderationResult.reason,
          }, { status: 400 });
        }
    }
    
    let finalCategory = existingPost.category;
    let finalTagsArray = existingPost.tags || [];

    if (updateData.category !== undefined) {
        if (updateData.category === null) { // Explicitly unsetting category
            updatePayload.$unset = { ...updatePayload.$unset, category: "" };
            finalCategory = undefined;
        } else {
            updatePayload.$set.category = updateData.category;
            finalCategory = updateData.category;
        }
    }
    if (updateData.tags !== undefined) {
        if (updateData.tags === null) { // Explicitly unsetting tags
             updatePayload.$unset = { ...updatePayload.$unset, tags: "" };
             finalTagsArray = [];
        } else {
            finalTagsArray = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            updatePayload.$set.tags = finalTagsArray;
        }
    }
    
    // If content changed OR category/tags were reset, try to re-categorize
    if (newContentForAI && (needsModeration || updateData.category === null || updateData.tags === null || (!finalCategory && finalTagsArray.length === 0))) {
        const categorizationInput: CategorizeContentInput = { content: newContentForAI };
        try {
            const categorizationResult = await categorizeContent(categorizationInput);
            if (!finalCategory && categorizationResult.category) {
                updatePayload.$set.category = categorizationResult.category;
            }
            if (finalTagsArray.length === 0 && categorizationResult.tags && categorizationResult.tags.length > 0) {
                updatePayload.$set.tags = [...new Set([...finalTagsArray, ...categorizationResult.tags])];
            }
        } catch (aiError) {
            console.warn("AI categorization failed during post update:", aiError);
        }
    }


    if (updateData.communityId !== undefined) {
        if (updateData.communityId === NO_COMMUNITY_VALUE || updateData.communityId === null) {
            updatePayload.$unset = { ...updatePayload.$unset, communityId: "" };
        } else {
            updatePayload.$set.communityId = new ObjectId(updateData.communityId);
        }
    }
    
    // If only updatedAt is in $set and $unset is empty, it means no actual data changed.
    if (Object.keys(updatePayload.$set).length === 1 && 'updatedAt' in updatePayload.$set && !updatePayload.$unset) {
        const populatedCurrentPost = await GET(new NextRequest(request.url, { headers: request.headers }), { params });
        return populatedCurrentPost;
    }

    const result = await postsCollection.findOneAndUpdate(
      { _id: postObjectId },
      updatePayload,
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({ message: 'Post update failed.' }, { status: 500 });
    }
    
    const newSearchParams = new URLSearchParams();
    newSearchParams.set('forUserId', userId);
    const getRequestUrl = new URL(request.url);
    getRequestUrl.search = newSearchParams.toString();
    const getRequest = new NextRequest(getRequestUrl);

    return await GET(getRequest, { params }); // Return the updated, fully populated post

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

    