
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Post, User } from '@/lib/types';
import { categorizeContent, CategorizeContentInput } from '@/ai/flows/smart-content-categorization';
import { intelligentContentModeration, IntelligentContentModerationInput } from '@/ai/flows/intelligent-content-moderation';
import getDb from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const postFormSchema = z.object({
  userId: z.string(), // From authenticated user on client
  title: z.string().max(150).optional(),
  content: z.string().min(1, 'Content is required.').max(5000, "Content can't exceed 5000 characters."),
  category: z.string().optional(),
  tags: z.string().optional(),
  media: z.any().optional(),
  isDraft: z.boolean().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.userId) {
        return NextResponse.json({ message: 'User ID is required to create a post.' }, { status: 400 });
    }
    
    const db = await getDb();
    const usersCollection = db.collection<User>('users');
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(body.userId) });

    if (!currentUser) {
        return NextResponse.json({ message: 'User not found. Cannot create post.' }, { status: 404 });
    }

    const validation = postFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid post data.', errors: validation.error.flatten() }, { status: 400 });
    }
    const data = validation.data;

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
    let finalTags = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    if (!finalCategory || finalTags.length === 0) {
        const categorizationInput: CategorizeContentInput = { content: data.content };
        try {
            const categorizationResult = await categorizeContent(categorizationInput);
            if (!finalCategory && categorizationResult.category) {
                finalCategory = categorizationResult.category;
            }
            if (finalTags.length === 0 && categorizationResult.tags.length > 0) {
                finalTags = [...new Set([...finalTags, ...categorizationResult.tags])];
            }
        } catch (aiError) {
            console.warn("AI categorization failed, proceeding with user input or defaults:", aiError);
        }
    }

    const newPostDocument = {
      authorId: new ObjectId(currentUser._id),
      title: data.title,
      content: data.content,
      category: finalCategory,
      tags: finalTags,
      createdAt: new Date().toISOString(),
      reactions: [],
      commentIds: [],
      commentCount: 0,
      status: data.isDraft ? 'draft' : (data.scheduledAt ? 'scheduled' : 'published'),
      scheduledAt: data.scheduledAt,
      // Media handling is complex and not implemented for this MongoDB version here
    };

    const postsCollection = db.collection('posts');
    const result = await postsCollection.insertOne(newPostDocument);

    if (!result.insertedId) {
        throw new Error('Failed to insert post into database.');
    }
    
    const createdPostForResponse: Post = {
        ...newPostDocument,
        _id: result.insertedId,
        id: result.insertedId.toHexString(),
        authorId: currentUser._id!.toHexString() // Convert ObjectId to string for client
    };


    return NextResponse.json({ message: 'Post created successfully!', post: createdPostForResponse }, { status: 201 });

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

    const postsFromDb = await postsCollection.find({ status: 'published' }).sort({ createdAt: -1 }).toArray();

    const enrichedPosts = await Promise.all(postsFromDb.map(async (post) => {
      const author = await usersCollection.findOne({ _id: new ObjectId(post.authorId as string) }); // Assuming authorId is stored as ObjectId string
      const authorForClient: User | undefined = author ? {
        id: author._id!.toHexString(),
        _id: author._id,
        name: author.name,
        email: author.email,
        avatarUrl: author.avatarUrl,
        bio: author.bio,
        reputation: author.reputation,
        joinedDate: author.joinedDate,
      } : undefined;
      
      // Convert ObjectId to string for the main post ID
      const postIdString = post._id.toHexString();

      return {
        ...post,
        id: postIdString,
        author: authorForClient || { id: 'unknown', name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString() },
        authorId: post.authorId.toString(), // Ensure authorId is string
        // commentIds and other ObjectId fields should be converted if sent to client
        commentIds: post.commentIds?.map(id => id.toString()),
      };
    }));

    return NextResponse.json(enrichedPosts, { status: 200 });
  } catch (error) {
    console.error('API Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
