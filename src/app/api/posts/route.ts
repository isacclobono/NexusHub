
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
  // media handling would require file uploads and storage, simplified for now
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
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(data.userId) });

    if (!currentUser) {
        return NextResponse.json({ message: 'User not found. Cannot create post.' }, { status: 404 });
    }

    // Content Moderation (AI)
    const moderationInput: IntelligentContentModerationInput = { content: data.content, sensitivityLevel: 'medium' };
    const moderationResult = await intelligentContentModeration(moderationInput);
    if (moderationResult.isFlagged) {
      return NextResponse.json({
        message: `Post flagged by content moderation: ${moderationResult.reason}. Please revise.`,
        isFlagged: true,
        reason: moderationResult.reason,
      }, { status: 400 });
    }

    // Content Categorization (AI)
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
            // Optionally, you might want to inform the user or just proceed without AI suggestions
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
      reactions: [], // Initialize with empty reactions
      commentIds: [], // Initialize with empty comment ObjectIds
      commentCount: 0,
      status: data.isDraft ? 'draft' : (data.scheduledAt ? 'scheduled' : 'published'),
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
      // media: data.media, // Media handling logic would go here
    };

    const postsCollection = db.collection('posts');
    const result = await postsCollection.insertOne(newPostDocument);

    if (!result.insertedId) {
        throw new Error('Failed to insert post into database.');
    }
    
    // Prepare post for client response
    const createdPostForClient: Post = {
        ...newPostDocument,
        _id: result.insertedId,
        id: result.insertedId.toHexString(),
        authorId: newPostDocument.authorId.toHexString(),
        author: { // Embed author for immediate display
             _id: currentUser._id,
             id: currentUser._id!.toHexString(),
             name: currentUser.name,
             email: currentUser.email,
             avatarUrl: currentUser.avatarUrl,
             bio: currentUser.bio,
             reputation: currentUser.reputation,
             joinedDate: currentUser.joinedDate,
        },
        comments: [], // Start with empty comments array
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
    // Potentially add comments collection if you want to fetch them separately
    // const commentsCollection = db.collection<Comment>('comments');

    // Fetch only published posts, sorted by creation date
    const postsFromDb = await postsCollection.find({ status: 'published' }).sort({ createdAt: -1 }).toArray();

    const enrichedPosts: Post[] = await Promise.all(
      postsFromDb.map(async (postDoc) => {
        const authorDoc = await usersCollection.findOne({ _id: new ObjectId(postDoc.authorId as string) });
        
        const authorForClient: User | undefined = authorDoc ? {
          id: authorDoc._id!.toHexString(),
          _id: authorDoc._id,
          name: authorDoc.name,
          email: authorDoc.email, // ensure email is part of User type if needed
          avatarUrl: authorDoc.avatarUrl,
          bio: authorDoc.bio,
          reputation: authorDoc.reputation,
          joinedDate: authorDoc.joinedDate,
        } : undefined;
        
        // Basic comment fetching (first few, or could be more complex)
        // For simplicity, not fetching comments here, PostCard might do it or it's loaded on post detail page.
        // If you want to embed comments, you would query the comments collection using postDoc.commentIds.

        return {
          ...postDoc,
          id: postDoc._id.toHexString(),
          authorId: postDoc.authorId.toString(),
          author: authorForClient || { id: 'unknown', name: 'Unknown User', email:'', reputation: 0, joinedDate: new Date().toISOString() } as User, // Fallback author
          commentIds: postDoc.commentIds?.map((id: ObjectId | string) => id.toString()) || [],
          comments: [], // Comments are not populated in the list view for brevity
          // _id from postDoc is already an ObjectId
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
