
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import type { Post, User } from '@/lib/types';
import { categorizeContent, CategorizeContentInput } from '@/ai/flows/smart-content-categorization';
import { intelligentContentModeration, IntelligentContentModerationInput } from '@/ai/flows/intelligent-content-moderation';

// IMPORTANT: File system operations in serverless environments can be tricky.
// This approach is suitable for local development but may not work or persist
// in many production serverless hosting environments (e.g., Vercel hobby tier).
// A database is recommended for production.

const postsFilePath = path.join(process.cwd(), 'public', 'api', 'data', 'posts.json');
const usersFilePath = path.join(process.cwd(), 'public', 'api', 'data', 'users.json'); // For fetching author details

async function readData<T>(filePath: string): Promise<T[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    // If file doesn't exist or is invalid (e.g., empty for the first post)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // Return empty array if file not found
    }
    console.error(`Error reading ${filePath}:`, error);
    throw new Error(`Could not read data from ${filePath}.`);
  }
}

async function writeData<T>(filePath: string, data: T[]): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw new Error(`Could not save data to ${filePath}.`);
  }
}

const postFormSchema = z.object({
  // userId will be extracted from a session or a passed token in a real app
  // For now, we'll assume a mock or default userId for new posts if not provided.
  userId: z.string().optional(), // Let's make this optional and handle it.
  title: z.string().max(150).optional(),
  content: z.string().min(1, 'Content is required.').max(5000, "Content can't exceed 5000 characters."),
  category: z.string().optional(),
  tags: z.string().optional(), // Comma-separated string
  media: z.any().optional(), // File handling would be complex; this will be ignored for now
  isDraft: z.boolean().default(false),
  scheduledAt: z.string().datetime({ offset: true }).optional(), // Expect ISO string
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mocking current user - in a real app, this would come from session/auth token
    // For now, let's try to find a user or use a default.
    // This part needs to align with how client sends userId or how server identifies user.
    // For simplicity, the client should send 'userId' in the body for now.
     if (!body.userId) {
        return NextResponse.json({ message: 'User ID is required to create a post.' }, { status: 400 });
    }
    const allUsers = await readData<User>(usersFilePath);
    const currentUser = allUsers.find(u => u.id === body.userId);

    if (!currentUser) {
        return NextResponse.json({ message: 'User not found. Cannot create post.' }, { status: 404 });
    }


    const validation = postFormSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid post data.', errors: validation.error.errors }, { status: 400 });
    }
    const data = validation.data;

    // 1. Content Moderation
    const moderationInput: IntelligentContentModerationInput = { content: data.content, sensitivityLevel: 'medium' };
    const moderationResult = await intelligentContentModeration(moderationInput);
    if (moderationResult.isFlagged) {
      return NextResponse.json({
        message: `Post flagged by content moderation: ${moderationResult.reason}. Please revise.`,
        isFlagged: true,
        reason: moderationResult.reason,
      }, { status: 400 });
    }

    // 2. Smart Categorization (Optional, use if category not provided or to enhance)
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
                finalTags = [...new Set([...finalTags, ...categorizationResult.tags])]; // Merge and deduplicate
            }
        } catch (aiError) {
            console.warn("AI categorization failed, proceeding with user input or defaults:", aiError);
            // Not a fatal error, proceed with what we have.
        }
    }


    const newPost: Post = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      authorId: currentUser.id,
      // author object will be enriched on client-side or when fetching lists
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
      // Media handling is complex and not implemented for JSON storage here
      // media: data.media ? [{ type: 'image', url: 'placeholder.jpg' }] : undefined,
    };

    const posts = await readData<Post>(postsFilePath);
    posts.unshift(newPost); // Add to the beginning of the list
    await writeData<Post>(postsFilePath, posts);

    // Exclude author object from response if it was temporarily added
    const { author, ...postForResponse } = newPost; 

    return NextResponse.json({ message: 'Post created successfully!', post: postForResponse }, { status: 201 });

  } catch (error) {
    console.error('API Error creating post:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const posts = await readData<Post>(postsFilePath);
    const users = await readData<User>(usersFilePath);

    const enrichedPosts = posts.map(post => {
      const author = users.find(u => u.id === post.authorId);
      return {
        ...post,
        author: author || { id: 'unknown', name: 'Unknown User', email: '', reputation: 0, joinedDate: new Date().toISOString() },
      };
    });
    return NextResponse.json(enrichedPosts, { status: 200 });
  } catch (error) {
    console.error('API Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
