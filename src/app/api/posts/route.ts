
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Post, User, Comment } from '@/lib/types';
import { categorizeContent, CategorizeContentInput } from '@/ai/flows/smart-content-categorization';
import { intelligentContentModeration, IntelligentContentModerationInput } from '@/ai/flows/intelligent-content-moderation';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Schema for validating POST request body
const postFormSchema = z.object({
  userId: z.string().refine(val => ObjectId.isValid(val), { message: "Invalid User ID format." }),
  title: z.string().max(150, "Title can't exceed 150 characters.").optional(),
  content: z.string().min(1, 'Content is required.').max(5000, "Content can't exceed 5000 characters."),
  category: z.string().optional(),
  tags: z.string().optional(), // Comma-separated string
  isDraft: z.boolean().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = postFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid post data.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validation.data;

    const db = await getDb();
    const usersCollection = db.collection<User>('users');
    const currentUserDoc = await usersCollection.findOne({ _id: new ObjectId(data.userId) }, {projection: {passwordHash: 0}});

    if (!currentUserDoc) {
        return NextResponse.json({ message: 'User not found. Cannot create post.' }, { status: 404 });
    }
    const currentUser: User = {...currentUserDoc, id: currentUserDoc._id.toHexString() };


    const moderationInput: IntelligentContentModerationInput = { content: data.content, sensitivityLevel: 'medium' };
    const moderationResult = await intelligentContentModeration(moderationInput);
    if (moderationResult.isFlagged) {
      return NextResponse.json({
        message: `Post flagged by content moderation: ${moderationResult.reason}. Please revise.`,
        isFlagged: true,
        reason: moderationResult.reason,
      }, { status: 400 });
    }

    let finalCategory = data.category;
    let finalTagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    if (!finalCategory || finalTagsArray.length === 0) {
        const categorizationInput: CategorizeContentInput = { content: data.content };
        try {
            const categorizationResult = await categorizeContent(categorizationInput);
            if (!finalCategory && categorizationResult.category) {
                finalCategory = categorizationResult.category;
            }
            if (finalTagsArray.length === 0 && categorizationResult.tags.length > 0) {
                finalTagsArray = [...new Set([...finalTagsArray, ...categorizationResult.tags])];
            }
        } catch (aiError) {
            console.warn("AI categorization failed, proceeding with user input or defaults:", aiError);
        }
    }

    const newPostDocument = {
      authorId: new ObjectId(data.userId),
      title: data.title,
      content: data.content,
      category: finalCategory,
      tags: finalTagsArray,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reactions: [], 
      commentIds: [], 
      commentCount: 0,
      status: data.isDraft ? 'draft' : (data.scheduledAt ? 'scheduled' : 'published'),
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
    };

    const postsCollection = db.collection('posts');
    const result = await postsCollection.insertOne(newPostDocument);

    if (!result.insertedId) {
        throw new Error('Failed to insert post into database.');
    }
    
    const createdPostForClient: Post = {
        ...newPostDocument,
        _id: result.insertedId,
        id: result.insertedId.toHexString(),
        authorId: newPostDocument.authorId, // Keep as ObjectId for consistency internally
        author: currentUser, // Embed author for immediate display
        comments: [], 
    };

    return NextResponse.json({ message: 'Post created successfully!', post: createdPostForClient }, { status: 201 });

  } catch (error) {
    console.error('API Error creating post:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const postsCollection = db.collection('posts');
    const usersCollection = db.collection<User>('users');
    
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('authorId');
    const bookmarkedById = searchParams.get('bookmarkedById'); // For fetching bookmarked posts

    let query: any = { status: 'published' };
    if (authorId && ObjectId.isValid(authorId)) {
      query.authorId = new ObjectId(authorId);
    }

    if (bookmarkedById && ObjectId.isValid(bookmarkedById)) {
        const user = await usersCollection.findOne({ _id: new ObjectId(bookmarkedById) });
        if (user && user.bookmarkedPostIds && user.bookmarkedPostIds.length > 0) {
            query._id = { $in: user.bookmarkedPostIds };
        } else {
            return NextResponse.json([], { status: 200 }); // No bookmarked posts or user not found
        }
    }


    const postsFromDb = await postsCollection.find(query).sort({ createdAt: -1 }).toArray();

    const enrichedPosts: Post[] = await Promise.all(
      postsFromDb.map(async (postDoc) => {
        const authorDoc = await usersCollection.findOne({ _id: new ObjectId(postDoc.authorId as any) }, {projection: {passwordHash: 0}});
        
        const authorForClient: User | undefined = authorDoc ? {
          ...authorDoc,
          id: authorDoc._id.toHexString(),
        } : undefined;
        
        // Fetch comments if needed, for now keeping it simple
        const commentsForClient: Comment[] = []; // Placeholder

        return {
          ...postDoc,
          id: postDoc._id.toHexString(),
          authorId: postDoc.authorId, 
          author: authorForClient || { id: 'unknown', name: 'Unknown User', email:'', reputation: 0, joinedDate: new Date().toISOString() } as User,
          commentIds: postDoc.commentIds?.map((id: ObjectId | string) => typeof id === 'string' ? new ObjectId(id) : id) || [],
          comments: commentsForClient, 
        } as Post;
      })
    );

    return NextResponse.json(enrichedPosts, { status: 200 });
  } catch (error) {
    console.error('API Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
